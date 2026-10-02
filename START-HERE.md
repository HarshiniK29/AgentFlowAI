# AgentFlow AI — one-command local startup

## Requirements
- Windows 10/11
- Docker Desktop with WSL2 backend

## Start
Open PowerShell in this folder and run:

```powershell
docker compose up --build
```

Then open **http://localhost**.

The stack is safe by default: MongoDB runs locally, the AI service has deterministic demo fallbacks, and email/Airtable writes are simulated unless credentials are explicitly supplied.

## Stop
```powershell
docker compose down
```

## Fresh reset
If you previously ran another AgentFlow build and want a clean database:

```powershell
docker compose down -v
docker compose up --build
```

## Optional LLM
Set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` in `.env` to enable live planning/writing. The project still starts without them.

## Production
For an actual deployment, replace the local MongoDB service with MongoDB Atlas, use strong random JWT secrets, HTTPS, a managed secret store, restricted CORS, backups, and real external integration credentials.
