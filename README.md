# tolongssin

Project done, marketing zero — tolong sin.

A CLI that turns a finished codebase into a README, social media posts, and screenshots. No docs effort required — the AI does the talking.

## What it does

You built the project. Marketing is the part you skipped. `tolongssin` analyzes your codebase and generates the promo kit you'd never write yourself — a polished README, ready-to-post social drafts, and website screenshots. Run one command after finishing your project and get a shareable marketing kit in minutes.

## Quickstart

```bash
npm install -g tolongssin
tolongssin init
tolongssin all
```

`tolongssin init` sets up your project config. `tolongssin all` generates everything — README, social drafts, and screenshots — into a `marketing-kit/` folder.

## Features

- **README generator** — turns your codebase into a clean, structured README
- **Social media drafts** — ready-to-post copy for Twitter/X, LinkedIn, and Product Hunt
- **Screenshots** — captures responsive website images with Playwright
- **Landing page builder** — optional single-page landing page from your project details
- **Dry-run mode** — preview what would change before anything is written
- **Works offline** — cached AI prompts after the first run

## Screenshots

```
[README.md generated in repo root]
[marketing-kit/social/x-draft.md]
[marketing-kit/screenshots/homepage-1200px.png]
```

## Roadmap

- Auto-publish drafts to GitHub Releases
- Support for Python/Go projects
- Mastodon/Bluesky social templates

## Contributing

Fork, change, PR. Tests live in `tests/` — run `npm test` before committing.

License: ISC