import re
from urllib.parse import quote_plus

from playwright.async_api import async_playwright

from app.config import settings

URL_PATTERN = re.compile(r"https?://[^\s\"\'<>]+")
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


async def search_web(query: str, logs: list[str], limit: int = 12) -> dict:
    """Search public web result metadata with a real headless browser.

    The function is intentionally defensive: selector changes, empty result pages,
    navigation timeouts and blocked search engines become structured empty results
    rather than crashing the entire workflow.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=settings.browser_headless)
        try:
            page = await browser.new_page()
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            logs.append(f"Searching the public web for: {query}")
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")

            items = await page.locator("div.result").all()
            results = []
            for item in items[:limit]:
                try:
                    link_locator = item.locator("a.result__a")
                    if await link_locator.count() == 0:
                        continue
                    link = await link_locator.get_attribute("href")
                    title = (await link_locator.inner_text()).strip()
                    snippet = ""
                    loc = item.locator(".result__snippet")
                    if await loc.count():
                        snippet = (await loc.inner_text()).strip()
                    if link and title:
                        results.append({"title": title, "url": link, "snippet": snippet})
                except Exception:
                    continue
            logs.append(f"Browser collected {len(results)} public search result(s)")
            return {"query": query, "results": results}
        finally:
            await browser.close()


async def read_page(url: str, logs: list[str]) -> dict:
    """Open a public page and return a bounded text/email extraction."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=settings.browser_headless)
        try:
            page = await browser.new_page()
            logs.append(f"Opening {url} in a real browser")
            await page.goto(url, timeout=20000, wait_until="domcontentloaded")
            title = await page.title()
            text = await page.inner_text("body")
            emails = sorted(set(EMAIL_PATTERN.findall(text)))
            logs.append(f"Read page '{title}' and found {len(emails)} email(s)")
            return {
                "url": url,
                "title": title,
                "text_preview": text[:2000],
                "emails_found": emails,
            }
        finally:
            await browser.close()
