<!-- GEMINI CONVERSION INSTRUCTIONS
To convert this Markdown file to a Google Doc:
1. Open Google Docs and create a new blank document
2. Copy all content below this instruction block
3. Use Gemini in Google Docs (or paste the .md content)
4. Ask Gemini: "Convert this Markdown to a well-formatted Google Doc.
   Preserve all: headings, tables, code blocks (use monospace font +
   light gray background), callout boxes (use bordered text boxes),
   bullet lists, and bold/italic formatting. Replace [imageN] placeholders
   with centered image placeholders."
5. Review and adjust: ensure code blocks have gray backgrounds,
   tables have borders, and callout boxes have the ℹ️ icon styling.
6. Add screenshots at each [imageN] placeholder location.
-->

# Claude Code Tutorial — Sentinel KYC Compliance Dashboard

**A step-by-step guide using a full-stack KYC compliance application**

---

## Prerequisites

- Claude Code installed and set up ([docs.anthropic.com/en/docs/claude-code](https://docs.anthropic.com/en/docs/claude-code))
- Python 3.11+ installed
- A code editor (VS Code recommended)
- Docker installed (for PostgreSQL — one command, see Step 3)

> **Permissions**: Claude Code asks for approval before taking actions like running commands or editing files. Press **Enter** to approve, or **Escape** to deny. You can set up auto-approvals in `.claude/settings.json` to skip repetitive prompts — we'll cover this later.

---

## Step 1: Clone the Repository

**What you'll learn**: Project setup with Claude Code

Clone the Sentinel KYC compliance dashboard app and create a working branch:

**Option 1 — Git (recommended)**

```bash
git clone git@github.com:beck-source/sentinel-kyc.git
cd sentinel-kyc && git checkout -b new_features
```

**Option 2 — Download ZIP**

Download from the GitHub repo page, unzip, and `cd` into the directory. Then initialize a branch:

```bash
git init && git add -A && git commit -m "initial commit"
git checkout -b new_features
```

---

## Step 2: Launch Claude Code

**What you'll learn**: Starting Claude Code, selecting a model

Open your terminal inside the project directory and start Claude Code:

```bash
claude
```

Once Claude Code is running, select your preferred model:

```
/model
```

Choose a model from the list. For this workshop, any model works well.

---

## Step 3: Run Sentinel KYC Locally

**What you'll learn**: Using Claude Code to install dependencies and start dev servers, exploring a real compliance application

### Start PostgreSQL

This app uses PostgreSQL for its database. Start it with a single Docker command (copy-paste this into your terminal before running Claude Code):

```bash
docker run -d --name sentinel-pg -e POSTGRES_USER=root -e POSTGRES_DB=app -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:16
```

> **Note**: If you already have PostgreSQL running locally on port 5432, you can skip the Docker command — the app connects to `postgresql://root@localhost:5432/app` by default.

### Install and Start

Paste the following prompt into Claude Code:

```
Install dependencies and start the development servers and open up the frontend and backend in my respective browser windows.
```

Claude will:
1. Install Python dependencies for the FastAPI backend (`pip install -r requirements.txt`)
2. Install Bun/npm dependencies for the React frontend (`bun install`)
3. Start the backend server on **port 8001**
4. Start the frontend dev server on **port 5173**

Approve the commands as Claude runs them. The database auto-seeds with **40 realistic KYC customers** on first startup — no manual setup needed.

Once both servers are running, open **http://localhost:5173** in your browser.

### Explore the App

**Spend a few minutes clicking through each page to understand the application:**

- **Dashboard** — KPI cards (Reviews Due, High-Risk Rate, Open Alerts, Expiring Docs), risk distribution donut chart, alert trend bar chart, and a recent activity feed. Click any KPI card to deep-link to the relevant page with filters applied.
- **Customers** — Registry of 40 customers with risk tiers (High/Medium/Low), jurisdictions, KYC statuses, and assigned analysts. Click any row to see the full customer profile with five tabs: Overview, Documents, Alerts, Cases, and Timeline.
- **AML Alerts** — Alert queue with severity levels (Critical, High, Medium, Low) and status filters. Click an alert to see its details and transition its status (Open → Under Review → Resolved).
- **Documents** — Document verification tracking with expiry dates. Click a document to review its details and update verification status.
- **Cases** — Compliance case management. Click a case to view details, add investigation notes, and update case status.
- **Reports** — Quarterly compliance metrics table, alert resolution rate chart, SLA adherence chart, and an AI-powered compliance narrative generator.

> [image1] Dashboard page showing KPI cards, risk distribution chart, alert trend chart, and activity feed

### AI Features Demo

Sentinel KYC has **four built-in Claude AI features** for compliance workflows. Try them out:

1. Click the **key icon** in the header bar → enter your Anthropic API key (starts with `sk-ant-...`)
2. Navigate to any **customer detail page** → click **"AI Risk Assessment"** → watch the streaming AI analysis
3. Navigate to any **alert detail page** → click **"AI Triage"** → see the triage recommendation
4. Navigate to any **case detail page** → click **"AI Case Summary"** → see the investigation summary with copy-to-clipboard

These features demonstrate real-world AI integration in a compliance workflow — streaming responses, domain-specific prompts, and contextual data injection.

> **Tip**: If you don't have an API key, the AI buttons will show a prompt to configure one. The rest of the app works fully without it.

---

## Step 4: Edit the CLAUDE.md File

**What you'll learn**: Project context files, @-mentions, memory mode, three ways to edit instructions

Every Claude Code project can have a `CLAUDE.md` file that gives Claude persistent instructions about the project — coding conventions, architecture, and rules to follow.

> **Tip**: This project doesn't have a `CLAUDE.md` yet. Run `/init` to generate one automatically. Claude will explore the codebase and create a `CLAUDE.md` tailored to this project.

### @-file mentions

You can reference any file in your prompts using `@`. Try it:

```
Print out exactly what is in @CLAUDE.md
```

Claude reads the file and prints its contents. The `@` syntax works for any file in your project.

### Three ways to edit CLAUDE.md

**Method 1 — Prompt Claude to edit it**

```
Edit my CLAUDE.md file to add "Always document non-obvious logic changes with comments"
```

Claude opens the file, adds the instruction, and saves it.

**Method 2 — Memory mode (`#`)**

Type `#` at the Claude Code prompt to enter memory mode. Then type an instruction:

```
Always use descriptive variable names and avoid single-letter variables
```

Press Enter to save. Claude stores this in project memory, which persists across sessions.

**Method 3 — Edit directly**

Open `CLAUDE.md` in your text editor and make changes. Claude reads it at the start of every session.

---

## Step 5: Explore the Codebase

**What you'll learn**: Using Claude Code to understand and visualize a codebase

Ask Claude to investigate the project and generate an architecture overview:

```
I want to understand this codebase. Investigate the project and create a simple, professional HTML-based architecture page showing the system architecture, tech stack, and data flow. Then open the file.
```

Claude will:
1. Explore the directory structure
2. Read key files to understand the architecture
3. Generate an HTML page with a visual diagram showing the React 19 + TypeScript frontend, Vite proxy, FastAPI backend, PostgreSQL database, and Anthropic API integration
4. Open the file in your browser

This demonstrates how Claude Code can quickly onboard you to an unfamiliar codebase.

---

## Step 6: Build a Feature

**What you'll learn**: Plan Mode (Shift+Tab), iterative development, interactive feedback

This is the core of the workshop. You'll use **Plan Mode** to have Claude design a feature before implementing it, then iterate on the result.

### Enter Plan Mode

Press **Shift+Tab** twice to switch Claude into Plan Mode. In Plan Mode, Claude proposes a plan and waits for your approval before writing any code.

Choose **one** of the two feature options below.

---

### Option A: Risk Tier Override with Audit Trail

Build a feature that lets compliance analysts override a customer's risk tier with a mandatory justification, creating a full audit trail.

**Paste this prompt:**

```
Build a risk tier override feature on the Customer Detail page. It should have:
1. An "Override Risk Tier" button on the customer overview tab
2. A modal dialog where the analyst selects a new risk tier (High/Medium/Low)
3. A mandatory justification field (minimum 50 characters)
4. On submit, update the customer's risk tier and log the action to the activity feed

Use the AskUserQuestion tool!
```

Claude will present a plan. Review it — when it looks good, **accept the plan** and let Claude implement it.

Claude may ask you clarifying questions using the AskUserQuestion tool (e.g., "Should the override be reversible?" or "Should the justification be displayed on the timeline?"). Answer these as they come up.

**Test the feature** in your browser once Claude finishes — navigate to a customer detail page and try overriding the risk tier.

**Then iterate:**

```
Add a confirmation step before the override is applied, showing the current tier, the new tier, and the justification for the analyst to review before submitting.
```

---

### Option B: SaaS-Style UI Redesign

Transform the app's interface into a more polished, modern SaaS-style design using a reusable Claude Code skill.

**Part 1 — Create the skill**

```
/skill-creator

I want to build a skill that redesigns a React application's UI into a modern SaaS-style interface with consistent spacing, polished card layouts, and a professional look.
```

Claude will ask follow-up questions to build the skill. Answer them to shape the skill's behavior.

**Part 2 — Apply the skill**

```
Use the frontend-design skill to redesign this KYC compliance app with:
1. Clean, modern card layouts for all pages
2. Improved data table styling with better filters
3. Professional SaaS aesthetic

Use the AskUserQuestion tool!
```

Claude presents a plan. Accept it and let the implementation run.

**Then iterate:**

```
Add a collapsible sidebar with icons-only mode for smaller screens.
```

---

> **Tip**: When Claude's plan looks good, accept it and wait for the implementation to complete. Then test the changes in your browser at **http://localhost:5173**.

---

## Step 7: Context Management

**What you'll learn**: Managing the context window during long sessions

After building a feature, your context window may be filling up. Claude Code provides tools to manage this.

**Check context usage:**

```
/context
```

This shows a breakdown of how much context is being used by your conversation, files, and tools.

**Compact the context:**

```
/compact
```

This summarizes the conversation so far and clears older context, freeing up space for new work. Claude retains the key information.

**Full reset** (mention but don't run during the workshop):

```
/clear
```

This completely resets the conversation. Use it when starting a totally new task.

---

## Step 8: Add Playwright MCP

**What you'll learn**: MCP (Model Context Protocol), installing MCP servers, context budget awareness

**MCP servers** give Claude the ability to connect to external tools — things like browser automation, database access, or API integrations. Think of them as plugins that extend what Claude can do.

Enter Bash mode by pressing `!`, then run:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

This installs the Playwright MCP server, which gives Claude the ability to control a browser.

Now check the context impact:

```
/context
```

Notice how MCP servers consume some context budget for their tool definitions. This is a useful thing to be aware of when working with multiple MCP servers.

> **Note**: This repo has Playwright scaffolding in the `e2e/` directory, but the MCP server needs to be installed separately so Claude can use it interactively.

---

## Step 9: Use Playwright MCP to Test

**What you'll learn**: Browser testing via MCP

Restart Claude Code to pick up the MCP configuration:

```
/exit
```

```bash
claude
```

Verify the MCP server is loaded:

```
/mcp
```

You should see `playwright` listed. Now use it to test the app:

```
Use Playwright MCP to test the app:
1. Start the development servers
2. Navigate to localhost:5173
3. Take a screenshot of the dashboard
4. Click through to a customer detail page and verify the tabs load
5. Navigate to the alerts page and verify filters work
```

Claude will launch a browser, navigate through the app, take screenshots, and report what it finds. If anything looks wrong, keep iterating:

```
The customer detail page tabs seem slow. Can you take a closer screenshot and investigate the network requests?
```

---

## Step 10: Commit Your Changes

**What you'll learn**: Git operations through Claude Code

When you're happy with your changes, ask Claude to commit:

```
Can you please commit the changes you've made in this branch?
```

Claude will stage the changes, write a descriptive commit message, and create the commit. Review the commit message before approving.

---

## Additional Workflows

The steps above cover the core tutorial. Below are additional Claude Code features you can explore in the remaining time.

---

### Create a Subagent

Subagents are specialized Claude agents scoped to specific tasks.

View any existing agents:

```
/agents
```

**Try creating a new one.** For example, a Debugger subagent:

```
/agents

Create a new Debugger subagent that specializes in investigating runtime errors,
reading stack traces, and suggesting fixes. It should have access to Read, Grep,
Glob, and Bash tools.
```

Test it by explicitly calling the agent:

```
Use the debugger agent to investigate any console errors on the Dashboard page.
```

> **Further reading**: See the [Subagents documentation](https://docs.anthropic.com/en/docs/claude-code/sub-agents) for a step-by-step guide.

---

### Add a Code Formatting Hook

Hooks let Claude Code automatically run commands in response to specific events — like formatting code every time a file is edited.

**Install Prettier:**

```bash
npm install --save-dev prettier
```

**Configure the hook** using `/hooks` or add it manually to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

This runs Prettier on any file Claude edits or writes.

**Test the hook** by asking Claude to make an intentional formatting change:

```
Add an extra function to any TypeScript file with deliberately messy formatting
```

The hook should automatically clean it up after Claude writes the file.

---

### Install a Plugin

Plugins extend Claude Code with domain-specific workflows built by the community.

**Browse and add a plugin from the marketplace:**

```bash
/plugin marketplace add https://github.com/aws-solutions-library-samples/guidance-for-claude-code-with-amazon-bedrock
```

**Install a specific workflow from the plugin:**

```
/plugin install epcc-workflow
```

**Use the plugin's workflow:**

```
/epcc-code Add a PDF export button to the reports page
```

Plugins bundle slash commands, skills, and conventions into a single installable package — useful for standardizing workflows across a team.

---

### Create an Agent Skill

Skills are reusable instruction sets that teach Claude specialized tasks.

```
/skill-creator
```

Then describe what you want:

```
I want to build a skill that analyzes React component structure and suggests
optimizations for performance and code reuse
```

Answer Claude's follow-up questions to define the skill's scope and behavior. Claude will build and test the skill for you.

---

### Explore Additional MCP Servers

View your currently installed MCP servers:

```
/mcp
```

You can explore and install additional MCP servers for tools like databases, APIs, or cloud services. After installing a new server, restart Claude Code for it to take effect.

---

## Expert Challenge: PDF Report Export

**Mission**: The Reports page shows quarterly compliance metrics, charts, and AI narratives — but there's no way to export them. Build a PDF export feature.

### Step 1: Explore

Navigate to **http://localhost:5173/reports** in your browser. Notice:
- The quarterly metrics table with customer counts, alert volumes, and resolution rates
- The alert resolution rate chart and SLA adherence chart
- The AI-generated compliance narrative (if you've configured an API key)

There's no export functionality — the data lives only on screen.

### Step 2: Build It

Paste this prompt into Claude Code:

```
The Reports page (/reports) needs a PDF export feature. Add:
1. An "Export Report" button at the top of the Reports page
2. When clicked, generate a professional PDF containing the quarterly metrics table,
   chart summaries, and the AI compliance narrative
3. The PDF should include a header with "Sentinel KYC - Quarterly Compliance Report"
   and the current date
4. Download the PDF to the user's machine

Look at how the Reports page is currently built for reference.
```

### Step 3: Verify

Click the Export button and check the downloaded PDF. Does it include all the metrics, charts, and narrative? Iterate if needed:

```
The PDF is missing the chart visualizations. Can you render them as static images in the PDF?
```

---

## Appendix

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Something broke and you're stuck | Copy the full error message and paste it into Claude Code |
| Claude can't see what's on screen | Take a screenshot and paste it (**Ctrl+V** / **Cmd+V**) |
| Claude's response doesn't work | Iterate: describe what went wrong and what you expected |
| Claude is struggling with a complex problem | Try `think harder` or `ultrathink` to trigger extended thinking |
| Need to see the full conversation | Press **Ctrl+O** to open the transcript viewer |
| Servers won't start | Run the start commands manually or kill ports: `lsof -ti:5173,8001 \| xargs kill -9` |
| PostgreSQL connection refused | Verify Docker container is running: `docker ps` — restart with `docker start sentinel-pg` |
| Database is empty (no customers) | Restart the backend — it auto-seeds on startup if the database is empty |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Approve a tool action |
| **Escape** | Deny / cancel |
| **Shift+Tab** | Toggle Plan Mode |
| **!** | Enter Bash mode (run shell commands) |
| **#** | Enter Memory mode |
| **@** | Reference a file |
| **Ctrl+O** | Open transcript viewer |
| **Ctrl+C** | Interrupt Claude |

### Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code Video Course](https://docs.anthropic.com/en/docs/claude-code/video-course)
