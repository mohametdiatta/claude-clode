import OpenAI from "openai";
import readline from "readline/promises";
import chalk from "chalk";

import { Read } from "./tools/read";
import { Write } from "./tools/write";
import { Bash } from "./tools/bash";

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

// Helper to get user input from stdin with a styled prompt
async function getUserInput(rl: readline.Interface): Promise<string> {
  // Display a green bold prompt with a little emoji
  const prompt = chalk.bold.green("❯ ");
  // readline.question accepts a string prompt; we can just write to stdout manually
  rl.output.write(prompt);
  return await rl.question("❯ ");
}

// Process tool calls returned by the model and append tool messages
async function handleToolCalls(
  toolCalls: Message["tool_calls"],
  messages: Message[],
): Promise<void> {
  if (!toolCalls) return;
  for (const call of toolCalls) {
    const args = JSON.parse(call.function.arguments);
    switch (call.function.name) {
      case "Read": {
        const result = await Read(args.file_path);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
        console.log(chalk.cyanBright(`📖 Read ${args.file_path}`));
        break;
      }
      case "Write": {
        await Write(args.file_path, args.content);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: args.content,
        });
        console.log(chalk.yellowBright(`✍️  Wrote to ${args.file_path}`));
        break;
      }
      case "Bash": {
        const output = Bash(args.command);
        messages.push({ role: "tool", tool_call_id: call.id, content: output });
        console.log(chalk.magentaBright(`💻 Executed: ${args.command}`));
        break;
      }
    }
  }
}

async function main() {
  const [, , flag, input] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Display a welcoming banner
  console.log(chalk.bold.blueBright("\n=== ZIndex Terminal Interface ===\n"));

  let userInput = input || (await getUserInput(rl));

  const client = new OpenAI({ apiKey, baseURL });
  const messages: Message[] = [{ role: "user", content: userInput }];

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-oss:120b-cloud",
      messages,
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
              required: ["file_path"],
              properties: {
                file_path: {
                  type: "string",
                  description: "The path to the file to read",
                },
              },
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

    const assistantMsg = response.choices[0].message;
    const toolCalls = assistantMsg.tool_calls;

    // Build the assistant message to store.
    // Only set tool_calls when they are present — sending tool_calls: undefined
    // alongside content: null produces the "invalid message content type: <nil>" error.
    const messageToStore: Message = {
      role: "assistant",
      content: assistantMsg.content ?? null,
    };
    if (toolCalls && toolCalls.length > 0) {
      messageToStore.tool_calls = toolCalls;
    }
    messages.push(messageToStore);

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls – display the assistant's answer with a nice style
      console.log(chalk.whiteBright(`\n🤖 ${assistantMsg.content}\n`));
      const nextInput = await getUserInput(rl);
      messages.push({ role: "user", content: nextInput });
      continue;
    }

    // There are tool calls – handle them and feed the results back to the model
    await handleToolCalls(toolCalls, messages);
  }
}

main();
