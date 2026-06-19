"""
Fetch market data: Nifty index, F&O universe, gainers/losers.
Falls back to yfinance when NSE API is blocked.
"""
import requests
import yfinance as yf
from datetime import datetime
import pytz

NSE_BASE = "https://www.nseindia.com"
TIMEOUT = 10
IST = pytz.timezone("Asia/Kolkata")

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


def fetch_nifty_index() -> dict:
    """Return {last, change, pChange} for Nifty 50. Raises on failure."""
    session = _get_session()
    resp = session.get(NSE_BASE + "/api/allIndices", timeout=TIMEOUT)
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    nifty = next((i for i in (data.get("data") or []) if i.get("index") == "NIFTY 50"), None)
    if not nifty:
        raise RuntimeError("BLOCKED")
    return {
        "last": nifty.get("last"),
        "change": nifty.get("variation"),
        "pChange": nifty.get("percentChange"),
    }


def fetch_nifty_yfinance() -> dict:
    """Fallback: fetch ^NSEI from yfinance."""
    ticker = yf.Ticker("^NSEI")
    hist = ticker.history(period="2d")
    if hist.empty:
        raise RuntimeError("yfinance returned empty data")
    closes = hist["Close"].tolist()
    last = closes[-1]
    prev = closes[-2] if len(closes) >= 2 else last
    change = last - prev
    pChange = (change / prev * 100) if prev else 0
    return {"last": round(last, 2), "change": round(change, 2), "pChange": round(pChange, 2)}


def fetch_fno_universe() -> list[dict]:
    """Return list of {symbol, lastPrice, pChange, totalTradedVolume}. Raises on failure."""
    session = _get_session()
    resp = session.get(
        NSE_BASE + "/api/equity-stockIndices?index=SECURITIES%20IN%20F%26O",
        timeout=TIMEOUT,
    )
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    if not data or not data.get("data"):
        raise RuntimeError("BLOCKED")
    return [
        {
            "symbol": item.get("symbol", ""),
            "lastPrice": item.get("lastPrice"),
            "pChange": item.get("pChange"),
            "totalTradedVolume": item.get("totalTradedVolume"),
        }
        for item in data["data"]
    ]


def _normalize_mover(item: dict) -> dict:
    """Normalize NSE mover item to consistent field names."""
    return {
        "symbol": item.get("symbol", ""),
        "lastPrice": item.get("ltp") or item.get("lastPrice") or item.get("last"),
        "pChange": float(item.get("perChange") or item.get("pChange") or item.get("percentChange") or 0),
        "prev_close": item.get("previousClose") or item.get("prevClose"),
        "reason": "",
    }


def _extract_list(data: dict) -> list:
    """Extract mover list from NSE response — handles both list and {data:[]} shapes."""
    raw = data.get("FO") or data.get("NIFTY") or data.get("ALL") or []
    if isinstance(raw, dict):
        raw = raw.get("data", [])
    return raw if isinstance(raw, list) else []


def fetch_gainers_losers() -> dict:
    """Return {gainers: [...], losers: [...]}. Raises on failure."""
    session = _get_session()
    g_resp = session.get(NSE_BASE + "/api/live-analysis-variations?index=gainers", timeout=TIMEOUT)
    l_resp = session.get(NSE_BASE + "/api/live-analysis-variations?index=loosers", timeout=TIMEOUT)
    if g_resp.status_code in (401, 403) or l_resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    gainers = [_normalize_mover(i) for i in _extract_list(g_resp.json())]
    losers = [_normalize_mover(i) for i in _extract_list(l_resp.json())]
    if not gainers and not losers:
        raise RuntimeError("EMPTY_RESPONSE")
    return {"gainers": gainers, "losers": losers}


def fetch_sensex_yfinance() -> dict:
    """Fetch Sensex from yfinance."""
    ticker = yf.Ticker("^BSESN")
    hist = ticker.history(period="2d")
    if hist.empty:
        raise RuntimeError("yfinance empty")
    closes = hist["Close"].tolist()
    last = closes[-1]
    prev = closes[-2] if len(closes) >= 2 else last
    change = last - prev
    pChange = (change / prev * 100) if prev else 0
    return {"last": round(last, 2), "change": round(change, 2), "pChange": round(pChange, 2)}


def fetch_fii_dii() -> dict:
    """Fetch FII/DII net flows from NSE. Returns {fii_net, dii_net} or raises."""
    session = _get_session()
    resp = session.get(NSE_BASE + "/api/fiidiiTradeReact", timeout=TIMEOUT)
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise RuntimeError("EMPTY")
    latest = data[0]
    return {
        "fii_net": latest.get("fiiNet") or latest.get("fii_net") or "—",
        "dii_net": latest.get("diiNet") or latest.get("dii_net") or "—",
        "date": latest.get("date", ""),
    }


def fetch_gainers_losers_yfinance(symbols: list[str]) -> dict:
    """Fallback: compute gainers/losers from yfinance data for given symbols."""
    results = []
    for sym in symbols[:50]:  # limit to avoid rate limiting
        try:
            t = yf.Ticker(sym + ".NS")
            hist = t.history(period="2d")
            if hist.empty or len(hist) < 2:
                continue
            closes = hist["Close"].tolist()
            last = closes[-1]
            prev = closes[-2]
            pchange = (last - prev) / prev * 100 if prev else 0
            results.append({"symbol": sym, "lastPrice": round(last, 2), "pChange": round(pchange, 2)})
        except Exception:
            continue
    results.sort(key=lambda x: x["pChange"], reverse=True)
    gainers = [r for r in results if r["pChange"] > 0][:10]
    losers = [r for r in results if r["pChange"] < 0][-10:][::-1]
    return {"gainers": gainers, "losers": losers}
