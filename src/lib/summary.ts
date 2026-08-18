import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { kitDir, listKit } from "./kit-writer.js";

export function renderSummary(cwd: string): string {
  const dir = kitDir(cwd);
  const files = listKit(cwd);
  if (files.length === 0) return "";

  const maxLen = Math.max(...files.map((f) => f.length));
  const lines: string[] = [];
  lines.push(`┌─ TOLONGSSIN kit ${"─".repeat(Math.max(1, 40 - 17))}┐`);
  for (const f of files) {
    const stat = existsSync(join(dir, f)) ? statSync(join(dir, f)) : null;
    const size = stat ? ` (${stat.size}B)` : "";
    lines.push(`│ ${f.padEnd(maxLen)}${size.padStart(10)} marketing-kit/ │`);
  }
  lines.push(`└${"─".repeat(maxLen + 13)}┘`);
  return lines.join("\n");
}
