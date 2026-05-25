import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const localCertDir = path.resolve(__dirname, "../certs");
const infraCertDir = path.resolve(__dirname, "../infra/certs");
const certDir = fs.existsSync(localCertDir) ? localCertDir : infraCertDir;
const keyPath = path.join(certDir, "localhost-key.pem");
const certPath = path.join(certDir, "localhost.pem");
const hasHttpsCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react],
  server: {
    port: 5173,
    https: hasHttpsCert
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : undefined,
    proxy: {
      "/api": {
        target: hasHttpsCert ? "https://127.0.0.1:8000" : "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
