# TOLONGSSIN
TOLONGSSIN: automate marketing materials from your codebase.
Saves time for developers to focus on their project.

TOLONGSSIN exists to help developers create professional marketing materials without leaving their terminals. It generates essential marketing content, such as READMEs and social media posts, based on your existing code. This allows you to showcase your project to the world with minimal effort.

## Features
* Generate polished READMEs
* Create single-file HTML landing pages
* Draft social media posts for Twitter, LinkedIn, and Product Hunt
* Capture website screenshots at multiple breakpoints
* Automate marketing material creation

## Requirements
- Node.js 24+ (LTS "Krypton")
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install the Playwright Chromium browser (required for the `shots` command):

   ```bash
   npx playwright install chromium
   ```

3. Create the config with `init` (detects repo type and prompts for project info):

   ```bash
   npx tsx src/cli.ts init
   ```

4. Add your AI API key to `.tolongssin/.env` (created by `init`):

   ```env
   OPENAI_API_KEY=your-key-here
   # AI_BASE_URL=            # optional, defaults to OpenAI; set for OpenAI-compatible providers
   # AI_MODEL=               # optional, defaults to gpt-4o-mini
   ```

   > Any OpenAI-compatible provider works. If the configured model returns empty content (some reasoning models only output planning), TOLONGSSIN automatically probes fallback models and retries.

## Run locally

```bash
# Development (tsx, hot-run)
npx tsx src/cli.ts --help

# Typecheck
npm run typecheck

# Tests
npm test

# Build to dist/ and run the installed binary
npm run build
node bin/tolongssin.js --help
```

## Usage

```bash
npx tsx src/cli.ts init        # set up .tolongssin config
npx tsx src/cli.ts readme      # generate / improve README.md
npx tsx src/cli.ts shots       # capture website screenshots (auth via user setup)
npx tsx src/cli.ts landing     # generate an opt-in landing page
npx tsx src/cli.ts social      # generate X / LinkedIn / Product Hunt drafts
npx tsx src/cli.ts all         # run init → readme → shots → social (+ optional landing)
```

Add `--dry-run` to any generation command to preview what would be written without touching files.

## Use on another project

TOLONGSSIN runs against whatever repo you're currently in. To generate a README for a different project, navigate to that project and point at the TOLONGSSIN source:

```bash
cd /path/to/your/other/project

# Run from the TOLONGSSIN repo (recommended while developing)
node /path/to/tolongssin/bin/tolongssin.js init     # set up config in this project
node /path/to/tolongssin/bin/tolongssin.js readme   # generate README.md here

# Or run in dev mode from the TOLONGSSIN source
npx tsx /path/to/tolongssin/src/cli.ts readme
```

Each project keeps its own `.tolongssin/` (config + API key) and `marketing-kit/` — nothing is shared, so you can generate kits for multiple repos side by side.

The generated `README.md`, drafts, and screenshots land in the **current project's** directory, not TOLONGSSIN's:

```
your-project/
├── README.md                       # written by `readme` (original backed up to .tolongssin/backups/)
└── marketing-kit/
    ├── README.draft.md
    ├── screenshots/                # from `shots`
    ├── landing/                    # from `landing`
    └── social/                     # from `social`
```

## Roadmap
* Improve AI model for better content generation
* Add support for more social media platforms
* Integrate with popular project management tools

## Contributing
Contributions are welcome. Fork the repository, make your changes, and submit a pull request.

## License
ISC