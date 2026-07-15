# Understand-Anything MCP Server

This MCP Server bridges [uamcp/Understand-Anything-MCP](https://github.com/uamcp/Understand-Anything-MCP) with Claude Desktop and other MCP clients, giving LLMs native access to full-codebase structural graphs, architecture analysis, and CI/CD validation to prevent breaking changes.

## Privacy Policy
> [!IMPORTANT]
> **[Link to Privacy Policy](https://uamcp.github.io/Understand-Anything-MCP/)**
> 
> **Data Processing Details:**
> - License keys and email addresses are securely stored for billing purposes.
> - **Purely local, no network calls:** `ua_status`, `ua_scan`, `ua_graph_summary`, `ua_explain`, `ua_onboarding_doc`.
> - **Sends graph data to the backend (on both Free and Pro):** `ua_precheck`, `ua_find_callers`, `ua_impact_analysis`, `ua_rules`, `ua_ci_check`, `ua_validate_graph`. When these tools are used, the full local graph object is sent per request to our backend for processing, license, and quota validation.
> - **No source code contents are transmitted**, only graph metadata (file paths and import relationships). All backend graph processing is done purely in-memory per-request and is never persisted.

## Features
Most code intelligence tools tell your agent what's connected. `ua-mcp` tells your agent what it's allowed to change — and flags risky changes before they happen.
- **Advanced Context Analysis**: Export targeted contexts or the full graph for advanced LLM reasoning.
- **Open-source with Premium Tiers**: Free essential features, with advanced capabilities for Pro users.

> [!TIP]
> **System Instruction Recommended:** For the best experience, add the following to your AI assistant's system prompt or custom instructions:
> *"Always call `ua_precheck` before modifying any file in this project."*

## How it works
1. Your AI agent decides it wants to modify a critical file (e.g., `src/auth.ts`).
2. The agent (following its system instructions) triggers `ua_precheck` before making the edit to run an **Architectural Safety Linter**.
3. The server analyzes the graph to determine the "blast radius" and checks it against your rules.
4. If the blast radius is too large or violates a rule, a **Safety Checkpoint** (Elicitation Prompt) interrupts the agent, asking for your explicit confirmation before proceeding.

## Configuration Rules (.ua-rules.json)
You can define specific boundaries in a `.ua-rules.json` file in the root of your workspace to dictate what the LLM is allowed to touch.

```json
{
  // Understand-Anything Architectural Rules
  // Define constraints that agents and developers must respect.
  "rules": [
    {
      "id": "no-ui-db-import",
      "description": "UI layer must never import database layer directly",
      "from_pattern": "src/ui/**",
      "to_pattern": "src/db/**",
      "severity": "error"
    },
    {
      "id": "auth-required-for-payments",
      "description": "Payment modules must always be reachable from auth",
      "requires_path_through": "src/auth/**",
      "for_pattern": "src/payments/**",
      "severity": "error"
    }
  ]
}
```

## Quick Start (Onboarding)
`ua-mcp` is a lightweight reader that connects your AI assistant to your local Understand-Anything knowledge graph. It **does not** build the graph itself.

1. **Install and run the real Understand-Anything tool first:**
   Follow the installation instructions at [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) to install the core scanner. Run `/understand` via its native interface (in Claude Code, Cursor, Antigravity, Codex, etc.) to produce your `.ua/knowledge-graph.json` file. Commit this file to your repository.
2. **Install the MCP server globally:**
   ```bash
   npm install -g ua-mcp
   ```
3. **Connect the MCP to your project:**
   Configure your MCP client (see below) to run `ua-mcp`. The server will automatically read your `.ua/knowledge-graph.json` and instantly expose its context to your AI agent.

## Client Configuration
Add the following to your MCP client configuration file:

### Claude Desktop (`claude_desktop_config.json`)
Add the following to your Claude Desktop config file (usually `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "understand-anything": {
      "command": "npx",
      "args": ["-y", "ua-mcp"],
      "env": {
        "UA_PROJECT_PATH": "/path/to/your/project",
        "UA_LICENSE_KEY": "your_license_key_here"
      }
    }
  }
}
```

> [!WARNING]
> **Claude Desktop Bug (July 2026):** Claude Desktop currently has a bug where MCP elicitation requests (form prompts) silently auto-cancel instead of showing the dialog UI. If your agent says the precheck was cancelled without you seeing a prompt, this is a Claude Desktop client bug, not a server failure.

### Cursor
1. Go to **Settings > Features > MCP**.
2. Click **+ Add new MCP server**.
3. Name: `understand-anything`
4. Type: `command`
5. Command: `npx -y ua-mcp`

### Continue
Add to your `config.json` under `mcpServers`:
```json
"understand-anything": {
  "command": "npx",
  "args": ["-y", "ua-mcp"]
}
```

## Available Tools & Tiering

The Understand-Anything MCP Server operates on a tiered licensing model.

### Core Tools (Free Tier)
Available out of the box with no license required.
- `ua_precheck`: Pre-flight architectural risk check (10 checks/day, default critical-path rules only)
- `ua_status`: Returns MCP health status.
- `ua_scan`: Forces a re-scan of the workspace.
- `ua_graph_summary`: Returns aggregated node/edge statistics.
- `ua_architecture_report`: Groups files by top-level modules.
- `ua_dependency_report`: Identifies files with the most incoming dependencies (fan-in).
- `ua_explain`: Retrieves 1-hop dependencies for a specific file.
- `ua_onboarding_doc`: Generates onboarding context.

### Premium Tools (Pro Tier)
- `ua_precheck`: Unlimited pre-flight checks with configurable critical paths and .ua-rules.json enforcement
- `ua_rules`: Enforces custom `.ua-rules.json` boundaries.
- `ua_rules_check`: Mid-session continuous audit. Evaluates the .ua-rules.json constraints to ensure recent changes haven't introduced violations.
- `ua_find_callers`: Retrieves reverse dependencies up to 2 hops.
- `ua_impact_analysis`: Retrieves full transitive closure of reverse dependencies.
- `ua_validate_graph`: Checks the knowledge graph schema for corruption.
- `ua_ci_check`: Analyzes Git PR diffs for architectural impact.

> [!IMPORTANT]
> **The True Enforcement Backstop:** While local agents rely on system instructions to run `ua_precheck`, the `ua_ci_check` tool is designed to be your unbypassable safety net. 
> By running `ua_ci_check` in your GitHub Actions and [requiring it as a status check in GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging), you ensure that no rogue edits can ever be merged into production without explicit approval.

## Pricing

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 forever | Basic graph operations, local storage. |
| **Pro** | $10/month OR $50 one-time | Unlimited nodes, advanced graph analytics, rule enforcement, priority support. (Lifetime access limited availability) |

**Get your license key:**
- [Pro - Monthly ($10)](https://buy.stripe.com/7sYeVdaQW95GbBmaqj7bW01)
- [Pro - Lifetime ($50)](https://buy.stripe.com/dRmaEX8IO0zacFqfKD7bW00)

## Troubleshooting

- **Server fails to start**: Ensure you have Node.js v18 or later installed.
- **License key error**: Verify your key in the `.env` file or Claude config matches the one on your dashboard.
- **Path not found**: Ensure `UA_PROJECT_PATH` is absolute or resolves correctly relative to where the server runs.

## License
MIT License
