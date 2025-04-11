import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.jpg", "**/*.png"],
  publicDir: "public",
  plugins: [react()],
  server: {
    allowedHosts: ["bibliographic-films-lady-wifi.trycloudflare.com"],
    cors: true, // Enable CORS for development
  },
  build: {
    assetsInlineLimit: 0, // Ensure images are processed as assets rather than inlined
  },
  optimizeDeps: {
    include: ["three", "three/examples/jsm/loaders/GLTFLoader"],
  },
  resolve: {
    alias: {
      three: "three",
    },
  },
});
