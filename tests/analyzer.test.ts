import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeRepo } from "../src/lib/analyzer.js";

const dirs: string[] = [];

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "tolongssin-test-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(join(dir, rel.split("/").slice(0, -1).join("/")), {
      recursive: true,
    });
    writeFileSync(path, content, "utf8");
  }
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("analyzeRepo", () => {
  it("detects a webapp from next deps", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        dependencies: { react: "^18", "react-dom": "^18", next: "^14" },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("webapp");
    expect(info.isWebApp).toBe(true);
    expect(info.confidence).toBe("high");
  });

  it("detects a cli from a bin field", () => {
    const dir = fixture({
      "package.json": JSON.stringify({ bin: { mycli: "bin/mycli.js" } }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("cli");
    expect(info.hasBin).toBe(true);
  });

  it("detects a lib from exports with no bin", () => {
    const dir = fixture({
      "package.json": JSON.stringify({ exports: { ".": "./src/index.js" } }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("lib");
  });

  it("detects a plugin from a manifest with minAppVersion", () => {
    const dir = fixture({
      "manifest.json": JSON.stringify({ id: "x", minAppVersion: "1.0.0" }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("plugin");
  });

  it("returns other with low confidence for an empty dir", () => {
    const dir = fixture({});
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("other");
    expect(info.confidence).toBe("low");
  });

  it("detects a VS Code extension as plugin, not lib", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        main: "./src/extension.js",
        publisher: "acme",
        contributes: { commands: [] },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("plugin");
  });

  it("classifies a mixed bin+next repo as webapp with medium confidence", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        bin: { mycli: "bin/mycli.js" },
        dependencies: { next: "^14" },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("webapp");
    expect(info.isWebApp).toBe(true);
    expect(info.hasBin).toBe(true);
    expect(info.confidence).toBe("medium");
  });

  it("extracts metadata and normalizes the repository url", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        name: "my-cli",
        description: "A demo cli",
        keywords: ["cli", "demo"],
        repository: { url: "git+https://github.com/user/repo.git" },
        bin: { mycli: "bin/mycli.js" },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.name).toBe("my-cli");
    expect(info.description).toBe("A demo cli");
    expect(info.keywords).toEqual(["cli", "demo"]);
    expect(info.repoUrl).toBe("https://github.com/user/repo");
  });

  it("never writes files", () => {
    const dir = fixture({
      "package.json": JSON.stringify({ bin: { mycli: "bin/mycli.js" } }),
    });
    const before = readdirSync(dir, { recursive: true }).sort();
    analyzeRepo(dir);
    const after = readdirSync(dir, { recursive: true }).sort();
    expect(after).toEqual(before);
  });

  it("detects monorepo with packages/* workspace as lib", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        workspaces: ["packages/*"],
        exports: { ".": "./src/index.js" },
      }),
      "packages/core/package.json": JSON.stringify({ name: "@my/core" }),
      "packages/ui/package.json": JSON.stringify({ name: "@my/ui" }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("lib");
    expect(info.confidence).toBe("high");
  });

  it("returns other with low confidence for README-only repo", () => {
    const dir = fixture({
      "README.md": "# My Project\nA cool project.\n",
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("other");
    expect(info.confidence).toBe("low");
  });

  it("detects Python CLI from pyproject.toml", () => {
    const dir = fixture({
      "pyproject.toml": `[project]
name = "my-py-cli"
version = "0.1.0"

[project.scripts]
mycli = "my_cli:main"
`,
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("cli");
    expect(info.confidence).toBe("high");
  });

  it("detects Python webapp from pyproject.toml", () => {
    const dir = fixture({
      "pyproject.toml": `[project]
name = "my-api"
dependencies = ["fastapi", "uvicorn"]
`,
    });
    const info = analyzeRepo(dir);
    expect(info.repoType).toBe("webapp");
    expect(info.isWebApp).toBe(true);
  });

  it("detects SSH repository url", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        repository: "git@github.com:user/repo.git",
        bin: { mycli: "bin/mycli.js" },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.repoUrl).toBe("https://github.com/user/repo");
  });

  it("extracts dependencies from package.json", () => {
    const dir = fixture({
      "package.json": JSON.stringify({
        dependencies: { react: "^18", next: "^14" },
        devDependencies: { vitest: "^4" },
      }),
    });
    const info = analyzeRepo(dir);
    expect(info.dependencies).toEqual(["react", "next", "vitest"]);
  });

  it("lists top-level dirs with slash and filters dotfiles and node_modules", () => {
    const dir = fixture({
      "package.json": JSON.stringify({ bin: { mycli: "bin/mycli.js" } }),
      "src/index.ts": "export const x = 1\n",
      "tests/x.test.ts": 'it("x", () => {})\n',
      "README.md": "# Hi\n",
      ".gitignore": "node_modules\n",
      "node_modules/pkg/index.js": "console.log(1)\n",
      "dist/bundle.js": "console.log(1)\n",
    });
    const info = analyzeRepo(dir);
    expect(info.fileStructure).toContain("src/");
    expect(info.fileStructure).toContain("tests/");
    expect(info.fileStructure).toContain("README.md");
    expect(info.fileStructure).not.toContain("node_modules/");
    expect(info.fileStructure).not.toContain("dist/");
    expect(info.fileStructure).not.toContain(".gitignore");
  });

  it("caps fileStructure at 30 entries", () => {
    const files: Record<string, string> = {
      "package.json": JSON.stringify({ bin: { mycli: "bin/mycli.js" } }),
    };
    for (let i = 0; i < 40; i++) files[`file-${i}.txt`] = "x\n";
    const info = analyzeRepo(fixture(files));
    expect(info.fileStructure?.length).toBeLessThanOrEqual(30);
  });
});
