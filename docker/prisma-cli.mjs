// Copy the Prisma CLI out of the locked install, for the runner image.
//
// Walks prisma's and dotenv's dependency tree in node_modules (from bun.lock
// with --frozen-lockfile) and copies exactly those packages to
// /cli/node_modules, keeping each one's path, so every package is the version
// the lockfile pins. A fresh install here would resolve versions anew.
import { cpSync, existsSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

const root = process.env.PRISMA_CLI_ROOT ?? "/app"
const out = process.env.PRISMA_CLI_OUT ?? "/cli"

/** Node's lookup: node_modules/<name> in this directory, then each parent. */
const find = (name, from) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const path = join(dir, "node_modules", name)
    if (existsSync(join(path, "package.json"))) return path
    if (dirname(dir) === dir) return null
  }
}

const seen = new Set()
const walk = (name, from) => {
  const path = find(name, from)
  if (!path || seen.has(path)) return
  seen.add(path)
  const pkg = JSON.parse(readFileSync(join(path, "package.json"), "utf8"))
  const deps = { ...pkg.dependencies, ...pkg.optionalDependencies }
  for (const dep of Object.keys(deps)) walk(dep, path)
}

for (const name of ["prisma", "dotenv"]) {
  if (!find(name, root)) throw new Error(`${name} is not in the locked install`)
  walk(name, root)
}

// Copy each package without its nested node_modules; nested packages that are
// needed were walked too and are copied to their own nested path.
for (const path of seen) {
  cpSync(path, join(out, relative(root, path)), {
    recursive: true,
    verbatimSymlinks: true,
    filter: (src) => !relative(path, src).startsWith("node_modules"),
  })
}

console.log(`prisma CLI: ${seen.size} packages from the locked install`)
