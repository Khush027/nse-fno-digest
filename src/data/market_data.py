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


def fetch_nifty_index(index_name: str = "NIFTY 50") -> dict:
    """Return {last, change, pChange} for the given NSE index. Raises on failure."""
    session = _get_session()
    resp = session.get(NSE_BASE + "/api/allIndices", timeout=TIMEOUT)
    if resp.status_code in (401, 403):
        raise RuntimeError("BLOCKED")
    resp.raise_for_status()
    data = resp.json()
    idx = next((i for i in (data.get("data") or []) if i.get("index") == index_name), None)
    if not idx:
        raise RuntimeError(f"Index '{index_name}' not found")
    return {
        "last": idx.get("last"),
        "change": idx.get("variation"),
        "pChange": idx.get("percentChange"),
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



def fetch_fii_dii() -> dict:
    """
    Fetch FII/DII net flows. Tries NSE API first; falls back to RSS article parsing.
    Returns {fii_net, dii_net, source} or raises.
    """
    # 1. Try NSE API (works if run from Indian IP / cowork)
    try:
        session = _get_session()
        resp = session.get(NSE_BASE + "/api/fiidiiTradeReact", timeout=TIMEOUT)
        if resp.ok:
            data = resp.json()
            if data:
                latest = data[0]
                fii = latest.get("fiiNet") or latest.get("fii_net")
                dii = latest.get("diiNet") or latest.get("dii_net")
                if fii is not None and dii is not None:
                    return {"fii_net": fii, "dii_net": dii, "source": "NSE"}
    except Exception:
        pass

    # 2. Parse from RSS news articles (works from GitHub Actions)
    return _fetch_fii_dii_from_rss()


def _fetch_fii_dii_from_rss() -> dict:
    """
    Scrape FII/DII crore figures from ET Markets / Moneycontrol RSS articles.
    These appear daily in market-wrap and pre-open reports.
    """
    import re, feedparser

    RSS_SOURCES = [
        "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "https://economictimes.indiatimes.com/markets/rss.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
        "https://www.business-standard.com/rss/markets-106.rss",
        "https://www.livemint.com/rss/markets",
    ]

    # Patterns that capture the sign and magnitude
    # Matches: "FIIs net sold/bought Rs 1,234 crore" or "FII: -1234 cr" etc.
    FII_BUY  = re.compile(r'fii[s]?\s+(?:net\s+)?(?:buy|bought|purchas)[^\d₹Rs]{0,30}(?:rs\.?\s*|₹\s*)?([\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)
    FII_SELL = re.compile(r'fii[s]?\s+(?:net\s+)?(?:sell|sold)[^\d₹Rs]{0,30}(?:rs\.?\s*|₹\s*)?([\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)
    DII_BUY  = re.compile(r'dii[s]?\s+(?:net\s+)?(?:buy|bought|purchas)[^\d₹Rs]{0,30}(?:rs\.?\s*|₹\s*)?([\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)
    DII_SELL = re.compile(r'dii[s]?\s+(?:net\s+)?(?:sell|sold)[^\d₹Rs]{0,30}(?:rs\.?\s*|₹\s*)?([\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)
    # Compact: "FII -1,234 cr" or "FII: +2,345 crore"
    FII_NET  = re.compile(r'\bfii[s]?[:\s]+([+-]?[\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)
    DII_NET  = re.compile(r'\bdii[s]?[:\s]+([+-]?[\d,]+\.?\d*)\s*(?:crore|cr\b)', re.I)

    def _parse(text):
        text = re.sub(r'<[^>]+>', ' ', text)  # strip HTML tags
        fii = dii = None

        m = FII_BUY.search(text)
        if m:
            fii = float(m.group(1).replace(',', ''))
        m = FII_SELL.search(text)
        if m:
            fii = -float(m.group(1).replace(',', ''))
        if fii is None:
            m = FII_NET.search(text)
            if m:
                fii = float(m.group(1).replace(',', ''))

        m = DII_BUY.search(text)
        if m:
            dii = float(m.group(1).replace(',', ''))
        m = DII_SELL.search(text)
        if m:
            dii = -float(m.group(1).replace(',', ''))
        if dii is None:
            m = DII_NET.search(text)
            if m:
                dii = float(m.group(1).replace(',', ''))

        return fii, dii

    for url in RSS_SOURCES:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                text = entry.get("title", "") + " " + entry.get("summary", "")
                if "fii" not in text.lower() and "dii" not in text.lower():
                    continue
                fii, dii = _parse(text)
                if fii is not None and dii is not None:
                    return {
                        "fii_net": round(fii, 2),
                        "dii_net": round(dii, 2),
                        "source": "RSS",
                    }
        except Exception:
            continue

    raise RuntimeError("FII/DII not found in any RSS source")


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
