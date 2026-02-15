import {unstable_reactRouterRSC as reactRouterRSC} from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function crossOriginIsolation(): import("vite").Plugin {
  return {
    name: "cross-origin-isolation",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    crossOriginIsolation(),
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
