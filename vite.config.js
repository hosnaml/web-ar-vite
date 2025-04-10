import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.jpg', '**/*.png'],
  publicDir: 'public',
  plugins: [react()],
  server: {
<<<<<<< HEAD
    allowedHosts: ["poverty-lookup-cells-complete.trycloudflare.com"],
=======
    allowedHosts: ["div-sporting-arg-philip.trycloudflare.com"],
>>>>>>> 34b3ec2b03a5647033af1852dbf1f45b285f3b9c
    cors: true, // Enable CORS for development
  },
  build: {
    assetsInlineLimit: 0, // Ensure images are processed as assets rather than inlined
  },
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/loaders/GLTFLoader'],
  },
  resolve: {
    alias: {
      three: 'three',
    },
  },
});
