# Saubhagya Voter Connect

Build a production-ready, mobile-first election campaign website called “Saubhagya Matdata Parchi” (सौभाग्य - मतदाता पर्ची सेवा) for Rajasthan Sarpanch/Ward Panch candidates. Use React + TypeScript + Tailwind + shadcn/ui + Lucide icons, with a polished Indian election visual system: deep navy #0F172A, saffron/orange #EA580C/#F97316, white, emerald status badges. Use strong Devanagari typography, excellent spacing, large touch targets, clean cards, subtle shadows, responsive but intentionally mobile-first candidate experience.

PUBLIC HOME PAGE (/):
Hero headline exactly: “चुनाव की तैयारी, हमारे साथ! अपनी ग्राम पंचायत की डिजिटल मतदाता पर्ची बनवाएं।” Subheading: “सरपंच एवं वार्ड पंच प्रत्याशियों के लिए नाम, फोटो व चुनाव चिन्ह सहित कस्टमाइज्ड पर्ची।” Include trust badges “सरल प्रक्रिया”, “विश्वसनीय एवं सुरक्षित”, “त्वरित सेवा” and a prominent contact banner for +91 98285 55751. Create a conversion-focused page with a concise benefits/how-it-works section and the order form as the main CTA.

ORDER FORM fields and validation:
candidate_name_hindi required; candidate_name_english required; contact_number required 10-digit mobile, type=tel, autocomplete=tel; district required; panchayat_samiti required; gram_panchayat required; ward_number required; election_symbol required; slogan optional with example “आपका विश्वास, हमारी पहचान”; photo required JPG/PNG. Use sensible autocomplete attributes and accessible labels. Show upload preview and clear validation/error/success states. Disable submit while processing.

LEAD/IP TRACKING:
On mount, fetch visitor public IP from https://api.ipify.org?format=json. Create a visitor/lead record. As soon as the user has entered a valid 10-digit mobile number, immediately upsert/log the partial lead with IP + phone before final form submission. Avoid logging duplicate phone updates repeatedly. Track page visit timestamp. The visitor tracker must support abandoned entries and submitted orders.

SUPABASE:
Use Lovable/Supabase backend with proper tables, storage bucket, and RLS/security policies. Suggested schema: orders table with order_id, candidate_name_hindi, candidate_name_english, contact_number, district, panchayat_samiti, gram_panchayat, ward_number, election_symbol, slogan, photo_url, ip_address, status enum/text (Pending/In-Process/Completed), created_at. Add visitor_leads/activity table with ip_address, phone, timestamp, lead_type/status, and optional order_id. Use a private/publicly-safe photo storage approach appropriate for admin preview/download. Never put the admin password in shipped client code if there is a safer server-side/auth approach available.

ORDER SUBMISSION:
Generate unique Order ID in the requested style using the current timestamp suffix, e.g. `SBG-${Date.now().toString().slice(-4)}` (handle collisions robustly). Upload photo to Supabase Storage, save order record, then redirect to WhatsApp using https://wa.me/919828555751?text= URL-encoded message. Exact message template:
“नमस्ते सौभाग्य टीम, मैंने मतदाता पर्ची के लिए आवेदन किया है।
📋 *ऑर्डर आईडी:* {order_id}
👤 *उम्मीदवार:* {candidate_name_hindi} ({candidate_name_english})
📍 *स्थान:* {gram_panchayat}, वार्ड नं. {ward_number}, {district}
🗳️ *चुनाव चिन्ह:* {election_symbol}
📞 *मोबाइल:* {contact_number}
कृपया मेरा ड्राफ्ट और पेमेंट विवरण भेजें।”
Show a success confirmation before or while opening WhatsApp when possible.

HIDDEN ADMIN (/admin):
Do NOT link /admin from navbar, footer, sitemap, or public UI. Desktop-only enforcement: if viewport width <1024px, block access with a full-screen modal/notice saying exactly “Admin panel is accessible only from Desktop workstations.” Admin page should be responsive for desktop widths. Password login required. Requested password is `Saubhagya@10` and first wrong attempt reveals `Hint: s1z`. Prefer a secure auth/session implementation so the password is not exposed in the browser bundle; if a Supabase admin-auth flow is used, preserve the requested UX and do not hardcode secrets client-side.

ADMIN DASHBOARD:
KPI cards: Total Orders, Pending Orders, Completed Orders, Total Captured IPs/Leads. Real-time orders table with search and ward/status filters. Columns: Order ID, Date/Time, Candidate Name Hindi & English, Location (Panchayat/Ward/District), Election Symbol, Phone, IP Address, Photo Preview, Order Status (Pending/In-Process/Completed), Actions. Actions: Download Photo, Direct WhatsApp Chat, Mark Complete, Delete. Include quick status transition buttons and sensible confirmation for destructive deletion. Include a Visitor & Lead Tracker table showing IP, timestamp, captured mobile (including abandoned form entries), lead state, and direct Call/WhatsApp CTAs. Add empty/loading/error states and live refresh/realtime subscriptions if supported.

DESIGN/UX DETAILS:
Use Lucide icons, polished shadcn controls, sticky mobile CTA where helpful, clear form grouping, progress/helper copy, prominent orange WhatsApp CTA, emerald trust/status badges, and excellent touch targets. Keep the homepage uncluttered and conversion-oriented. Use Hindi-first copy with English field hints where appropriate. Ensure keyboard accessibility and good contrast. Avoid adding unrelated pages or features.

SECURITY/QUALITY:
Implement server-side validation/RLS where appropriate, sanitize/validate mobile and file types, restrict upload size reasonably, avoid exposing service-role secrets. Do not expose admin route in public navigation. Build the actual working Supabase schema/storage and wire the UI to it. Finish with a clean, polished app and test the main flows and responsive states.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://saubhagya-mitra-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/48735217-75e8-4ec6-97ac-e52eaccfa8a4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
