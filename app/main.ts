import OpenAI from "openai";
import fs from "fs/promises";
import { execSync } from "child_process";
interface Message {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }[];
}
async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
  const messages: Message[] = [{ role: "user", content: prompt }];
  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "Write",
            description: "Write content to a file",
            parameters: {
              type: "object",
              required: ["file_path", "content"],
              properties: {
                file_path: {
                  type: "string",
                  description: "The path of the file to write to",
                },
                content: {
                  type: "string",
                  description: "The content to write to the file",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "Read",
            description: "Read and return the contents of a file",
            parameters: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "The path to the file to read",
                },
              },
              required: ["file_path"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "Bash",
            description: "Execute a shell command",
            parameters: {
              type: "object",
              required: ["command"],
              properties: {
                command: {
                  type: "string",
                  description: "The command to execute",
                },
              },
            },
          },
        },
      ],
    });
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: response.choices[0].message.tool_calls,
    });
    if (
      !response?.choices[0]?.message?.tool_calls ||
      response?.choices[0]?.message?.tool_calls?.length === 0
    ) {
      console.log(response.choices[0].message.content);
      return;
    }
    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }
    if (response?.choices[0]?.message?.tool_calls) {
      const toolCalls = response.choices[0].message.tool_calls;
      for (const call of toolCalls) {
        if (call.function.name === "Read") {
          const file_path = JSON.parse(call.function.arguments).file_path;
          const result = await fs.readFile(file_path, "utf8");
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }
        if (call.function.name === "Write") {
          const { file_path, content } = JSON.parse(call.function.arguments);
          await fs.writeFile(file_path, content, "utf8");
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content,
          });
        }
        if (call.function.name === "Bash") {
          const command = JSON.parse(call.function.arguments).command;
          try {
            const output = execSync(command, { encoding: "utf-8" });
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content:
                output || "(command executed successfully with no output)",
            });
          } catch (execError: any) {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: execError.stderr || execError.message,
            });
          }
        }
      }
    }
  }
}

main();
