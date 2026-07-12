# Marketing Announcements Drafts

## GitHub Discussions
**Title:** Introducing ua-mcp: An Architectural Safety Linter that flags risky LLM edits before they happen 🚀

**Body:**
Hi everyone!
We're thrilled to announce the open-source release of **ua-mcp**, an MCP server that gives your AI assistant strict boundaries and blast-radius awareness.

**Why did we build this?**
Most code intelligence tools tell your agent what's connected. `ua-mcp` tells your agent what it's allowed to change — and flags risky changes before they happen. By analyzing your codebase's dependency graph in real-time, `ua-mcp` acts as an architectural safety linter.

**How it works:**
1. Tell your AI agent: "Always run ua_precheck before modifying files."
2. The agent triggers `ua_precheck` before making edits.
3. The server analyzes the graph to determine the "blast radius" and checks it against your custom `.ua-rules.json`.
4. If the blast radius is too large or violates a rule, a **Safety Checkpoint** (Elicitation Prompt) intercepts the agent, asking for your explicit human confirmation.

Check out the repository and let us know what you think! 
Quick start: `npm install -g ua-mcp`
You can plug it into Claude Desktop, Cursor, Continue, or any custom AI agent.

## Hacker News
**Title:** Show HN: ua-mcp – An MCP server to flag risky LLM edits on critical paths

**Body:**
Hey HN,
I've been frustrated by AI coding assistants blindly refactoring core files and breaking downstream dependencies they didn't know existed. Today I'm releasing `ua-mcp`, a Model Context Protocol (MCP) server that acts as an architectural safety linter for agents like Claude, Cursor, and Continue.

Instead of just feeding the LLM context, you instruct the agent to run a `ua_precheck` before editing files. It calculates the transitive closure of the dependency graph to determine the "blast radius" of the proposed change. If the change hits restricted files (defined in a `.ua-rules.json` file) or has a massive blast radius, it presents a Safety Checkpoint (elicitation prompt), asking for your explicit approval before proceeding. For a true unbypassable enforcement, you can hook the `ua_ci_check` tool into your GitHub Actions.

The core server is MIT licensed and free, with paid options for unlimited prechecks and advanced rule enforcement. I'd love to hear your feedback!

Repo: [Link]
Install: `npm install -g ua-mcp`

## r/ClaudeAI
**Title:** I built an MCP server that flags risky Claude edits before they happen 🛡️

**Body:**
Hey r/ClaudeAI,
I wanted to share a tool I just released called **ua-mcp**. It's an MCP server that you can plug directly into your Claude Desktop app to act as an architectural safety linter.

Instead of letting Claude blindly rewrite your auth logic or core database models, you instruct Claude to run a `ua_precheck` before making changes. It analyzes your codebase's dependency graph in real-time to calculate the "blast radius". If Claude tries to touch a sensitive file you've protected in your `.ua-rules.json`, the server intercepts Claude with a Safety Checkpoint and asks for your permission first!

**How to try it:**
1. Run `npm install -g ua-mcp`
2. Add the server to your `claude_desktop_config.json`
3. Add to Claude's custom instructions/project instructions: *"Always call ua_precheck before modifying any file."*
4. Tell Claude: "Refactor my auth file" and watch it get flagged by the linter! *(Note: If Claude says the precheck was cancelled but you never saw a prompt, you've hit the current Claude Desktop elicitation bug where forms silently auto-cancel. The safety check still correctly fired!)*

Let me know what you think!
