# AgentFlow API Reference

All `/api/*` endpoints except health require a valid access token unless explicitly listed otherwise.

## Authentication

Access token:
`Authorization: Bearer <token>`

Refresh token:
HttpOnly cookie `af_refresh`.

### POST /api/auth/register
```json
{"name":"Ada","email":"ada@example.com","password":"password123"}
```

### POST /api/auth/login
```json
{"email":"ada@example.com","password":"password123"}
```

### POST /api/auth/google
```json
{"credential":"<Google Identity Services ID token>"}
```

### POST /api/auth/refresh
Rotates the refresh session and returns a new access token.

### POST /api/auth/logout
Revokes the current refresh session.

## Workflow

### POST /api/workflow/create
```json
{"goal":"Find AI startups in Chennai, store them in Airtable and send outreach emails"}
```

### POST /api/workflow/execute
```json
{"workflowId":"<workflow id>"}
```

Optional demo failure simulation:
```json
{"workflowId":"<id>","simulate_failures":{"gmail":"unavailable"}}
```

### GET /api/workflow/history
Supports `page` and `limit`.

### GET /api/workflow/:id
Returns workflow, tasks, execution logs and approvals.

## Approvals

### GET /api/approval
Lists the authenticated user's approval requests.

### POST /api/approval/approve
```json
{"approvalId":"<id>","note":"Approved"}
```

This resumes the stored workflow state through Developer 2 `/agent/run`.

### POST /api/approval/reject
```json
{"approvalId":"<id>","note":"Do not send this campaign"}
```

## Analytics

### GET /api/analytics

Returns summary metrics, approval statistics, event counts and daily execution trend.

## AI gateway

The Node server consumes the Developer 2 API and can expose controlled authenticated gateway routes:

- `POST /api/agent/plan`
- `POST /api/agent/execute`
- `POST /api/agent/validate`
- `POST /api/agent/recover`
- `POST /api/risk/analyze`
- `POST /api/memory/store`
- `POST /api/memory/search`

The Developer 2 service key is never sent to the browser.
