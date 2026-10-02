# AgentFlow AI — Developer 1 Platform

**From Intent to Action. Fully Autonomous.**

This repository completes the platform/orchestration side of AgentFlow AI around the supplied Developer 2 FastAPI agent service.

## Architecture

```text
Browser
  │ React + Tailwind + Redux + Framer + React Flow + Recharts
  ▼
Nginx
  ├── /api/* ───────────────► Node.js / Express / Socket.IO
  │                              │
  │                              ├── MongoDB (Atlas in production)
  │                              └── FastAPI AI service
  │                                   ├── Planner
  │                                   ├── Executor
  │                                   ├── Validator
  │                                   ├── Recovery
  │                                   ├── Risk
  │                                   └── Memory
  └── SPA assets
```

Developer 1 deliberately does **not** implement the AI agents. It consumes the existing AI service contract.

## Platform features

- Registration/login, JWT access tokens and rotating refresh sessions
- HttpOnly refresh-token cookie
- Google OAuth token verification
- Forgot/reset password
- Protected React routes
- Workflow creation and history
- Workflow execution through `/agent/run`
- Persistent tasks, execution logs, risks, validations and recovery data
- Human approval queue with approve/resume and reject
- Realtime Socket.IO workflow events
- React Flow execution visualizer
- Execution timeline
- Recharts analytics
- Agent memory inspector
- Profile, notification and API-key settings
- Docker Compose, Nginx and CI
- MongoDB schemas designed around user/workflow/task/approval/log/analytics growth

## API

### Auth
`POST /api/auth/register`
`POST /api/auth/login`
`POST /api/auth/google`
`POST /api/auth/refresh`
`POST /api/auth/logout`
`GET /api/auth/me`
`POST /api/auth/forgot-password`
`POST /api/auth/reset-password`
`GET /api/auth/sessions`
`DELETE /api/auth/sessions/:id`

### Workflow
`POST /api/workflow/create`
`POST /api/workflow/execute`
`GET /api/workflow/:id`
`GET /api/workflow/history`

### Approval
`GET /api/approval`
`POST /api/approval/create`
`POST /api/approval/approve`
`POST /api/approval/reject`

### Analytics
`GET /api/analytics`

### AI gateway
`POST /api/agent/plan`
`POST /api/agent/execute`
`POST /api/agent/validate`
`POST /api/agent/recover`
`POST /api/risk/analyze`
`POST /api/memory/store`
`POST /api/memory/search`

## Local development

### 1. AI service

```powershell
cd python-ai
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --port 8000
```

Use `SERVICE_API_KEY=agentflow-dev-key-123` for the supplied demo configuration.

### 2. Backend

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

Set `MONGODB_URI` to MongoDB Atlas or a local MongoDB instance.

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_GOOGLE_CLIENT_ID` if Google OAuth is enabled.

## Docker

Copy `.env.example` to `.env`, replace secrets, then:

```bash
docker compose up --build
```

Open `http://localhost`.

For production, use MongoDB Atlas rather than the local `mongo` service and provide strong random JWT secrets.

## Developer 2 contract

The supplied AI service exposes:

- `POST /agent/plan`
- `POST /agent/execute`
- `POST /agent/validate`
- `POST /agent/recover`
- `POST /agent/run`
- `POST /risk/analyze`
- `POST /memory/store`
- `POST /memory/search`

The platform's main execution path uses `/agent/run`. When the AI service returns `awaiting_approval`, the platform creates a persistent approval request. Approval sends the saved workflow state back to the AI service with the approved task ID so execution can resume.

## Realtime events

Client workflow rooms receive:

- `workflow-created`
- `workflow-running`
- `workflow-completed`
- `workflow-failed`
- `approval-created`

## Security notes

- AI service API key stays server-side.
- Refresh tokens are stored in HttpOnly cookies and hashed in MongoDB.
- Passwords use bcrypt.
- Password reset tokens are random, hashed, short-lived and single-use.
- Helmet, CORS and rate limiting are enabled.
- User ownership is checked on workflow/approval/settings queries.
- Production should use HTTPS, strict CORS, managed secrets, MongoDB Atlas IP controls, backups and centralized logs.

## Fastest submission demo

1. Start the stack with `docker compose up --build`.
2. Open `http://localhost`.
3. Click **Launch 2-minute demo** on the login page.
4. Open **Workflow Builder**.
5. Paste:

```text
Find 50 AI engineers in Chennai, save them in Airtable, and send personalized outreach emails.
```

6. Start the workflow.
7. Show the Planner → Executor → Validator → Recovery → Risk → Approval graph.
8. Open **Approval Center** and approve the outreach task.
9. Return to the execution screen and show completion, validation confidence, logs and analytics.

The default demo is safe: external writes are represented by local artifacts under the AI container's `/app/data`. This lets judges see the complete orchestration without sending real emails or modifying a real Airtable base.

## Optional live integrations

To perform real external writes, provide the corresponding credentials in `.env`:
- `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`

The email task always remains behind the human-approval gate.

## Demo workflow

```text
Find AI startups in Chennai, store them in Airtable and send outreach emails
```

With the supplied Developer 2 demo mode:

1. Planner creates the task graph.
2. Browser task produces demo startup records.
3. Airtable task stores mock records.
4. Email task is risk-scored and pauses for human approval.
5. Approval Center resumes execution.
6. Validator reports confidence.
7. Workflow, logs, risks and analytics are persisted.

The supplied Developer 2 tools are mock integrations until real MCP/Airtable/Gmail credentials and tool implementations are configured.
