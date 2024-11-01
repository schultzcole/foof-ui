import { defineConfig } from "vite"
import deno from "@deno/vite-plugin"
import { join } from "@std/path"

// @ts-expect-error -- __dirname is provided by vite and resolves to the path of vite.config.ts
const workspaceDir = join(__dirname, "../")

// https://vite.dev/config/
export default defineConfig({
    plugins: [deno()],
    css: {
        devSourcemap: true,
    },
    resolve: {
        alias: {
            "@scope/core": join(workspaceDir, "../core/mod.ts"),
        },
    },
})
