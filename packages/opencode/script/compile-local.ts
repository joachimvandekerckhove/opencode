#!/usr/bin/env bun
/**
 * Compile a working local Linux x64 (or current-platform) binary for this fork.
 *
 * Why this exists:
 * - Plain `bun build --compile src/index.ts` fails: missing `@opentui/solid/preload`.
 * - Upstream `./script/build.ts --single` (minify + splitting) can crash at runtime in
 *   `SystemPrompt.environment` (`TypeError: undefined is not an object (evaluating 'a.name')`).
 *
 * This script uses the Solid Bun plugin with minify/splitting disabled, which produces a
 * binary that passes `opencode run` smoke tests against Azure + Bedrock proxy routes.
 *
 * Usage (from repo root after `bun install`):
 *   bun packages/opencode/script/compile-local.ts
 *
 * Output:
 *   packages/opencode/dist/opencode-<os>-<arch>-local/bin/opencode
 */
import { $ } from "bun"
import path from "path"
import { fileURLToPath } from "url"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const plugin = createSolidTransformPlugin()
const treeSitterWorker = await Bun.file(fileURLToPath(import.meta.resolve("@opentui/core/parser.worker"))).text()
const treeSitterWorkerPath = "opentui-tree-sitter-worker.js"
const bunfsRoot = process.platform === "win32" ? "B:/~BUN/root/" : "/$bunfs/root/"

const os = process.platform === "win32" ? "windows" : process.platform
const arch = process.arch
const name = `opencode-${os}-${arch}-local`
const outfile = path.join(dir, "dist", name, "bin", "opencode")

await $`mkdir -p ${path.dirname(outfile)}`

const target =
  process.platform === "linux" && process.arch === "x64"
    ? "bun-linux-x64"
    : process.platform === "linux" && process.arch === "arm64"
      ? "bun-linux-arm64"
      : process.platform === "darwin" && process.arch === "arm64"
        ? "bun-darwin-arm64"
        : process.platform === "darwin" && process.arch === "x64"
          ? "bun-darwin-x64"
          : undefined

console.log(`building ${name}${target ? ` (target ${target})` : ""}`)

const result = await Bun.build({
  conditions: ["bun", "node"],
  tsconfig: "./tsconfig.json",
  plugins: [plugin],
  external: ["node-gyp"],
  format: "esm",
  // Minify + splitting breaks SystemPrompt.environment in compiled binaries.
  minify: false,
  sourcemap: "none",
  splitting: false,
  compile: {
    autoloadBunfig: false,
    autoloadDotenv: false,
    autoloadTsconfig: true,
    autoloadPackageJson: true,
    ...(target ? { target: target as any } : {}),
    outfile,
    execArgv: ["--use-system-ca", "--"],
  },
  files: {
    [treeSitterWorkerPath]: treeSitterWorker,
  },
  entrypoints: ["./src/index.ts", "./src/cli/tui/worker.ts", treeSitterWorkerPath],
  define: {
    FFF_LIBC: JSON.stringify("gnu"),
    OPENCODE_VERSION: "'local'",
    OPENCODE_CHANNEL: "'local'",
    OPENCODE_LIBC: process.platform === "linux" ? "'glibc'" : "''",
    OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + treeSitterWorkerPath,
    OPENCODE_WORKER_PATH: "./src/cli/tui/worker.ts",
    ...(process.platform === "linux" ? { "process.env.OPENTUI_LIBC": JSON.stringify("glibc") } : {}),
  },
})

if (!result.success) {
  console.error(result.logs)
  process.exit(1)
}

console.log(`Running smoke test: ${outfile} --version`)
const version = await $`${outfile} --version`.text()
console.log(`Smoke test passed: ${version.trim()}`)
console.log(`Binary: ${outfile}`)
