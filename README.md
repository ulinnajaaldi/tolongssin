# tolongssin

Turn your project into marketing material in one CLI command.

## Requirements

- Node.js >= 24

## Install

```bash
npm install -g tolongssin
```

## Quick Start

```bash
tolongssin init
tolongssin all
```

Generates `marketing-kit/` with README, social drafts, screenshots, and an optional landing page.

## What It Does

You finished the code. Marketing left undone. `tolongssin` scans your project, writes a polished README, drafts social posts, and captures screenshots. Run once, share everywhere.

## Commands

| Command | Description |
| --- | --- |
| `init` | Set up `.tolongssin` config |
| `readme` | Generate / improve `README.md` |
| `shots` | Capture responsive website screenshots |
| `social` | Draft X / LinkedIn / Product Hunt posts |
| `landing` | Generate an opt-in landing page |
| `all` | Run `init` → `readme` → `shots` → `social` (landing optional) |

Every command supports `--dry-run` to preview the plan before writing. `landing` also accepts `--study <url>` to extract the design DNA from a reference site.

## Output

```
marketing-kit/
├── README.md
├── social/
│   ├── x-draft.md
│   ├── linkedin-draft.md
│   └── producthunt-draft.md
└── screenshots/
    ├── homepage-1200px.png
    └── mobile-768px.png
```

## Features

- Generates clean README from your codebase
- Drafts ready-to-post social copy for X, LinkedIn, Product Hunt
- Captures responsive screenshots via Playwright
- Builds optional landing page from project details
- Dry-run mode to preview changes before writing
- Offline cache for AI prompts after first run

## Contributing

Fork, change, PR. Tests in `tests/`. Run `npm test` before commit. License: ISC
