// Bun plugin that transforms .jsx/.tsx files through babel-preset-solid
// so that JSX compiles to our custom reconciler instead of React/DOM.

import { transformAsync } from "@babel/core"
import solid from "babel-preset-solid"
import { plugin as registerBunPlugin } from "bun"
import { resolve, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const reconcilerPath = resolve(__dirname, "reconciler.js")

let installed = false

export function installSolidPlugin() {
    if (installed) return
    installed = true

    registerBunPlugin({
        name: "solid-jsx",
        setup(build) {
            // Bun resolves solid-js to the server build by default.
            // Redirect server.js -> solid.js to get the reactive client runtime.
            build.onLoad({ filter: /[/\\]solid-js[/\\]dist[/\\]server\.js$/ }, async (args) => {
                const clientPath = args.path.replace("server.js", "solid.js")
                const code = await Bun.file(clientPath).text()
                return { contents: code, loader: "js" }
            })

            build.onLoad({ filter: /[/\\]solid-js[/\\]store[/\\]dist[/\\]server\.js$/ }, async (args) => {
                const clientPath = args.path.replace("server.js", "store.js")
                const code = await Bun.file(clientPath).text()
                return { contents: code, loader: "js" }
            })

            build.onLoad({ filter: /\.jsx$/ }, async (args) => {
                const file = Bun.file(args.path)
                const code = await file.text()

                // babel-preset-solid emits imports from `moduleName`.
                // We use a placeholder then rewrite it to the real path
                // relative to the file being transformed.
                const result = await transformAsync(code, {
                    filename: args.path,
                    configFile: false,
                    babelrc: false,
                    presets: [
                        [solid, {
                            moduleName: "%%RECONCILER%%",
                            generate: "universal",
                        }],
                    ],
                })

                // rewrite the placeholder to a relative path from the source file
                const fileDir = dirname(args.path)
                let rel = relative(fileDir, reconcilerPath).replaceAll("\\", "/")
                if (!rel.startsWith(".")) rel = "./" + rel

                const contents = (result?.code ?? "").replaceAll("%%RECONCILER%%", rel)

                return { contents, loader: "js" }
            })
        },
    })
}
