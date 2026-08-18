import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cancel, confirm, isCancel } from "@clack/prompts";
import { buildReadmePrompt } from "../templates/readme-prompt.js";
import { generateMarkdown } from "./ai.js";
import type { RepoInfo } from "./analyzer.js";
import type { TolongssinConfig } from "./config.js";

export interface ReadmeOptions {
  dryRun?: boolean;
}

/**
 * Best-effort secret scrubber run on the *existing* README before it's sent
 * to the LLM as context. This is defense-in-depth, not a guarantee — it
 * catches common key formats and generic KEY/TOKEN/SECRET/PASSWORD
 * assignments, but an unusual or custom secret format can still slip
 * through. Proper secret hygiene (.gitignore, secret managers, rotation)
 * is still the real fix.
 */
interface SecretPattern {
  pattern: RegExp;
  replacement: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // sk-... covers OpenAI, Anthropic (sk-ant-...), and similar "sk-" formatted keys
  { pattern: /\b(sk-[A-Za-z0-9_-]{8,})\b/g, replacement: "[REDACTED]" },
  // GitHub tokens — classic (ghp_) and fine-grained (github_pat_)
  {
    pattern: /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    replacement: "[REDACTED]",
  },
  // AWS access key ID (the paired secret key has no fixed prefix — not reliably regex-detectable
  // without a high false-positive rate, so it's intentionally not covered here)
  { pattern: /\b(AKIA[A-Z0-9]{16})\b/g, replacement: "[REDACTED]" },
  // Slack tokens
  { pattern: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g, replacement: "[REDACTED]" },
  // JWTs (header.payload.signature)
  {
    pattern:
      /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    replacement: "[REDACTED]",
  },
  // Google API keys (Maps/Firebase/etc.)
  { pattern: /\b(AIza[0-9A-Za-z_-]{35})\b/g, replacement: "[REDACTED]" },
  // PEM private key blocks (can span many lines)
  {
    pattern:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: "[REDACTED PRIVATE KEY]",
  },
  // password inside a connection string, e.g. postgres://user:PASSWORD@host —
  // keep user@host visible for readability, redact only the password
  {
    pattern: /(\w+:\/\/[^\s:@/]+:)([^\s@]+)(@)/g,
    replacement: "$1[REDACTED]$3",
  },
];

// Generic KEY/TOKEN/SECRET/PASSWORD/PASS/CREDENTIAL assignment, e.g. "API_KEY=...",
// "export DB_PASSWORD=...", or "api_key: ...". Handles an optional leading `export`
// (common in shell examples) and both '=' and ':' assignment styles.
const GENERIC_SECRET_ASSIGNMENT =
  /^(\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL)\s*[:=]\s*).*$/gim;

export function scrubSecrets(text: string): string {
  let out = text;
  for (const { pattern, replacement } of SECRET_PATTERNS)
    out = out.replace(pattern, replacement);
  out = out.replace(GENERIC_SECRET_ASSIGNMENT, "$1[REDACTED]");
  return out;
}

export function backupFileName(now = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `README.md.${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}-${p(now.getMilliseconds(), 3)}`;
}

/** Reads the existing README, or null if it doesn't exist / can't be read. */
function readExistingReadme(readmePath: string): string | null {
  try {
    return readFileSync(readmePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Backs up the in-memory content that was actually analyzed (instead of
 * re-reading the file from disk), so the backup is guaranteed to match what
 * the LLM saw as context even if the file changed on disk in the meantime.
 */
function writeBackup(cwd: string, content: string): void {
  const backupDir = join(cwd, ".tolongssin", "backups");
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, backupFileName()), content, "utf8");
}

export async function generateReadme(
  info: RepoInfo,
  cfg: TolongssinConfig,
  opts: Readonly<ReadmeOptions> = {},
  cwd = process.cwd(),
): Promise<void> {
  const readmePath = join(cwd, "README.md");
  const existingReadme = readExistingReadme(readmePath);

  const prompt = buildReadmePrompt({
    projectName: cfg.projectName,
    valueProp: cfg.valueProp,
    audience: cfg.audience,
    repoType: cfg.repoType,
    primaryCta: cfg.primaryCta,
    repoInfo: {
      ...info,
      description: info.description
        ? scrubSecrets(info.description)
        : info.description,
    },
    existingReadme: existingReadme ? scrubSecrets(existingReadme) : null,
  });

  let draft: string;
  try {
    draft = await generateMarkdown(prompt);
  } catch (err) {
    throw new Error(
      `Failed to generate README draft: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (opts.dryRun) {
    console.log("--- README draft (dry-run, nothing written) ---");
    console.log(draft);
    return;
  }

  const kitDir = join(cwd, "marketing-kit");
  mkdirSync(kitDir, { recursive: true });
  writeFileSync(join(kitDir, "README.draft.md"), draft, "utf8");

  const ok = await confirm({
    message: "Write this draft to README.md?",
    initialValue: false,
  });
  if (isCancel(ok)) {
    cancel("Skipped — draft kept at marketing-kit/README.draft.md");
    return;
  }
  if (ok) {
    if (existingReadme !== null) {
      writeBackup(cwd, existingReadme);
    }
    writeFileSync(readmePath, draft, "utf8");
    console.log(
      `README.md written${existingReadme !== null ? "; original backed up to .tolongssin/backups/" : ""}`,
    );
  } else {
    console.log(
      "Draft kept at marketing-kit/README.draft.md — README.md unchanged",
    );
  }
}
