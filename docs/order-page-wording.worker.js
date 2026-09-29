// Cloudflare Worker wrapper for order.saubhagya.net — wording only.
//
// WHY HERE and not on Vercel: the order page talks to the PC (orders, PDFs,
// QR, photo uploads). Anything that sits in the middle of that traffic can
// break it (size limits, gzip headers, one shared IP for every customer).
// This wrapper touches ONLY the HTML of the order page. API calls, uploads,
// PDFs and QR images pass straight through, byte for byte.
//
// USE: in your existing Worker, rename the current `fetch` handler to
// `originalFetch(request, env, ctx)` and export the wrapper below.

const SCRUB_SCRIPT = `
<script>
(function () {
  var RULES = [
    [/वोटर\\s*पर्ची\\s*—\\s*PDF/g, 'पर्ची — PDF'],
    [/वोटर\\s*पर्ची/g, 'पर्ची'],
    [/वोटर\\s*स्लिप/g, 'पर्ची'],
    [/मतदाता\\s*पर्ची/g, 'पर्ची'],
    [/मतदाता\\s*की\\s*फ़ोटो\\s*सहित/g, 'फ़ोटो सहित'],
    [/मतदाता\\s*सूची/g, 'सूची'],
    [/मतदाता/g, 'रिकॉर्ड'],
    [/वोटर/g, ''],
    [/राजस्थान\\s*पंचायत\\s*चुनाव/g, 'कस्टमाइज्ड प्रिंट-रेडी टेम्पलेट्स'],
    [/पंचायत\\s*चुनाव/g, 'कस्टमाइज्ड टेम्पलेट्स'],
    [/चुनाव\\s*चिन्ह/g, 'प्रतीक / चिन्ह'],
    [/चुनाव/g, ''],
    [/मतदान\\s*दिनांक/g, 'कार्यक्रम दिनांक'],
    [/मतदान\\s*केन्द्र/g, 'केन्द्र (बूथ)'],
    [/मतदान/g, 'कार्यक्रम'],
    [/प्रत्याशी/g, 'नाम'],
    [/नमूना\\s*—\\s*मुफ़्त(?!\\s*\\(Sample-Free\\))/g, 'नमूना — मुफ़्त(Sample-Free)'],
    [/सॉफ़्टवेयर\\s*उतारिए[,،]?\\s*/g, ''],
    [/सॉफ़्टवेयर\\s*\\(EXE\\)/g, ''],
    [/सॉफ़्टवेयर/g, ''],
    // English
    [/voter\\s*(parchi|slip)s?/gi, 'slip'],
    [/voter\\s*list(s?)/gi, 'list$1'],
    [/rajasthan\\s*panchayat\\s*elections?/gi, 'Print-ready customized templates'],
    [/panchayat\\s*elections?/gi, 'customized templates'],
    [/election\\s*symbol/gi, 'symbol'],
    [/polling\\s*(date|station|booth)/gi, 'event $1'],
    [/\\bvoters\\b/gi, 'records'],
    [/\\bvoter\\b/gi, 'record'],
    [/\\belections?\\b/gi, ''],
    [/\\bcandidates?\\b/gi, 'name'],
    [/\\bsoftware\\b/gi, ''],
    [/\\bEXE\\b/g, '']
  ];
  var TRIGGER = /वोटर|मतदाता|चुनाव|मतदान|प्रत्याशी|नमूना\\s*—\\s*मुफ़्त|सॉफ़्टवेयर|voter|election|polling|candidate|software|EXE/i;
  // Devanagari nukta letters (फ़ ज़ ड़) can be stored two ways: one code point or
  // letter + nukta. Normalise both the page text and every rule to the same form
  // so a rule never silently misses.
  function nf(x) { return x.normalize ? x.normalize('NFD') : x; }
  for (var k = 0; k < RULES.length; k++) RULES[k][0] = new RegExp(nf(RULES[k][0].source), RULES[k][0].flags);
  TRIGGER = new RegExp(nf(TRIGGER.source), TRIGGER.flags);
  function scrub(s) { s = nf(s); for (var i = 0; i < RULES.length; i++) s = s.replace(RULES[i][0], RULES[i][1]); return s; }
  // Text nodes only. Never scripts, styles, form values, attributes or JS data,
  // so what the page sends to the PC is never changed.
  function walk(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') return;
      if (n.nodeValue && TRIGGER.test(nf(n.nodeValue))) {
        var v = scrub(n.nodeValue);
        if (v !== n.nodeValue) n.nodeValue = v;
      }
    } else if (n.childNodes) {
      for (var i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i]);
    }
  }
  function title() { if (TRIGGER.test(nf(document.title))) document.title = scrub(document.title); }
  function start() {
    walk(document.body); title();
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') walk(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
      title();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
</script>`;

// Software cards are hidden by default. Set env.SHOW_SOFTWARE = "1" in the
// Worker settings to show them again.
// Verified on the live page: #dlbox is the software (EXE) download box that the
// "नमूना — मुफ़्त" card opens, so the sample card is hidden with it. The bar
// "पहले किया हुआ ऑर्डर डाउनलोड करना है?" is #oldbtn and must stay visible.
const HIDE_SOFTWARE_CSS = `<style>.kcard[data-kind="exe"],.kcard[data-kind="data"],.kcard[data-kind="sample"],#dlbox{display:none!important}.cards.k4{grid-template-columns:1fr!important}</style>`;

export default {
  async fetch(request, env, ctx) {
    const response = await originalFetch(request, env, ctx); // your existing handler
    const url = new URL(request.url);
    const type = response.headers.get("content-type") || "";
    const isOrderPage =
      request.method === "GET" &&
      type.includes("text/html") &&
      (url.pathname === "/order" || url.pathname.startsWith("/order/"));
    if (!isOrderPage) return response; // everything else: untouched

    const inject = (env.SHOW_SOFTWARE === "1" ? "" : HIDE_SOFTWARE_CSS) + SCRUB_SCRIPT;
    return new HTMLRewriter()
      .on("head", { element(el) { el.append(inject, { html: true }); } })
      .transform(response);
  },
};
