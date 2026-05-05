import { existsSync } from "node:fs"
import { solidPlugin } from "./src/lib/cursed-ui/plugin.js"

// ============================================================
// Config
// ============================================================

const isWindows = process.platform === "win32"
const PLATFORM = isWindows ? "win" : "linux"
const PLATFORM_DIR = `dist/${PLATFORM}`
const BUN_TARGET = isWindows ? "bun-windows-x64-modern" : "bun-linux-x64-modern"
const shouldRun = process.argv.includes("run")

// ============================================================
// Helpers
// ============================================================

async function exec(cmd, opts = {}) {
    console.log(`  $ ${cmd}`)
    const proc = Bun.spawn(cmd.split(" "), {
        stdout: "inherit",
        stderr: "inherit",
        ...opts,
    })
    const code = await proc.exited
    if (code !== 0) {
        console.error(`Command failed with exit code ${code}: ${cmd}`)
        process.exit(1)
    }
}

// ============================================================
// 1. Ensure node-raylib is compiled
// ============================================================

const raylibNode = "node_modules/raylib/build/Release/node-raylib.node"

if (!existsSync(raylibNode)) {
    console.log("Building node-raylib...")

    // Rebuild package tree
    await exec("bun i")

    // Check for cmake
    const cmake = Bun.which("cmake")
    if (!cmake) {
        console.error("cmake not found. Install cmake to build node-raylib.")
        process.exit(1)
    }

    // Build native addon
    await exec("npm run compile", { cwd: "node_modules/raylib" })
} else {
    console.log("node-raylib.node exists, reusing...")
}

// ============================================================
// 2. Bundle with Solid plugin via Bun.build() JS API
// ============================================================

console.log(`\nBuilding for ${PLATFORM}...`)

const result = await Bun.build({
    entrypoints: ["src/entry.js"],
    outdir: PLATFORM_DIR,
    target: BUN_TARGET,
    plugins: [solidPlugin],
    minify: true,
    sourcemap: "linked",
    bytecode: true,
})

if (!result.success) {
    console.error("Build failed:")
    for (const log of result.logs) {
        console.error(log)
    }
    process.exit(1)
}

console.log(`Bundle written to ${PLATFORM_DIR}/`)

// ============================================================
// 3. Compile to standalone executable
// ============================================================

const outfile = `${PLATFORM_DIR}/game${isWindows ? ".exe" : ""}`

const compileResult = await Bun.build({
    entrypoints: [`${PLATFORM_DIR}/entry.js`],
    outfile,
    target: BUN_TARGET,
    plugins: [solidPlugin],
    compile: true,
})

if (!compileResult.success) {
    console.error("Compile failed:")
    for (const log of compileResult.logs) {
        console.error(log)
    }
    process.exit(1)
}

// ============================================================
// 4. Copy assets
// ============================================================

await exec(`rm -rf ${PLATFORM_DIR}/assets`)
await exec(`cp -r assets ${PLATFORM_DIR}/assets`)

console.log(`\nBuild complete: ${PLATFORM_DIR}/`)

// ============================================================
// 5. Optionally run
// ============================================================

if (shouldRun) {
    console.log(`\nRunning ${outfile}...`)
    await exec(`./${outfile}`)
}
