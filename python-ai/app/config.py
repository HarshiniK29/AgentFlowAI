from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Language model (any OpenAI-compatible provider: Gemini, Groq, OpenRouter, ...)
    llm_api_key: str = ""
    llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    llm_model: str = "gemini-3.1-flash-lite"

    service_api_key: str = "dev-secret-key"
    mock_tools: bool = True
    real_browser: bool = True
    browser_headless: bool = True
    # Optional real integrations. If omitted, safe demo adapters are used.
    airtable_token: str = ""
    airtable_base_id: str = ""
    airtable_table_name: str = "AgentFlow Leads"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    mail_from: str = "AgentFlow AI <no-reply@example.com>"
    data_dir: str = "/app/data"

    # Rate limits (requests per minute, per client address)
    rate_limit_per_minute: int = 60
    run_limit_per_minute: int = 10

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()