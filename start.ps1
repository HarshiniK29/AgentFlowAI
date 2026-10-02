$ErrorActionPreference = "Stop"
Write-Host "Starting AgentFlow AI..." -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or not available in PATH. Install/start Docker Desktop first."
}

& docker compose up --build
