"""
Fetch F&O ban list. Primary: 5paisa (globally accessible). Fallback: NSE CSV.
"""
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def fetch_ban_list() -> list[str]:
    """Return list of symbols currently in F&O ban period."""
    # 1. Try 5paisa (not geo-blocked)
    try:
        resp = requests.get(
            "https://www.5paisa.com/nse-ban-list",
            headers=HEADERS,
            timeout=15,
        )
        if resp.ok:
            soup = BeautifulSoup(resp.text, "lxml")
            banned = []
            for row in soup.select("table tbody tr"):
                cells = row.find_all("td")
                if cells:
                    sym = cells[0].text.strip().upper()
                    if sym and sym.isalpha():
                        banned.append(sym)
            if banned:
                return banned
    except Exception as e:
        print(f"  5paisa ban list failed: {e}")

    # 2. Fallback: NSE archive CSV (works sometimes from non-Indian IPs)
    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        session.get("https://www.nseindia.com", timeout=10)
        resp = session.get(
            "https://nsearchives.nseindia.com/content/fo/fo_secban.csv",
            timeout=10,
        )
        if resp.ok:
            lines = resp.text.strip().split("\n")
            result = []
            for line in lines[1:]:
                parts = line.strip().split(",")
                if len(parts) >= 2:
                    sym = parts[1].strip()
                    if sym:
                        result.append(sym)
            return result
    except Exception as e:
        print(f"  NSE ban CSV fallback failed: {e}")

    return []
