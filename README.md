# HybrIQ Content Engine

Automated blog and social content generation powered by [HybrIQ](https://hybriq.dev).

Generate publish-ready blog posts, Twitter threads, LinkedIn posts, and dev.to cross-posts from simple YAML configs. Every piece of content is generated through HybrIQ's AI execution engine — tracked, cached, and metered.

## Quick Start

### 1. Configure

```bash
cp .env.example .env
# Add your HybrIQ API key and Anthropic API key
```

### 2. Install

```bash
npm install
```

### 3. Generate content

```bash
# Preview the prompt (no LLM call):
npx tsx src/generate.ts --config use-cases/slack-qa-bot.yaml --format blog --dry-run

# Generate a blog post:
npx tsx src/generate.ts --config use-cases/slack-qa-bot.yaml --format blog

# Generate ALL formats at once:
npx tsx src/generate.ts --config use-cases/slack-qa-bot.yaml --format all
```

### 4. Review output

Generated content appears in `_output/`:
```
_output/
├── blog/2026-03-25-slack-qa-bot.md         # Full blog post with SEO frontmatter
├── twitter/2026-03-25-slack-qa-bot.txt     # 5-tweet thread
├── linkedin/2026-03-25-slack-qa-bot.txt    # LinkedIn post
├── devto/2026-03-25-slack-qa-bot.md        # dev.to cross-post with canonical URL
└── metadata/2026-03-25-slack-qa-bot-blog.json  # Generation cost & tracking
```

## YAML Config Format

```yaml
platform: slack
useCase: qa-bot
title: "Build an AI Q&A Bot for Slack in 5 Minutes"
painPoint: "Teams ask the same questions daily..."
solution: "A Slack bot that answers questions using HybrIQ..."
keywords:
  - "ai slack bot"
  - "slack ai assistant"
codeSnippets:
  - label: "Event Handler"
    file: "src/platform/bolt-app.ts"
scaffoldRepo: "https://github.com/developerlabsai/hybriq-slack-starter"
ctaUrl: "https://hybriq.dev/slack"
```

## Available Use Cases

### Slack
- `slack-qa-bot.yaml` — AI Q&A bot
- `slack-summarizer.yaml` — Channel summarizer
- `slack-ticket-router.yaml` — Ticket classifier
- `slack-incident-commander.yaml` — Incident management

### HubSpot
- `hubspot-lead-scorer.yaml` — AI lead scoring
- `hubspot-deal-summary.yaml` — Deal intelligence
- `hubspot-enrichment.yaml` — Contact enrichment
- `hubspot-email-drafter.yaml` — Follow-up email drafting

## Output Formats

| Format | Flag | Output | Description |
|--------|------|--------|-------------|
| Blog | `--format blog` | `.md` | 2,000-word tutorial with SEO frontmatter |
| Twitter | `--format twitter` | `.txt` | 5-tweet thread |
| LinkedIn | `--format linkedin` | `.txt` | Business-framed post |
| dev.to | `--format devto` | `.md` | Cross-post with canonical URL |
| All | `--format all` | All above | Single command, all formats |

## Cost

Each blog post costs approximately **$0.02** to generate (~2K tokens in, ~4K out). 36 posts = **$0.72 total**.

## License

MIT

---

Built with [HybrIQ](https://hybriq.dev) — the AI backend that gets cheaper the more you use it.
