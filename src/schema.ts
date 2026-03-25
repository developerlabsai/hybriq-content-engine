import { z } from "zod";

export const CodeSnippetSchema = z.object({
  label: z.string().min(1),
  file: z.string().min(1),
  language: z
    .enum(["typescript", "javascript", "yaml", "json", "bash"])
    .default("typescript"),
});

export const UseCaseConfigSchema = z.object({
  platform: z.enum([
    "slack",
    "hubspot",
    "jira",
    "confluence",
    "monday",
    "salesforce",
    "discord",
    "teams",
    "notion",
  ]),
  useCase: z.string().min(1),
  title: z.string().min(10).max(80),
  painPoint: z.string().min(20),
  solution: z.string().min(20),
  keywords: z.array(z.string()).min(2).max(8),
  codeSnippets: z.array(CodeSnippetSchema).optional(),
  scaffoldRepo: z.string().url(),
  ctaUrl: z.string().url(),
  author: z.string().default("HybrIQ Team"),
  category: z.string().default("Developer Tools"),
  estimatedReadTime: z.number().default(8),
});

export type UseCaseConfig = z.infer<typeof UseCaseConfigSchema>;
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;

export const OutputFormat = z.enum([
  "blog",
  "twitter",
  "linkedin",
  "devto",
  "all",
]);

export type OutputFormatType = z.infer<typeof OutputFormat>;
