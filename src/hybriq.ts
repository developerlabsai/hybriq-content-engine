import { HybrIQSDK } from "@hybriq/sdk";
import "dotenv/config";

export const hybriq = new HybrIQSDK({
  mode: "cloud",
  apiKey: process.env.HYBRIQ_API_KEY!,
  baseUrl: process.env.HYBRIQ_BASE_URL ?? "https://api.hybriq.dev",
  providers: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
  },
});
