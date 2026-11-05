import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

test("type-aware lint project matching still honors narrow default-project globs", async () => {
  const parser = createRequire(import.meta.url)("@typescript-eslint/parser");
  const directory = await mkdtemp(join(tmpdir(), "gap-eslint-compat-"));
  try {
    await mkdir(join(directory, "src"));
    await writeFile(join(directory, "src/included.ts"), "export const inside = 1;");
    await writeFile(join(directory, "tsconfig.json"), JSON.stringify({ compilerOptions: { allowJs: true }, include: ["src/**/*.ts"] }));
    const options = { filePath: join(directory, "outside.js"), tsconfigRootDir: directory,
      projectService: { allowDefaultProject: ["*.js"] }, sourceType: "module" };
    const parsed = parser.parseForESLint("const answer = 42;", options);
    assert.ok(parsed.services.program, "The default-project glob must provide real type information");
    assert.equal(parsed.ast.body[0].type, "VariableDeclaration");
    assert.throws(() => parser.parseForESLint("const blocked = 1;", { ...options, filePath: join(directory, "nested/blocked.js") }), /does not match 'nested\/blocked.js'/);
  } finally {
    parser.clearCaches();
    await rm(directory, { recursive: true, force: true });
  }
});

test("install-script approval is limited to the reviewed locked resolver version", () => {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const resolver = lock.packages["node_modules/unrs-resolver"];
  assert.deepEqual(pkg.allowScripts, { [`unrs-resolver@${resolver.version}`]: true });
  assert.equal(resolver.version, "1.12.2");
});

test("Vercel npm commands remove only the unsupported cache-dir environment aliases", () => {
  const config = readJson("vercel.json");
  const prefix = "env -u npm_config_cache_dir -u NPM_CONFIG_CACHE_DIR ";
  assert.equal(config.installCommand, `${prefix}npm ci`);
  assert.equal(config.buildCommand, `${prefix}npm run build`);

  const result = spawnSync("sh", ["-c", `${prefix}npm --version`], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache_dir: "/unused/lowercase-cache",
      NPM_CONFIG_CACHE_DIR: "/unused/uppercase-cache",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^\d+\.\d+\.\d+/);
  assert.doesNotMatch(result.stderr, /Unknown env config/);
});
