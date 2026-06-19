"""
Market data via yfinance — works from any IP, no NSE session needed.
"""
import yfinance as yf
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}


def get_market_data() -> dict:
    """
    Fetch Nifty50, Sensex, BankNifty, USD/INR, Crude Oil, Gold via yfinance.
    Uses period='5d' so weekends/holidays don't break iloc[-2].
    Returns dict keyed by name; each value is {close, prev_close, change, pct_change, high, low} or None.
    """
    tickers = {
        "nifty50":   "^NSEI",
        "sensex":    "^BSESN",
        "banknifty": "^NSEBANK",
        "usdinr":    "USDINR=X",
        "crude":     "CL=F",
        "gold":      "GC=F",
    }
    results = {}
    for name, symbol in tickers.items():
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period="5d")
            if len(hist) >= 2:
                prev = hist.iloc[-2]
                curr = hist.iloc[-1]
                chg  = round(float(curr["Close"] - prev["Close"]), 2)
                pct  = round(chg / float(prev["Close"]) * 100, 2)
                results[name] = {
                    "close":      round(float(curr["Close"]), 2),
                    "prev_close": round(float(prev["Close"]), 2),
                    "change":     chg,
                    "pct_change": pct,
                    "high":       round(float(curr["High"]), 2),
                    "low":        round(float(curr["Low"]), 2),
                }
            else:
                results[name] = None
        except Exception as e:
            print(f"  yfinance {name} ({symbol}) failed: {e}")
            results[name] = None
    return results


def get_top_gainers_losers(n: int = 5) -> dict:
    """
    Batch-download all F&O stocks via yfinance and compute previous-session change.
    Returns {gainers: [...], losers: [...]}.
    """
    from src.fno_stocks import FNO_SYMBOLS

    symbols_yf = [s + ".NS" for s in FNO_SYMBOLS]

    try:
        data = yf.download(
            symbols_yf,
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
            threads=True,
        )
    except Exception as e:
        print(f"  yfinance batch download failed: {e}")
        return {"gainers": [], "losers": []}

    changes = []
    for sym in FNO_SYMBOLS:
        try:
            ticker = sym + ".NS"
            closes = data[ticker]["Close"].dropna()
            if len(closes) >= 2:
                prev_close = float(closes.iloc[-2])
                last_close = float(closes.iloc[-1])
                pct = round((last_close - prev_close) / prev_close * 100, 2)
                changes.append({
                    "symbol":     sym,
                    "ltp":        round(last_close, 2),
                    "prev_close": round(prev_close, 2),
                    "change":     round(last_close - prev_close, 2),
                    "pct_change": pct,
                    "reason":     "",
                })
        except Exception:
            continue

    changes.sort(key=lambda x: x["pct_change"], reverse=True)
    gainers = [c for c in changes if c["pct_change"] > 0][:n]
    losers  = list(reversed([c for c in changes if c["pct_change"] < 0]))[:n]
    return {"gainers": gainers, "losers": losers}


def get_fii_dii_data() -> dict:
    """
    Scrape FII/DII net flows from Trendlyne — not geo-blocked.
    Falls back to RSS article parsing if scraping fails.
    """
    # 1. Try Trendlyne
    try:
        resp = requests.get(
            "https://trendlyne.com/fii-dii-activity/",
            headers=HEADERS,
            timeout=15,
        )
        if resp.ok:
            soup = BeautifulSoup(resp.text, "lxml")
            rows = soup.select("table tbody tr")
            if rows:
                cells = rows[0].find_all("td")
                if len(cells) > 7:
                    return {
                        "fii_net": cells[3].text.strip(),
                        "dii_net": cells[7].text.strip(),
                        "source":  "Trendlyne",
                    }
    except Exception as e:
        print(f"  Trendlyne FII/DII failed: {e}")

    # 2. Parse from RSS articles
    return _fii_dii_from_rss()


def _fii_dii_from_rss() -> dict:
    """Parse FII/DII crore amounts from ET Markets / Moneycontrol RSS."""
    import re, feedparser

    RSS_SOURCES = [
        "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "https://economictimes.indiatimes.com/markets/rss.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
        "https://www.business-standard.com/rss/markets-106.rss",
        "https://www.livemint.com/rss/markets",
    ]

    FII_BUY  = re.compile(r'fii[s]?\s+(?:net\s+)?(?:buy|bought)[^\d]{0,30}(?:rs\.?\s*|₹)?([\d,]+)', re.I)
    FII_SELL = re.compile(r'fii[s]?\s+(?:net\s+)?(?:sell|sold)[^\d]{0,30}(?:rs\.?\s*|₹)?([\d,]+)', re.I)
    DII_BUY  = re.compile(r'dii[s]?\s+(?:net\s+)?(?:buy|bought)[^\d]{0,30}(?:rs\.?\s*|₹)?([\d,]+)', re.I)
    DII_SELL = re.compile(r'dii[s]?\s+(?:net\s+)?(?:sell|sold)[^\d]{0,30}(?:rs\.?\s*|₹)?([\d,]+)', re.I)

    def _parse(text):
        text = re.sub(r'<[^>]+>', ' ', text)
        fii = dii = None
        m = FII_BUY.search(text);  fii = float(m.group(1).replace(',','')) if m else fii
        m = FII_SELL.search(text); fii = -float(m.group(1).replace(',','')) if m else fii
        m = DII_BUY.search(text);  dii = float(m.group(1).replace(',','')) if m else dii
        m = DII_SELL.search(text); dii = -float(m.group(1).replace(',','')) if m else dii
        return fii, dii

    for url in RSS_SOURCES:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                text = entry.get("title","") + " " + entry.get("summary","")
                if "fii" not in text.lower():
                    continue
                fii, dii = _parse(text)
                if fii is not None and dii is not None:
                    return {"fii_net": round(fii, 2), "dii_net": round(dii, 2), "source": "RSS"}
        except Exception:
            continue

    return {"fii_net": "—", "dii_net": "—", "source": ""}
