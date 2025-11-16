import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    host: true,
    port: 3000,
    // permitir hosts de localtunnel / loca.lt
    allowedHosts: ['eighty-moles-hunt.loca.lt', '.loca.lt', 'localhost', '0.0.0.0'],
  },
})
