[![progress-banner](https://backend.codecrafters.io/progress/claude-code/63da448d-0e3d-4251-8ca9-8525137b5abd)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

# Claude Code – AI Coding Assistant

This repository contains a **TypeScript** implementation of **Claude Code**, an AI‑powered coding assistant built on top of large language models (LLMs).  The project is the starter template for the [Build Your Own Claude Code challenge on CodeCrafters](https://codecrafters.io/challenges/claude-code).

---

## 📖 What you will find in this repo

| File / Directory | Description |
|-------------------|-------------|
| `app/main.ts`      | Entry point of the application. This file wires the LLM, the tool‑calling interface and the agent loop together. |
| `app/*`            | Helper modules that implement HTTP utilities, request/response models, and the tool‑calling logic. |
| `package.json`     | Project metadata and script shortcuts (`bun run start`, `codecrafters submit`, …). |
| `README.md`        | This documentation – a quick guide to get you up and running. |
| `tsconfig.json`    | TypeScript configuration used by **bun**. |

The code is deliberately minimal so you can focus on the challenge goals:

1. **Understanding tool calling** – how an LLM can invoke external functions.
2. **Building an agent loop** – keeping the conversation state and handling tool results.
3. **Integrating with an OpenAI‑compatible API** – sending prompts and receiving streamed responses.

---

## 🚀 Getting Started

### Prerequisites

- **Bun 1.3+** – fast JavaScript runtime (`npm i -g bun` if you don’t have it).
- An **OpenAI‑compatible API key** (or a local LLM server) that supports tool calling.

### Installation

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/yourusername/claude-code.git
cd claude-code

# Install dependencies with bun
bun install
```

### Running the program

```bash
# Run the main entry point. The script reads the OPENAI_API_KEY env var.
OPENAI_API_KEY=your-key bun run start
```

You should see a prompt where you can type a coding question; Claude Code will answer using the LLM and, when needed, will call the defined tools.

---

## 📦 Submitting to CodeCrafters

The challenge is split into stages.  After you have implemented the required
behaviour, submit your solution:

```bash
codecrafters submit
```

The command will upload your program, run the hidden tests and show you the
result.  Follow the feedback, adjust the code, and repeat until you pass all
stages.

---

## 🛠️ Project Structure

```
├─ app/
│  ├─ main.ts          # Entry point – sets up the agent loop
│  ├─ llm.ts           # Wrapper around the LLM API
│  ├─ tools/
│  │   ├─ readFile.ts  # Example tool – reads a file from the repo
│  │   └─ writeFile.ts # Example tool – writes a file to the repo
│  └─ utils.ts        # Helper functions (logging, env parsing)
├─ package.json
├─ tsconfig.json
└─ README.md
```

Feel free to add more tools in `app/tools/` – each tool must export a function
with a **JSON schema** describing its input parameters.  The LLM will call these
functions automatically when it thinks they are needed.

---

## 📚 Learning Resources

- **OpenAI Tool‑Calling docs** – https://platform.openai.com/docs/guides/function-calling
- **Bun documentation** – https://bun.sh/docs
- **CodeCrafters challenge description** – linked at the top of this file.

---

## 🙋‍♂️ Contributing & Issues

If you spot a bug or have a suggestion, please open an issue or submit a PR.  The
goal is to keep the starter template as clear as possible for newcomers.

---

*Happy hacking!*
