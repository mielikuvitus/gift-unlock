import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import svgr from "vite-plugin-svgr";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const httpsSanExtra = (env.DEV_HTTPS_SAN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    base: "/gift-unlock/",
    build: {
      outDir: "dist/gift-unlock",
    },
    plugins: [
      basicSsl({
        domains: httpsSanExtra,
      }),
      svgr({ include: "**/*.svg?react" }),
      react(),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@gsap/react": fileURLToPath(
          new URL("./src/lib/gsap-react-shim.js", import.meta.url),
        ),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
