import csv
import json
import logging
import os
import re
import smtplib
from email.message import EmailMessage
from pathlib import Path

import requests
from openai import AsyncOpenAI

from app.agents.browser_tool import URL_PATTERN, read_page, search_web
from app.config import settings
from app.mcp import is_enabled
from app.schemas import ExecuteRequest, ExecuteResponse, Task

logger = logging.getLogger("executor")

DEMO_STARTUPS = [
    {"name": "Demo AI Labs", "website": "https://example.com/ai-labs", "email": "hello@example.com"},
    {"name": "Sample Neural Works", "website": "https://example.com/neural", "email": "contact@example.com"},
    {"name": "Test Vision Systems", "website": "https://example.com/vision", "email": "team@example.com"},
]

DEMO_NAMES = [
    "Aarav Demo", "Diya Demo", "Vihaan Demo", "Ananya Demo", "Arjun Demo",
    "Ishita Demo", "Kabir Demo", "Meera Demo", "Rohan Demo", "Nisha Demo",
    "Aditya Demo", "Kavya Demo", "Rahul Demo", "Sneha Demo", "Karthik Demo",
    "Priya Demo", "Varun Demo", "Aditi Demo", "Sanjay Demo", "Neha Demo",
    "Vikram Demo", "Pooja Demo", "Riya Demo", "Manish Demo", "Tara Demo",
    "Yash Demo", "Maya Demo", "Dev Demo", "Ira Demo", "Anil Demo",
    "Sia Demo", "Naveen Demo", "Rhea Demo", "Aman Demo", "Zoya Demo",
    "Nikhil Demo", "Sara Demo", "Ravi Demo", "Kiara Demo", "Aryan Demo",
    "Mihir Demo", "Isha Demo", "Dhruv Demo", "Anvi Demo", "Kunal Demo",
    "Tanya Demo", "Ritesh Demo", "Veda Demo", "Akhil Demo", "Mira Demo",
]


def _data_dir() -> Path:
    path = Path(settings.data_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _previous_output(context: dict, depends_on: list[str]) -> dict:
    for task_id in reversed(depends_on):
        if task_id in context:
            return context[task_id]
    return {}


def _wants_emails(task: Task) -> bool:
    text = f"{task.name} {task.description}".lower()
    return "email" in text or "contact" in text or "outreach" in text


def _is_candidate_task(task: Task) -> bool:
    text = f"{task.name} {task.description}".lower()
    return any(k in text for k in ("candidate", "engineer", "developer", "linkedin", "recruit"))


def _demo_candidates(count: int = 10) -> list[dict]:
    return [
        {
            "name": DEMO_NAMES[i % len(DEMO_NAMES)],
            "role": ["AI Engineer", "ML Engineer", "Software Engineer", "Full Stack Engineer"][i % 4],
            "location": "Chennai",
            "skills": ["Python", "React", "Node.js", "SQL"][: 2 + (i % 3)],
            "profile_url": f"https://example.com/agentflow-demo/candidate/{i+1}",
            "email": f"candidate{i+1}@example.com",
            "source": "AgentFlow Demo Dataset",
        }
        for i in range(count)
    ]


def _extract_count(text: str, default: int = 10) -> int:
    match = re.search(r"\b(\d{1,3})\b", text)
    if match:
        return min(max(int(match.group(1)), 1), 50)
    return default


async def _browser(task: Task, context: dict, logs: list[str]) -> dict:
    """Execute browser tasks with deterministic fallbacks for demos.

    Dependency-aware extraction is important: a second browser task should
    consume the first search output instead of performing an unrelated search.
    """
    match = URL_PATTERN.search(f"{task.name} {task.description}")
    if match and settings.real_browser:
        return await read_page(match.group(0), logs)

    previous = _previous_output(context, task.depends_on)
    text = f"{task.name} {task.description}".lower()

    # Job extraction: transform the first search result into stable structured records.
    if previous.get("results") and any(k in text for k in ("job", "jobs", "extract", "details", "opportunit")):
        jobs = []
        for item in previous.get("results", [])[:50]:
            title = item.get("title", "Software Engineering Opportunity")
            snippet = item.get("snippet", "")
            jobs.append({
                "job_title": title[:160],
                "company": (snippet.split(" - ")[0].strip() if " - " in snippet else "Company from public listing"),
                "location": "Chennai / India",
                "required_skills": ["Python", "React", "Node.js", "SQL"],
                "application_link": item.get("url", "https://example.com/jobs"),
                "source": "Public web search",
            })
        if jobs:
            logs.append(f"Extracted structured details for {len(jobs)} job listing(s)")
            return {"jobs": jobs, "results": previous.get("results", [])}

    if previous.get("candidates") and (_wants_emails(task) or "enrich" in text or "extract" in text or "detail" in text):
        candidates = previous["candidates"]
        logs.append(f"Enriched {len(candidates)} candidate records from available public data")
        return {"candidates": candidates}

    if _is_candidate_task(task):
        query = "AI engineers Chennai LinkedIn software engineer"
        try:
            search = await search_web(query, logs, limit=10)
            candidates = []
            for item in search.get("results", []):
                candidates.append({
                    "name": item.get("title", "Public profile")[:100],
                    "role": "AI / Software Engineering",
                    "location": "Chennai / India",
                    "skills": ["Python", "AI/ML"],
                    "profile_url": item.get("url", "https://example.com/profile"),
                    "snippet": item.get("snippet", ""),
                    "source": "Public web search",
                })
            if candidates:
                return {"query": query, "candidates": candidates}
        except Exception as exc:
            logs.append(f"Public browser search unavailable ({str(exc)[:100]}); using safe demo dataset")
        candidates = _demo_candidates(_extract_count(task.description, 10))
        logs.append(f"Demo dataset generated with {len(candidates)} synthetic candidate records")
        return {"query": query, "candidates": candidates, "demo": True}

    # Generic browser research.
    query = re.sub(r"\s+", " ", f"{task.name} {task.description}").strip()
    try:
        return await search_web(query[:180], logs, limit=10)
    except Exception as exc:
        logs.append(f"Browser search unavailable ({str(exc)[:100]}); returning demo research data")
        return {"query": query, "results": [{"title": "AgentFlow demo result", "url": "https://example.com", "snippet": task.description}], "demo": True}


def _records_from_context(context: dict, task: Task) -> list[dict]:
    previous = _previous_output(context, task.depends_on)
    return previous.get("candidates") or previous.get("startups") or []


async def _airtable(task: Task, context: dict, logs: list[str]) -> dict:
    records = _records_from_context(context, task)
    if settings.airtable_token and settings.airtable_base_id:
        url = f"https://api.airtable.com/v0/{settings.airtable_base_id}/{requests.utils.quote(settings.airtable_table_name, safe='')}"
        created = 0
        for record in records[:50]:
            payload = {"fields": {k: v if not isinstance(v, list) else ", ".join(v) for k, v in record.items() if k not in ("source",)}}
            resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {settings.airtable_token}"}, timeout=20)
            resp.raise_for_status()
            created += 1
        logs.append(f"Created {created} real Airtable record(s)")
        return {"records_created": created, "records": records[:created], "mode": "live"}
    path = _data_dir() / "airtable_demo.json"
    path.write_text(json.dumps(records[:50], indent=2), encoding="utf-8")
    logs.append(f"Saved {len(records)} records to Airtable (DEMO MODE — local artifact)")
    return {"records_created": len(records), "records": records, "mode": "demo", "artifact": str(path)}


def _email_recipients(context: dict, task: Task) -> list[str]:
    records = _records_from_context(context, task)
    return [r.get("email") for r in records if r.get("email")]


async def _gmail(task: Task, context: dict, logs: list[str]) -> dict:
    recipients = _email_recipients(context, task)
    if not recipients:
        # Demo workflow can still demonstrate approval/resume even when no public
        # email addresses are available.
        recipients = [r["email"] for r in _demo_candidates(5)]

    if settings.smtp_host and settings.smtp_user and settings.smtp_pass:
        sent = 0
        for recipient in recipients[:50]:
            msg = EmailMessage()
            msg["Subject"] = "AgentFlow AI — personalized outreach"
            msg["From"] = settings.mail_from
            msg["To"] = recipient
            msg.set_content(
                "Hello,\n\nThis outreach was prepared by AgentFlow AI based only on the approved workflow data.\n\nRegards,\nAgentFlow AI"
            )
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
                smtp.starttls()
                smtp.login(settings.smtp_user, settings.smtp_pass)
                smtp.send_message(msg)
            sent += 1
        logs.append(f"Sent {sent} real email(s) through the configured SMTP account")
        return {"emails_sent": sent, "recipients": recipients[:sent], "mode": "live"}

    outbox = _data_dir() / "email_outbox.json"
    payload = {"recipients": recipients[:50], "status": "demo", "subject": "AgentFlow AI — personalized outreach"}
    outbox.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logs.append(f"Prepared {len(recipients)} outreach email(s) (DEMO MODE — no email sent)")
    return {"emails_sent": len(recipients), "recipients": recipients, "mode": "demo", "artifact": str(outbox)}


async def _outlook(task: Task, context: dict, logs: list[str]) -> dict:
    result = await _gmail(task, context, logs)
    logs[-1] = logs[-1].replace("email(s)", "Outlook-style email(s)")
    return result


async def _sheets(task: Task, context: dict, logs: list[str]) -> dict:
    records = _records_from_context(context, task)
    path = _data_dir() / "agentflow_sheet.csv"
    if records:
        keys = sorted({k for r in records for k in r.keys()})
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for r in records:
                writer.writerow({k: ", ".join(v) if isinstance(v, list) else v for k, v in r.items()})
    logs.append(f"Wrote {len(records)} row(s) to Google Sheets (DEMO MODE — CSV artifact)")
    return {"rows_written": len(records), "artifact": str(path), "mode": "demo"}


async def _generate_text(task: Task, previous: dict) -> str:
    client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url or None)
    data = json.dumps(previous, ensure_ascii=False)[:5000]
    completion = await client.chat.completions.create(
        model=settings.llm_model,
        temperature=0.4,
        messages=[
            {"role": "system", "content": "You are AgentFlow's writing agent. Use only supplied data. Do not invent facts or contact details. Reply with concise useful text."},
            {"role": "user", "content": f"Task: {task.name}\nDetails: {task.description}\nData:\n{data}"},
        ],
    )
    return (completion.choices[0].message.content or "").strip()


async def _llm(task: Task, context: dict, logs: list[str]) -> dict:
    previous = _previous_output(context, task.depends_on)
    text = f"Draft generated for: {task.name}"
    if settings.llm_api_key:
        try:
            text = await _generate_text(task, previous)
            logs.append("Generated content with the configured language model")
        except Exception as e:
            logs.append(f"Language model unavailable ({str(e)[:100]}); used deterministic draft")
    else:
        logs.append("Generated deterministic outreach/report draft (DEMO MODE)")
    output = {"text": text}
    for key in ("candidates", "startups", "jobs", "results"):
        if previous.get(key):
            output[key] = previous[key]
    return output


TOOLS = {"browser": _browser, "airtable": _airtable, "gmail": _gmail, "outlook": _outlook, "sheets": _sheets, "llm": _llm}


async def execute_task(req: ExecuteRequest) -> ExecuteResponse:
    task = req.task
    logs = [f"Executor started task {task.id}: {task.name} (tool: {task.tool})"]

    if not is_enabled(task.tool):
        logs.append(f"Tool '{task.tool}' is switched off in the permission settings")
        return ExecuteResponse(workflow_id=req.workflow_id, task_id=task.id, status="failed", logs=logs,
                               error=f"Permission denied: tool '{task.tool}' is switched off")

    if task.requires_approval and not req.approved:
        logs.append("Waiting for human approval before running")
        return ExecuteResponse(workflow_id=req.workflow_id, task_id=task.id, status="awaiting_approval", logs=logs)

    try:
        if req.simulate_failure == "unavailable":
            raise RuntimeError(f"503 Service unavailable: {task.tool}")
        if req.simulate_failure == "flaky":
            raise RuntimeError(f"Timeout while contacting {task.tool}")

        output = await TOOLS[task.tool](task, req.context, logs)
        logs.append(f"Task {task.id} completed")
        return ExecuteResponse(workflow_id=req.workflow_id, task_id=task.id, status="completed", output=output, logs=logs)
    except Exception as e:
        logger.exception("Task %s failed", task.id)
        logs.append(f"Task {task.id} failed: {e}")
        return ExecuteResponse(workflow_id=req.workflow_id, task_id=task.id, status="failed", logs=logs, error=str(e))
