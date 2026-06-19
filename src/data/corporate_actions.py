"""
Fetch upcoming corporate actions (dividends, splits, bonus, results) from NSE.
Falls back to empty list if NSE is blocked.
"""
import requests
from datetime import datetime, timedelta

NSE_BASE = "https://www.nseindia.com"
TIMEOUT = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com",
}

INTEREST_TYPES = ["dividend", "bonus", "split", "results", "board meeting", "agm", "egm", "rights"]


def _get_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    try:
        s.get(NSE_BASE + "/", timeout=TIMEOUT)
    except Exception:
        pass
    return s


def _fmt_date(d: datetime) -> str:
    return d.strftime("%d-%m-%Y")


def fetch_corporate_actions(days_ahead: int = 7) -> list[dict]:
    """Return upcoming corporate actions for next `days_ahead` days. Raises on failure."""
    session = _get_session()
    today = datetime.now()
    to_date = today + timedelta(days=days_ahead)
    url = (
        NSE_BASE
        + f"/api/corporates-corporateActions?index=equities"
        f"&from_date={_fmt_date(today)}&to_date={_fmt_date(to_date)}"
    )
    resp = session.get(url, timeout=TIMEOUT)
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    items = data if isinstance(data, list) else (data.get("data") or [])

    # Filter to interesting action types
    filtered = [
        item for item in items
        if any(t in (item.get("purpose") or item.get("subject") or "").lower() for t in INTEREST_TYPES)
    ]
    return filtered
