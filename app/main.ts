import OpenAI from "openai";
import readline from "readline/promises";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import figlet from "figlet";

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

// Global context object that can be loaded from a file and queried.
let globalContext: Record<string, any> = {};

// Path to the Agent.md file (in the current working directory)
const AGENT_FILE = path.resolve(process.cwd(), "Agent.md");

// Load Agent.md content into the global context (if it exists)
async function loadAgentFile() {
  try {
    const content = await Read(AGENT_FILE);
    globalContext.agent = content;
    console.log(chalk.greenBright(`📄 Loaded Agent.md (${AGENT_FILE})`));
  } catch (e) {
    // Ignore missing file; will be created with `init` command.
  }
}

// Create a default Agent.md file with a brief project description.
async function initAgentFile() {
  const defaultContent = `# Agent.md\n\nThis project is a TypeScript‑based interactive terminal powered by OpenAI models.\nIt supports reading, writing, executing shell commands, loading JSON context, and querying that context.\n\nFeel free to edit this file to describe your own agent's purpose, capabilities, and configuration.\n`;
  await Write(AGENT_FILE, defaultContent);
  console.log(chalk.yellowBright(`🗒️  Created ${AGENT_FILE}`));
  // Load it into context immediately.
  globalContext.agent = defaultContent;
}

// Completer for readline – provides filename suggestions after '@'
function fileCompleter(line: string): [string[], string] {
  const atPos = line.lastIndexOf("@");
  if (atPos === -1) {
    return [[], line];
  }
  const prefix = line.slice(atPos + 1);
  const cwd = process.cwd();
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(cwd);
  } catch (e) {
    // ignore errors, return no completions
    return [[], line];
  }
  const hits = entries.filter((entry) => entry.startsWith(prefix));
  const completions = hits.map((hit) => line.slice(0, atPos + 1) + hit);
  return [completions, line];
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
        // If we just wrote Agent.md, refresh the context.
        if (path.resolve(args.file_path) === AGENT_FILE) {
          globalContext.agent = args.content;
          console.log(chalk.greenBright("🔄 Updated Agent.md in context"));
        }
        break;
      }
      case "Bash": {
        const output = Bash(args.command);
        messages.push({ role: "tool", tool_call_id: call.id, content: output });
        console.log(chalk.magentaBright(`💻 Executed: ${args.command}`));
        break;
      }
      case "LoadContext": {
        // Load a JSON (or plain text) file into the global context.
        try {
          const raw = await Read(args.file_path);
          try {
            globalContext = JSON.parse(raw);
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: `Context loaded from ${args.file_path}`,
            });
            console.log(
              chalk.greenBright(`🗂️  Context loaded (${args.file_path})`),
            );
          } catch (e) {
            // If parsing fails, store as raw string.
            globalContext = { raw } as any;
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: `Failed to parse JSON, stored raw content from ${args.file_path}`,
            });
            console.log(
              chalk.redBright(`⚠️  Failed JSON parse for ${args.file_path}`),
            );
          }
        } catch (e) {
          const errMsg = `Error loading context: ${e}`;
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: errMsg,
          });
          console.log(chalk.redBright(errMsg));
        }
        break;
      }
      case "QueryContext": {
        // Simple dot‑notation lookup on the loaded context.
        const pathStr: string = args.path;
        const parts = pathStr.split(".");
        let value: any = globalContext;
        for (const part of parts) {
          if (value && typeof value === "object" && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        const result =
          value === undefined
            ? `No value found for path '${pathStr}'`
            : JSON.stringify(value);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
        console.log(
          chalk.blueBright(`🔎 Queried context path '${pathStr}' -> ${result}`),
        );
        break;
      }
    }
  }
}

async function main() {
  const [, , flag, input] = process.argv;
  console.log({ flag, input });
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: fileCompleter,
  });
  // Command handling before entering the chat loop
  const handleSpecialCommand = async (cmd: string): Promise<boolean> => {
    const lc = cmd?.trim()?.toLowerCase();
    if (lc === "help") {
      console.log(
        chalk.cyanBright(
          `\nAvailable commands:\n  help          Show this help message\n  init          Create a default Agent.md in the current directory\n  exit / quit   Quit the interactive session\n  Any other input is sent to the AI model.\n`,
        ),
      );
      return true;
    }
    if (lc === "init") {
      await initAgentFile();
      return true;
    }
    if (lc === "exit" || lc === "quit") {
      console.log(chalk.gray("👋 Bye!"));
      process.exit(0);
    }
    return false;
  };

  // Display a welcoming banner
  const text = await figlet.text("\n Zi Code\n");

  console.log(chalk.bold.yellowBright(text));
  console.log(chalk.bold.yellowBright("your favorite agent tools \n"));

  await loadAgentFile();

  let userInput = "";
  if (flag) {
    await handleSpecialCommand(flag);
    userInput = await getUserInput(rl);
  } else {
    userInput = input || (await getUserInput(rl));
  }

  // If the first input is a special command, handle it and ask for a new one.
  while (await handleSpecialCommand(flag)) {
    userInput = await getUserInput(rl);
  }

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
        // New tool to load a JSON context file into memory
        {
          type: "function",
          function: {
            name: "LoadContext",
            description:
              "Load a JSON file and store its content as the global context",
            parameters: {
              type: "object",
              required: ["file_path"],
              properties: {
                file_path: {
                  type: "string",
                  description:
                    "Path to the JSON (or text) file to load as context",
                },
              },
            },
          },
        },
        // Tool to query the previously loaded context
        {
          type: "function",
          function: {
            name: "QueryContext",
            description:
              "Retrieve a value from the loaded context using dot notation",
            parameters: {
              type: "object",
              required: ["path"],
              properties: {
                path: {
                  type: "string",
                  description: "Dot‑separated path, e.g. 'user.name'",
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
    const messageToStore: Message = {
      role: "assistant",
      content: assistantMsg.content ?? null,
    };
    if (toolCalls && toolCalls.length > 0) {
      messageToStore.tool_calls = toolCalls as any;
    }
    messages.push(messageToStore);

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls – display the assistant's answer with a nice style
      console.log(chalk.whiteBright(`\n🤖 ${assistantMsg.content}\n`));
      // Prompt for next input (including handling special commands)
      let nextInput = await getUserInput(rl);
      while (await handleSpecialCommand(nextInput)) {
        nextInput = await getUserInput(rl);
      }
      messages.push({ role: "user", content: nextInput });
      continue;
    }

    // There are tool calls – handle them and feed the results back to the model
    await handleToolCalls(toolCalls, messages);
  }
}

main();
