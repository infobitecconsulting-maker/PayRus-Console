import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  // GitHub Pages serves a project repo under /<repo-name>/, not domain root.
  base: process.env.GITHUB_PAGES ? "/payrus-console/" : "/",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5174,
  },
});
