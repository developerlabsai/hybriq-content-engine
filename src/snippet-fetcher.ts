import type { CodeSnippet } from "./schema.js";

/**
 * Fetch code snippets from a scaffold repo via GitHub raw URLs.
 * Constructs: https://raw.githubusercontent.com/{owner}/{repo}/main/{file}
 *
 * Per FR-021: On 404 or network error, warns and returns a placeholder
 * rather than failing the entire generation.
 */
export async function fetchSnippets(
  scaffoldRepoUrl: string,
  snippets: CodeSnippet[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Parse GitHub URL to construct raw URL
  // Input: https://github.com/developerlabsai/hybriq-slack-starter
  // Output base: https://raw.githubusercontent.com/developerlabsai/hybriq-slack-starter/main
  const match = scaffoldRepoUrl.match(
    /github\.com\/([^/]+)\/([^/]+)/
  );

  if (!match) {
    console.warn(
      `[snippet-fetcher] Cannot parse GitHub URL: ${scaffoldRepoUrl}. Skipping all snippets.`
    );
    for (const snippet of snippets) {
      results.set(snippet.label, `// Code snippet unavailable (invalid repo URL)`);
    }
    return results;
  }

  const [, owner, repo] = match;
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/main`;

  for (const snippet of snippets) {
    const url = `${rawBase}/${snippet.file}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `[snippet-fetcher] Failed to fetch ${snippet.file}: HTTP ${response.status}. Using placeholder.`
        );
        results.set(
          snippet.label,
          `// Code snippet unavailable (HTTP ${response.status})`
        );
        continue;
      }
      const code = await response.text();
      results.set(snippet.label, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[snippet-fetcher] Network error fetching ${snippet.file}: ${message}. Using placeholder.`
      );
      results.set(
        snippet.label,
        `// Code snippet unavailable (network error)`
      );
    }
  }

  return results;
}
