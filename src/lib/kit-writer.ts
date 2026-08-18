import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

export function kitDir(cwd: string): string {
  return join(cwd, "marketing-kit");
}

export function ensureKitDir(cwd: string): string {
  const dir = kitDir(cwd);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeFileAtomic(
  kitPath: string,
  content: string,
  cwd: string,
  dryRun = false,
): string {
  const target = join(kitDir(cwd), kitPath);
  const tmpPath = `${target}.tmp`;
  if (dryRun) {
    console.log(`  [dry-run] would write: marketing-kit/${kitPath}`);
    return target;
  }
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(tmpPath, content, "utf8");
  renameSync(tmpPath, target);
  return target;
}

export function listKit(cwd: string): string[] {
  const dir = kitDir(cwd);
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        results.push(relative(dir, full));
      }
    }
  }
  walk(dir);
  return results.sort();
}

export function pathFor(name: string, cwd: string): string {
  return join(kitDir(cwd), name);
}
