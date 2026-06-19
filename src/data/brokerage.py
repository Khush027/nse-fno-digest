"""
Parse brokerage / analyst calls from news RSS feeds and NewsAPI.
Returns list of {stock, broker, action, target, rationale} dicts.
"""
import os
import re
import requests
import feedparser

BROKERS = [
    "kotak", "motilal", "icici", "emkay", "edelweiss", "axis", "goldman",
    "morgan stanley", "jefferies", "nomura", "clsa", "citi", "hsbc",
    "macquarie", "ubs", "bernstein", "nuvama", "sharekhan", "hdfc sec",
    "anand rathi", "prabhudas", "nirmal bang", "ventura",
]
BUY_WORDS = ["buy", "outperform", "overweight", "accumulate", "add", "positive", "upgrade"]
SELL_WORDS = ["sell", "underperform", "underweight", "reduce", "negative", "downgrade"]
HOLD_WORDS = ["hold", "neutral", "market perform", "equal weight"]

BROKERAGE_RSS = [
    "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
    "https://www.moneycontrol.com/rss/MCtopnews.xml",
]


def _parse_action(text: str) -> tuple[str, str]:
    """Return (action_label, css_tag) from text."""
    t = text.lower()
    if any(w in t for w in BUY_WORDS):
        return "BUY", "tag-buy"
    if any(w in t for w in SELL_WORDS):
        return "SELL", "tag-sell"
    if any(w in t for w in HOLD_WORDS):
        return "HOLD", "tag-hold"
    return "—", ""


def _parse_target(text: str) -> str:
    m = re.search(r"(?:target|tp|price target)[:\s]+(?:rs\.?|inr|₹)?\s*([\d,]+)", text, re.I)
    return f"₹{m.group(1)}" if m else "—"


def _parse_broker(text: str) -> str:
    t = text.lower()
    for b in BROKERS:
        if b in t:
            return b.title()
    return "—"


def _is_brokerage_news(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(w in text for w in BUY_WORDS + SELL_WORDS + HOLD_WORDS + ["brokerage", "analyst", "research"])


def fetch_brokerage_calls(date_str: str = "", max_items: int = 10) -> list[dict]:
    """
    Fetch brokerage calls from RSS + optional NewsAPI.
    Returns list of {stock, broker, action, target, rationale, title, link}.
    """
    items = []
    seen = set()

    # 1. RSS feeds
    for url in BROKERAGE_RSS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:20]:
                title = entry.get("title", "").strip()
                if not title or title in seen:
                    continue
                summary = entry.get("summary", "")
                import re as _re
                summary = _re.sub(r"<[^>]+>", "", summary).strip()
                if not _is_brokerage_news(title, summary):
                    continue
                seen.add(title)
                text = title + " " + summary
                action, tag = _parse_action(text)
                items.append({
                    "title": title,
                    "link": entry.get("link", ""),
                    "stock": title.split()[0] if title else "—",
                    "broker": _parse_broker(text),
                    "action": action,
                    "action_tag": tag,
                    "target": _parse_target(text),
                    "rationale": summary[:150],
                })
                if len(items) >= max_items:
                    break
        except Exception:
            continue
        if len(items) >= max_items:
            break

    # 2. NewsAPI fallback
    api_key = os.getenv("NEWS_API_KEY", "")
    if api_key and len(items) < max_items:
        try:
            resp = requests.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": "NSE brokerage analyst buy sell target",
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 10,
                    "apiKey": api_key,
                },
                timeout=10,
            )
            if resp.ok:
                for article in resp.json().get("articles", []):
                    title = (article.get("title") or "").strip()
                    if not title or title in seen:
                        continue
                    desc = article.get("description") or ""
                    text = title + " " + desc
                    action, tag = _parse_action(text)
                    seen.add(title)
                    items.append({
                        "title": title,
                        "link": article.get("url", ""),
                        "stock": title.split()[0],
                        "broker": _parse_broker(text),
                        "action": action,
                        "action_tag": tag,
                        "target": _parse_target(text),
                        "rationale": desc[:150],
                    })
        except Exception:
            pass

    return items[:max_items]
