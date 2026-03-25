import "dotenv/config";
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";
import { UseCaseConfigSchema, OutputFormat } from "./schema.js";
import { fetchSnippets } from "./snippet-fetcher.js";
import { hybriq } from "./hybriq.js";
import type { UseCaseConfig, OutputFormatType } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─────────────────────────────────────────────
// Prompt & Template Loading
// ─────────────────────────────────────────────

function loadPrompt(format: string): string {
  const promptPath = join(ROOT, "prompts", `${format}-generator.md`);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return readFileSync(promptPath, "utf-8");
}

function loadTemplate(format: string): HandlebarsTemplateDelegate {
  const templatePath = join(ROOT, "templates", `${format}.hbs`);
  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  const source = readFileSync(templatePath, "utf-8");
  return Handlebars.compile(source);
}

// ─────────────────────────────────────────────
// Content Generation
// ─────────────────────────────────────────────

async function generateContent(
  config: UseCaseConfig,
  format: string,
  snippets: Map<string, string>,
  dryRun: boolean
): Promise<{ content: string; tokensIn: number; tokensOut: number; model: string }> {
  const systemPrompt = loadPrompt(format);

  // Build user context with config data and code snippets
  const snippetContext = Array.from(snippets.entries())
    .map(([label, code]) => `### ${label}\n\`\`\`typescript\n${code}\n\`\`\``)
    .join("\n\n");

  const userMessage = `Generate a ${format} about the following use case:

**Platform**: ${config.platform}
**Title**: ${config.title}
**Pain Point**: ${config.painPoint}
**Solution**: ${config.solution}
**Keywords**: ${config.keywords.join(", ")}
**Scaffold Repo**: ${config.scaffoldRepo}
**CTA URL**: ${config.ctaUrl}

## Code Snippets from the Scaffold

${snippetContext || "No code snippets provided."}`;

  if (dryRun) {
    console.log("═══ DRY RUN — Prompt Preview ═══\n");
    console.log("--- SYSTEM PROMPT ---\n");
    console.log(systemPrompt);
    console.log("\n--- USER MESSAGE ---\n");
    console.log(userMessage);
    console.log("\n═══ END DRY RUN ═══");
    return { content: "", tokensIn: 0, tokensOut: 0, model: "dry-run" };
  }

  // Call HybrIQ SDK (dogfooding!)
  const result = await hybriq.execute({
    model: "claude-sonnet-4-5-20250929",
    messages: [{ role: "user", content: userMessage }],
    systemPrompt,
    maxTokens: 4096,
    metadata: {
      source: "content-engine",
      agent: `${format}-generator`,
      platform: config.platform,
      useCase: config.useCase,
    },
  });

  return {
    content: result.response,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    model: "claude-sonnet-4-5-20250929",
  };
}

// ─────────────────────────────────────────────
// Output Rendering
// ─────────────────────────────────────────────

function renderOutput(
  format: string,
  config: UseCaseConfig,
  llmResponse: string,
  snippets: Map<string, string>
): string {
  const template = loadTemplate(format);

  // Parse JSON from LLM response
  let parsed: Record<string, unknown>;
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
      llmResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : llmResponse;
    parsed = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, use raw response as the main content
    console.warn("[generate] Could not parse LLM JSON response. Using raw text.");
    parsed = { introduction: llmResponse, problem: "", solution: "", benefits: "", nextSteps: "" };
  }

  const today = new Date().toISOString().split("T")[0];
  const metaDescription = config.title.length > 60
    ? config.title
    : `${config.title} — Learn how to build with HybrIQ`;

  // Build code blocks for templates
  const codeBlocks = Array.from(snippets.entries()).map(([label, code]) => ({
    label,
    code: code.length > 2000 ? code.slice(0, 2000) + "\n// ... (truncated)" : code,
    language: config.codeSnippets?.find((s) => s.label === label)?.language ?? "typescript",
  }));

  // Platform-specific prerequisite
  const platformPrereqs: Record<string, string> = {
    slack: "A Slack workspace where you can install apps",
    hubspot: "A HubSpot account with a Private App access token",
    jira: "An Atlassian account with Forge CLI installed",
    confluence: "An Atlassian account with Forge CLI installed",
    monday: "A Monday.com account with developer access",
    salesforce: "A Salesforce org with developer access",
  };

  const templateData = {
    ...config,
    date: today,
    metaDescription,
    canonicalUrl: `${config.ctaUrl}/blog/${config.platform}-${config.useCase}`,
    sections: parsed,
    tweets: parsed,
    post: (parsed as Record<string, string>).post ?? llmResponse,
    codeBlocks,
    platformPrerequisite: platformPrereqs[config.platform] ?? "",
    devtoTags: config.keywords.slice(0, 4),
  };

  return template(templateData);
}

// ─────────────────────────────────────────────
// Output Writing
// ─────────────────────────────────────────────

function writeOutput(
  content: string,
  format: string,
  config: UseCaseConfig,
  outputDir: string,
  meta: { tokensIn: number; tokensOut: number; model: string; costUsd: number }
): string {
  const today = new Date().toISOString().split("T")[0];
  const slug = `${config.platform}-${config.useCase}`;
  const ext = format === "twitter" || format === "linkedin" ? "txt" : "md";

  const formatDir = join(outputDir, format);
  mkdirSync(formatDir, { recursive: true });

  const outputPath = join(formatDir, `${today}-${slug}.${ext}`);
  writeFileSync(outputPath, content, "utf-8");

  // Write metadata
  const metadataDir = join(outputDir, "metadata");
  mkdirSync(metadataDir, { recursive: true });

  const metadata = {
    generatedAt: new Date().toISOString(),
    sourceConfig: `use-cases/${slug}.yaml`,
    format,
    model: meta.model,
    tokensIn: meta.tokensIn,
    tokensOut: meta.tokensOut,
    costUsd: meta.costUsd,
  };

  writeFileSync(
    join(metadataDir, `${today}-${slug}-${format}.json`),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );

  return outputPath;
}

// ─────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────

const program = new Command();

program
  .name("hybriq-content-engine")
  .description("Generate blog posts and social content from YAML use case configs")
  .requiredOption("--config <path>", "Path to YAML use case config file")
  .requiredOption("--format <format>", "Output format: blog, twitter, linkedin, devto, all")
  .option("--dry-run", "Display the prompt without calling the LLM", false)
  .option("--output-dir <dir>", "Output directory", "_output")
  .action(async (opts) => {
    const { config: configPath, format, dryRun, outputDir } = opts;

    // Validate format
    const formatResult = OutputFormat.safeParse(format);
    if (!formatResult.success) {
      console.error(`Invalid format: ${format}. Must be one of: blog, twitter, linkedin, devto, all`);
      process.exit(1);
    }

    // Load and validate YAML config
    if (!existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }

    const rawYaml = readFileSync(configPath, "utf-8");
    const parsed = parseYaml(rawYaml);
    const configResult = UseCaseConfigSchema.safeParse(parsed);

    if (!configResult.success) {
      console.error("Invalid YAML config:");
      for (const issue of configResult.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }

    const config = configResult.data;
    console.log(`\nGenerating ${format} content for: ${config.title}`);
    console.log(`Platform: ${config.platform} | Use case: ${config.useCase}\n`);

    // Fetch code snippets from scaffold repo
    const snippets = config.codeSnippets
      ? await fetchSnippets(config.scaffoldRepo, config.codeSnippets)
      : new Map<string, string>();

    if (snippets.size > 0) {
      console.log(`Fetched ${snippets.size} code snippet(s) from ${config.scaffoldRepo}`);
    }

    // Determine which formats to generate
    const formats: string[] =
      format === "all" ? ["blog", "twitter", "linkedin", "devto"] : [format];

    for (const fmt of formats) {
      console.log(`\n--- Generating ${fmt} ---`);

      try {
        const result = await generateContent(config, fmt, snippets, dryRun);

        if (dryRun) {
          continue;
        }

        const rendered = renderOutput(fmt, config, result.content, snippets);
        const estimatedCost = (result.tokensIn * 0.003 + result.tokensOut * 0.015) / 1000;

        const outputPath = writeOutput(rendered, fmt, config, outputDir, {
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          model: result.model,
          costUsd: estimatedCost,
        });

        console.log(`  Output: ${outputPath}`);
        console.log(`  Tokens: ${result.tokensIn} in / ${result.tokensOut} out`);
        console.log(`  Est. cost: $${estimatedCost.toFixed(4)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`  FAILED: ${message}`);

        // Save partial output on failure
        const today = new Date().toISOString().split("T")[0];
        const slug = `${config.platform}-${config.useCase}`;
        const partialDir = join(outputDir, "partial", `${today}-${slug}`);
        mkdirSync(partialDir, { recursive: true });
        writeFileSync(
          join(partialDir, `${fmt}-error.txt`),
          `Generation failed at ${new Date().toISOString()}\nFormat: ${fmt}\nError: ${message}\n\nTo resume, re-run with: --config ${configPath} --format ${fmt}`,
          "utf-8"
        );
        console.error(`  Partial output saved to: ${partialDir}`);
      }
    }

    if (!dryRun) {
      console.log("\nDone! Review generated content before publishing.");
    }
  });

program.parse();
