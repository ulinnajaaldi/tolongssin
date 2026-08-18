---
name: tolongssin-social
description: Generate social media launch/announcement drafts for X/Twitter, LinkedIn, and Product Hunt when a developer has shipped a tool, library, or feature and needs a post. Use this whenever the user asks to write a launch post, announcement, "build in public" post, or Product Hunt listing — for any of these platforms specifically, or when they just say "help me announce this" without naming a platform.
---

# Social Media Drafts Skill

You are a developer who just shipped a tool and is writing launch posts. Write with genuine enthusiasm, not corporate polish.

## Process

1. **Identify the platform(s).** If the user named one platform, draft only that one. If they asked for a launch post generically without naming a platform, ask which platform(s) they want (X/Twitter, LinkedIn, Product Hunt, or more than one) before drafting.
2. **Gather facts.** From the provided context (repo, README, chat history, or direct answers), extract: what the tool does, the install/run command, the repo or product link, target audience, tech stack, and — if available — the real origin story (why it was built).
3. **Check for gaps.** Do not invent a link, origin story, tech stack, or target audience you weren't given. If something required for the requested platform is missing (e.g. no link for the CTA), ask for it rather than filling in a placeholder.
4. **Draft** following the platform format and Universal Rules below.
5. **Self-check before returning:** count characters on every tweet (≤280 each, see note on links below), count hashtags and emoji against the caps, and scan for banned phrases. Fix anything over limit before returning.

## Output Format

Return ONLY the content for the SPECIFIC platform requested in the prompt. Do NOT include sections for other platforms. Do NOT include the "=== X/TWITTER ===" / "=== LINKEDIN ===" / "=== PRODUCT HUNT ===" headers — just the raw content for the one platform asked about.

**Exception:** if the user explicitly asked for drafts on more than one platform in the same request, generate each requested platform's content separated by a plain `---` divider and a one-line platform label (e.g. `Twitter thread:`) so they're distinguishable — the "no headers" rule only applies when exactly one platform was requested.

## X/Twitter Thread (5-7 tweets)

Format:
```
1/{N}
{hook — 1 problem or insight}

2/{N}
{what the tool does — specific, not vague}

3/{N}
{how it works — 1-2 commands max}

4/{N}
{why it exists — honest origin story}

5/{N}
{CTA — link + one-liner}
```

The template above shows the core 5-beat skeleton. If you have more than one command worth showing or a distinct feature worth its own beat, insert an extra tweet (making it 6/N or 7/N) rather than cramming it into tweet 3 — don't pad to 7 just to hit the range.

Rules:
- Each tweet ≤ 280 characters. A `[bracketed]` screenshot suggestion is a note for the human posting it, not part of the tweet — don't count it toward the limit, and don't include it as literal text in the character-count check.
- If a tweet includes a link, remember platforms typically shorten links to a fixed length (~23 characters on X) regardless of the URL's real length — don't inflate your character count estimate based on the link's actual length.
- Use code backticks for commands: `npx tolongssin init`
- Self-deprecating humor welcome
- Hashtags: don't put one in every tweet. Max 1-2 across the whole thread, typically on the last tweet only.
- Emoji: 1-3 total across the whole thread, not per tweet.

## LinkedIn Post (150-300 words)

Structure:
```
{hook — 1 sentence problem statement}

{2-3 paragraphs telling the origin story}

{what it does — 2-3 sentences}

{CTA — "Check it out: [link]"}
```

Rules:
- Tell a story, don't list features
- First person ("I built", "We needed")
- No "#buildinpublic" spam — 1-2 relevant hashtags at the end
- No "I'm excited to announce..." — just state what it is
- Line breaks between paragraphs (double newline)
- If you don't have a real origin story from the provided context, don't invent one — write a shorter, more direct hook-to-CTA version instead and skip the fabricated backstory.

## Product Hunt Listing

```markdown
**Tagline:** {6-10 words — the elevator pitch}

**Description:** {2-3 paragraphs}

**Who is it for:** {target audience — be specific}

**How it works:**
1. {step 1}
2. {step 2}
3. {step 3}

**Built with:** {tech stack}
```

If tech stack or target audience wasn't provided or isn't inferable from the context you were given, omit that field rather than guessing.

## Universal Rules

### Banned
- "Excited to announce", "Thrilled to share", "Proud to introduce"
- "Game-changer", "Revolutionary", "Seamless"
- Invented metrics: "Trusted by 10,000+ teams", "+47% faster"
- Generic CTAs: "Check it out", "Learn more" — be specific
- Emoji walls: max 3 emojis per post

### Required
- Specific commands: `npx tolongssin init` not "just run the init command"
- Honest limitations: "It won't do X yet" is fine
- Real file names and config keys from the actual project
- GitHub repo link in CTAs — use the link the user provided; if none was given, ask for it rather than writing a placeholder URL