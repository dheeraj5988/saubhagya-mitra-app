// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Outside Vercel/Lovable, build a plain Node.js server (.output/server/index.mjs)
  // that listens on PORT/HOST — needed for Node hosts such as Cloudways.
  // Vercel is still auto-detected (VERCEL env), and Lovable's own builds force
  // their preset, so neither is affected. Override with NITRO_PRESET=... if needed.
  // `defaultPreset` is a valid nitro option; the wrapper's type just omits it.
  nitro: { defaultPreset: "node-server" } as unknown as { preset?: string },
  vite: {
    ssr: {
      noExternal: ["aws4fetch"]
    }
  }
});
