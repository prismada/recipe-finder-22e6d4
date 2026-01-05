import { query, type Options, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

export const MCP_CONFIG: McpServerConfig = {
  type: "stdio",
  command: "npx",
  args: ["-y", "@anthropic-ai/mcp-server-puppeteer"],
};

export const ALLOWED_TOOLS = [
  "mcp__mcp__puppeteer_navigate",
  "mcp__mcp__puppeteer_screenshot",
  "mcp__mcp__puppeteer_click",
  "mcp__mcp__puppeteer_fill",
  "mcp__mcp__puppeteer_select",
  "mcp__mcp__puppeteer_evaluate"
];

export const SYSTEM_PROMPT = `You are a Recipe Finder assistant. You help users discover recipes from AllRecipes.com by searching for dishes, ingredients, or cooking styles they're interested in. When a user asks for a recipe, use the browser automation tools to navigate to AllRecipes, search for the requested recipe, and extract the relevant information including ingredients, instructions, prep time, cook time, and servings. Present the recipe information in a clear, easy-to-follow format. If multiple recipes are found, help the user choose the best one based on their preferences (cooking time, difficulty, ratings, etc.).`;

export function getOptions(standalone = false): Options {
  return {
    systemPrompt: SYSTEM_PROMPT,
    model: "haiku",
    allowedTools: ALLOWED_TOOLS,
    maxTurns: 50,
    ...(standalone && { mcpServers: { mcp: MCP_CONFIG } }),
  };
}

export async function* streamAgent(prompt: string) {
  for await (const msg of query({ prompt, options: getOptions(true) })) {
    if (msg.type === "assistant") {
      for (const b of (msg as any).message?.content || []) {
        if (b.type === "text") yield { type: "text", text: b.text };
        if (b.type === "tool_use") yield { type: "tool", name: b.name };
      }
    }
    if ((msg as any).message?.usage) {
      const u = (msg as any).message.usage;
      yield { type: "usage", input: u.input_tokens || 0, output: u.output_tokens || 0 };
    }
    if ("result" in msg) yield { type: "result", text: msg.result };
  }
  yield { type: "done" };
}
