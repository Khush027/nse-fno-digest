"""
Fetch F&O ban list from NSE India.
Returns list of ticker strings currently in F&O ban period.
"""
import requests
from bs4 import BeautifulSoup

NSE_BASE = "https://www.nseindia.com"
TIMEOUT = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com",
}


def _get_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    try:
        s.get(NSE_BASE + "/", timeout=TIMEOUT)
    except Exception:
        pass
    return s


def fetch_ban_list() -> list[str]:
    """Return list of symbols in F&O ban period. Raises on failure."""
    session = _get_session()
    url = NSE_BASE + "/api/fo-ban-list"
    resp = session.get(url, timeout=TIMEOUT)
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    items = data.get("data") or data.get("banList") or (data if isinstance(data, list) else [])
    result = []
    for item in items:
        sym = item.get("tradingSymbol") or item.get("symbol") or item.get("Symbol") or ""
        if sym:
            result.append(sym)
    return result
