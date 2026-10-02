# AgentFlow AI — 2-Minute Submission Runbook

## What to demonstrate

AgentFlow is a multi-agent automation platform:

**Goal → Planner → Executor → Validator → Recovery → Risk → Human Approval → Result**

### 1. Start

```powershell
docker compose up --build
```

Open `http://localhost`.

### 2. Login

Click **Launch 2-minute demo**. Demo mode creates a local demo account automatically.

### 3. Create the showcase workflow

Use:

> Find 50 AI engineers in Chennai, save them in Airtable, and send personalized outreach emails.

Click **Build workflow** and then execute it.

### 4. Explain the graph

Show:

- Planner decomposes the goal into five tasks.
- Executor runs browser/data/writing tools.
- Validator checks each result.
- Risk engine scores actions before execution.
- Recovery can retry or switch tools after failures.
- Email sending is blocked until human approval.

### 5. Approval

Open **Approval Center**.

Explain:

> “Sending external communication is a side-effect, so AgentFlow pauses and asks the human.”

Click **Approve**.

Return to Execution Monitor and show completion.

### 6. Show proof

Open:

- Execution timeline
- Validation confidence
- Risk scores
- Task graph
- Workflow History
- Analytics
- Agent Memory

## Safe demo behavior

The default stack does not send real emails or write to a real Airtable base. It creates local artifacts in the AI container's `/app/data`.

This is intentional: the architecture is demonstrated without creating unintended external side effects.

## Live integration mode

Provide these variables to enable real integrations:

```env
AIRTABLE_TOKEN=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=AgentFlow Leads

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=AgentFlow AI <no-reply@example.com>

LLM_API_KEY=
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-3.1-flash-lite
```

The email task remains approval-gated even when SMTP is configured.

## Judge explanation

> AgentFlow is not a chatbot. It is an orchestration layer for AI workers. A natural-language goal becomes a persistent task graph. Each task is executed through a tool boundary, validated, risk-scored and logged. If a task fails, the Recovery agent decides whether to retry, switch tools or escalate. Sensitive side effects pause for a human. The dashboard makes the whole process observable.

## Important accuracy

Do not claim that the demo sent real emails or created real Airtable records unless those credentials are configured and the external systems were visibly verified.
