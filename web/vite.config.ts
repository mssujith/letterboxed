import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built site works under any GitHub Pages subpath
// (e.g. https://user.github.io/repo/). We use a HashRouter, so client-side
// routing does not need server rewrites.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
