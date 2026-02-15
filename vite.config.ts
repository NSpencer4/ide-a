import {unstable_reactRouterRSC as reactRouterRSC} from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
    tailwindcss(),
    reactRouterRSC(),
    rsc({serverHandler: false}),
    tsconfigPaths(),
  ],
  environments: {
    rsc: {
      optimizeDeps: {
        exclude: ["react-router"],
      },
    },
    ssr: {
      optimizeDeps: {
        exclude: ["react-router"],
      },
    },
  },
});
