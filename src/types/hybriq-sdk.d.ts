/**
 * Minimal type declarations for @hybriq/sdk.
 * These types allow the scaffold to compile independently.
 * The full SDK provides additional features at runtime.
 */
declare module "@hybriq/sdk" {
  export interface HybrIQConfig {
    mode?: "cloud" | "local";
    apiKey?: string;
    baseUrl?: string;
    licenseKey?: string;
    providers?: {
      anthropic?: { apiKey: string };
      openai?: { apiKey: string };
    };
    debug?: boolean;
    timeout?: number;
    maxRetries?: number;
  }

  export interface ExecuteRequest {
    model: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    systemPrompt?: string;
    maxTokens?: number;
    metadata?: Record<string, unknown>;
  }

  export interface ExecuteResult {
    response: string;
    cacheHit: boolean;
    tokensIn: number;
    tokensOut: number;
    creditsCharged: number;
  }

  export class HybrIQSDK {
    constructor(config: HybrIQConfig);
    execute(request: ExecuteRequest): Promise<ExecuteResult>;
    get mode(): "cloud" | "local";
  }
}
