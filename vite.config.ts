import react from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("src/components/exports/gif")) {
              return "gif-export" // Separate chunk for GIF export
            }

            // Group other components together (excluding lazy-loaded ones)
            if (id.includes("src/components/") && !id.includes("src/components/exports/gif")) {
              return "components"
            }
          }
        }
      }
    },
    optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }
    },
    plugins: [
      tsconfigPaths(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]]
        }
      }),
      visualizer()
    ],
    base: mode === "development" ? "/" : "/bendor/"
  }
})
