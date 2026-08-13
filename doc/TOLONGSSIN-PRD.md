# TOLONGSSIN — Developer Marketing Kit CLI

## Metadata

- Project: TOLONGSSIN
- Feature: Core CLI (v0.1)
- Status: Draft
- Created: 2026-08-09
- Owner: Aldilla Ulinnaja
- Docs path: Obsidian vault `Projects/TOLONGSSIN/`

> Working name from PRD Q4: **TOLONGSSIN** (npm: `tolongssin`).
> "Tolong, sin..." — the developer's plea when marketing time comes.
> Self-deprecating Indonesian dev humor as brand identity.

---

## 1. Overview

TOLONGSSIN is a CLI tool that solves the "project done, marketing zero" problem for
developers. Given a repository, it produces the minimum marketing assets that
project actually needs, in one command.

The tool reads the repo, asks a few clarifying questions, and generates:

- an improved README.md (value-prop-first)
- automatic website screenshots (Playwright-based, auth support via user-setup)
- an optional landing page (never forced)
- platform-specific social copy drafts

## 2. Problem Statement

Developers ship projects constantly but skip marketing because:

- they do not know where to start
- they overthink landing pages
- they have no design skill
- marketing feels like a separate skill from coding
- they abandon after publishing a bare README

Most existing tools are fragmented (README-only generators, landing page
builders, OG image makers). None covers the full path from repo to launch kit
with the right level of effort per project type.

## 3. Goals

- G1: One command turns a repo into a complete marketing kit.
- G2: README improvement is the core, always-on feature.
- G3: Screenshots are automated with auth support (user-setup once).
- G4: Landing page is an opt-in, not a default.
- G5: CLI-first; no backend, no database, no web UI in v0.1.
- G6: Time-to-first-asset under 5 minutes after setup.

## 4. Non-Goals (v0.1)

- No web app or dashboard.
- No auth system for TOLONGSSIN itself.
- No social media auto-posting (drafts only).
- No deployment/publish automation.
- No video assets.
- No multi-language docs generation.

## 5. User Personas

### P1 — Side project developer (primary)

- Ships CLI tools, libraries, small web apps.
- Wants to launch fast without learning marketing.
- Wants "good enough", not perfection.
- Pain: opening a blank landing page builder = instant paralysis.

### P2 — Indie hacker / solo founder

- Has one or two SaaS projects.
- Needs landing page sometimes, README always.
- Needs consistent branding across README, page, and social posts.

### P3 — Internal / experimental builder (secondary)

- Builds internal tools or experiments.
- Needs only a decent README. Anything more is waste.

## 6. Core User Flows

### Flow 1 — First run setup

1. User runs `tolongssin init` in a repo.
2. Tool detects repo type (CLI/lib/web app/plugin).
3. Tool prompts for: project name, one-line value prop, target audience.
4. Tool detects auth requirements for screenshot flow (if web app).
5. Config saved to `.tolongssin/config.json` (committed) + `.tolongssin/.env` (gitignored, for secrets).

### Flow 2 — Generate README

1. User runs `tolongssin readme`.
2. Tool analyzes repo (package.json / pyproject.toml / README if exists).
3. Tool generates improved README draft.
4. User reviews and edits.
5. User accepts; tool writes `README.md` (with backup of original).

### Flow 3 — Capture screenshots

1. User runs `tolongssin shots`.
2. If repo is not a web app, tool skips and explains why.
3. If auth is needed, tool starts local dev server and prompts user to log in manually in a browser.
4. Tool captures configured sections (hero, features, dashboard, etc.).
5. Tool optimizes and saves images to `marketing-kit/screenshots/`.

### Flow 4 — Optional landing page

1. User runs `tolongssin landing`.
2. Tool generates a PRD-like section plan from the README.
3. Tool scaffolds a single-page static site (Tailwind-based).
4. User reviews copy and design tokens.
5. User deploys (manual, e.g. Vercel/Netlify).

### Flow 5 — Social copy

1. User runs `tolongssin social`.
2. Tool generates platform-specific drafts: X thread, LinkedIn post, Product Hunt draft.
3. Output saved to `marketing-kit/social/`.

## 7. Functional Requirements

- FR-001: `tolongssin init` creates `.tolongssin/` config and prompts for product info.
- FR-002: `tolongssin readme` analyzes the repo and generates an improved README.
- FR-003: `tolongssin readme` must back up the existing README before overwriting.
- FR-004: `tolongssin shots` must detect whether the project is a web app.
- FR-005: `tolongssin shots` must support auth via user-setup: start server, open browser, wait for user login, then capture.
- FR-006: `tolongssin shots` must capture full-page and viewport screenshots at configured breakpoints (desktop/mobile).
- FR-007: `tolongssin landing` must generate a landing page only when explicitly invoked.
- FR-008: `tolongssin landing` must derive section plan from the README value prop.
- FR-009: `tolongssin social` must output drafts for X, LinkedIn, and Product Hunt.
- FR-010: All generated assets must go to `marketing-kit/` folder.
- FR-011: All commands must be runnable offline except AI generation calls.
- FR-012: AI generation calls must read API key from `.tolongssin/.env` (never hardcoded, never committed).
- FR-013: A `--dry-run` flag on every generation command must print what would be created without writing anything.

## 8. Data Requirements

### Config file `.tolongssin/config.json`

| Field | Type | Required | Description |
|---|---|---|---|
| projectName | string | yes | Display name |
| valueProp | string | yes | One-line value proposition |
| audience | string | yes | Target user |
| repoType | enum: cli/lib/webapp/plugin/other | yes | Detected, confirmable |
| primaryCta | string | optional | For landing page |
| screenshots | object | optional | Breakpoints + sections |
| landingPage | object | optional | Style tokens |

### Secrets `.tolongssin/.env`

| Key | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` (or provider key) | for AI commands | Never committed |

### Derived assets (generated, stored under `marketing-kit/`)

- `README.md` (updated in place)
- `screenshots/` (PNG/JPG)
- `landing/` (static site scaffold)
- `social/` (markdown drafts)

## 9. UI Requirements

CLI only. Text UI with clear prompts:

- Welcome banner with next steps.
- Progress indicators per generation step.
- Summary table at the end (what was created, where).
- Color output, disable via `NO_COLOR`.

## 10. API Requirements

- Outbound calls to AI provider (OpenAI-compatible) for generation.
- Playwright for browser automation (local only, no server).
- No TOLONGSSIN server-side API.

## 11. Business Rules

- BR-001: Never overwrite README without a backup (`.tolongssin/backups/`).
- BR-002: Landing page generation is always opt-in.
- BR-003: Secrets must never be written to generated files or README.
- BR-004: Screenshots must never be captured without user consent for auth flows.
- BR-005: AI-generated content must be marked as draft — user review required before writing.
- BR-006: If repo type is not a web app, `shots` must exit gracefully with explanation.

## 12. Acceptance Criteria

- [ ] `tolongssin init` creates config and completes prompts
- [ ] `tolongssin readme --dry-run` prints planned output without writing
- [ ] `tolongssin readme` improves an existing README and keeps a backup
- [ ] `tolongssin shots` detects non-web projects and exits gracefully
- [ ] `tolongssin shots` works on a web app with auth (user login flow)
- [ ] `tolongssin shots` produces desktop + mobile captures
- [ ] `tolongssin landing` generates a deployable static page only when invoked
- [ ] `tolongssin social` generates 3 platform drafts
- [ ] All outputs land in `marketing-kit/`
- [ ] No secret ever appears in generated files
- [ ] `--dry-run` works on all generation commands

## 13. Risks

- R1: Playwright auth flows are flaky on some sites (single-user setup mitigates).
- R2: AI content quality varies; mitigations: structured prompts, human review gate.
- R3: Repo analysis misdetects project type; mitigation: explicit user confirmation.
- R4: Scope creep toward "do everything" platform; mitigation: strict v0.1 non-goals.
- R5: Screenshots of localhost require dev server; mitigation: auto-detect + clear instructions.

## 14. Open Questions

- Q1: ~~AI provider default — OpenAI only, or configurable (OpenAI-compatible) from day one?~~ **RESOLVED (2026-08-09): both OpenAI + OpenAI-compatible (configurable baseURL) from day one.**
- Q2: ~~Language of generated copy — English default, Indonesian optional?~~ **RESOLVED (2026-08-09): English default. Indonesian optional = later flag.**
- Q3: ~~Should `tolongssin readme` auto-commit to git, or leave that to the user?~~ **RESOLVED (2026-08-09): user commits manually. No auto-commit.**
- Q4: ~~Naming — DevMark (devmark) OK? Alternatives: launchkit, shipkit, promokit.~~ **RESOLVED (2026-08-09): TOLONGSSIN (npm: `tolongssin`).**
- Q5: ~~Default template for landing — which design language (see popular-web-designs: Stripe/Linear/Vercel)?~~ **RESOLVED (2026-08-09): Hallmark design DNA — see section 16 below.**

## 15. Design Direction — Hallmark DNA (from https://www.usehallmark.com/)

Hallmark is a design skill that refuses to look AI-generated. TOLONGSSIN
adopts its core philosophy for all generated landing pages: **anti-AI-slop by
default.** Our product exists to make developer marketing look human-crafted;
our generated pages must embody that.

### 15.1 Design Principles

- **Never repeat a macrostructure.** Each generated page picks a distinct
  top-level layout (split hero, centered hero, editorial, terminal, etc.).
  Track the last 3 macrostructures used; never reuse one within that window.
- **Macrostructure first, then dress it.** Pick the page skeleton before
  choosing colors/typography. Layout drives identity, not the other way.
- **Distinctive display + body font pair.** Never Inter-for-everything.
  Pair a strong display face with a readable body face (see examples below).
- **Single accent hue.** One accent color, used sparingly. No purple-to-pink
  gradient heroes, no rainbow glows.
- **Solid surfaces.** Cards/sections use solid fills or subtle borders, not
  glassmorphism-everywhere or heavy shadows.
- **Typography carries the identity.** Weight, size, and letter-spacing matter
  more than the specific font face.
- **Content-first, human copy.** Generated copy must read like a person wrote
  it: short lines, no corporate filler, no "unlock the power of".
- **Slop-test every page.** Before acceptance, check against the anti-pattern
  catalogue: gradient hero, Inter everywhere, centered everything, fake
  testimonials, emoji overload, generic 3-column feature cards.

### 15.2 Example Hallmark Macrostructure Outputs

From the Hallmark examples gallery (each = a distinct macrostructure):

- `build a guided sourdough app, Hum` — warm craft
- `build a repair-café manifesto poster, custom`
- `build a landing page for a small-batch honey farm`
- `build a page for an indie risograph print fair`
- `build a portfolio for an experimental typographer`
- `build a SaaS product page, modern-minimal`
- `build a travel booking site, atmospheric`
- `build a creative studio with playful motion`
- `build a software architect personal site`
- `build a Moroccan fashion brand landing page`
- `build a developer infrastructure landing page`
- `build a content-extraction API, Cobalt`
- `build a record-label EP page, Carnival`
- `build an AI reasoning tool, Lumen`
- `build a poster festival site, Grid`

Each demonstrates: distinct macrostructure + theme + typography pairing.
TOLONGSSIN's landing generator should draw from this same diversity — the
page for a CLI tool should NOT look like the page for a SaaS dashboard.

### 15.3 Hallmark `study` Command (inspiration for `landing` flow)

Hallmark has a `/hallmark study <URL>` verb that reads a page's *structure*
(not pixels) and returns a **DNA card** + optional portable `design.md`.

**TOLONGSSIN adaptation:** `tolongssin landing --study <URL>` — user points at
a design they admire; tool extracts the macrostructure/typography/accent
DNA and uses it as the design direction for the generated landing page.
This directly answers "kalau user pengen landing page ya boleh ada opsinya"
with a tasteful, opinionated default (Hallmark DNA) plus user customization.

### 15.4 Anti-Pattern Catalogue (what generated pages must avoid)

- Purple-to-pink gradient hero
- Inter as display + body
- Centered everything
- 3 identical feature cards
- Fake testimonials with avatars
- Emoji overload
- Generic stock hero image
- "Unlock the power of" / "revolutionize" copy

## 16. Implementation Notes

## 16. Implementation Notes

- Language: TypeScript 7 (tsgo, native Go port) + Node 24 LTS ("Krypton").
- CLI framework: commander 15.
- Interactive prompts: @clack/prompts 1.7.
- AI: openai 7 (official SDK) + Vercel AI SDK 7 (`ai` + `@ai-sdk/openai-compatible`) for OpenAI + OpenAI-compatible providers (configurable baseURL).
- Build: tsup 8.5. Tests: Vitest 4. Env: dotenv 17.
- Playwright: chromium only in v0.1 (latest 1.62).
- Docs: README lives in repo; PRD/plans live in Obsidian vault.

### Decided in review 2026-08-09

- AI provider: OpenAI + OpenAI-compatible (configurable baseURL) from day one.
- Git commits: never auto-commit; user commits manually.
- Name: TOLONGSSIN (`tolongssin`).
- Landing design DNA: Hallmark anti-AI-slop system (section 15).
- Tech stack: see `Projects/TOLONGSSIN/Decisions/TOLONGSSIN-Tech-Stack-Analysis.md` (full ADR).
- Copy language: English default (Q2).

---

## Tier Classification Framework

TOLONGSSIN does not force landing pages on every project. It classifies the repo
into a tier and generates only what that tier needs.

| Tier | Repo type | Assets generated |
|---|---|---|
| Tier 1 — README-only | CLI tools, libraries, internal tools, experiments | Improved README + 1 OG image (optional) |
| Tier 2 — Marketplace-ready | Plugins, extensions, SDKs, boilerplates | README + listing assets (screenshots, icon, banner) |
| Tier 3 — Full launch | SaaS, paid products, consumer apps, OSS with growth goals | README + screenshots + landing page + social kit |

Classification is AI-assisted (reads README/package metadata) but always
confirmed by the user before generation.
