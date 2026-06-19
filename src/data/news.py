"""
Fetch NSE F&O relevant news via RSS feeds.
Returns list of {title, link, published, source} dicts.
"""
import feedparser
from datetime import datetime
import re

RSS_FEEDS = [
    ("Economic Times Markets", "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"),
    ("Moneycontrol News", "https://www.moneycontrol.com/rss/MCtopnews.xml"),
    ("Business Standard Markets", "https://www.business-standard.com/rss/markets-106.rss"),
    ("LiveMint Markets", "https://www.livemint.com/rss/markets"),
]

FNO_KEYWORDS = [
    "nifty", "sensex", "fno", "f&o", "futures", "options", "derivative",
    "bulk deal", "block deal", "brokerage", "target price", "buy call",
    "sell call", "upgrade", "downgrade", "dividend", "bonus", "split",
    "results", "earnings", "quarterly", "fii", "dii", "foreign investor",
]


def _is_relevant(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(kw in text for kw in FNO_KEYWORDS)


def fetch_news(max_items: int = 20) -> list[dict]:
    """Fetch and return relevant news items from RSS feeds."""
    seen_titles = set()
    items = []

    for source_name, url in RSS_FEEDS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                title = entry.get("title", "").strip()
                if not title or title in seen_titles:
                    continue
                summary = entry.get("summary", entry.get("description", ""))
                # Strip HTML tags from summary
                summary = re.sub(r"<[^>]+>", "", summary).strip()
                if not _is_relevant(title, summary):
                    continue
                seen_titles.add(title)
                items.append({
                    "title": title,
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "source": source_name,
                    "summary": summary[:200],
                })
                if len(items) >= max_items:
                    break
        except Exception:
            continue
        if len(items) >= max_items:
            break

    return items
