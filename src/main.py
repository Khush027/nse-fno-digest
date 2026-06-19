"""
NSE F&O Morning Digest — main entry point.
All market data sourced via yfinance / public RSS feeds (no NSE geo-blocking issues).
"""
import os
import sys
from datetime import datetime
from pathlib import Path
import pytz

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.nse_ban import fetch_ban_list
from src.data.market_data import get_market_data, get_top_gainers_losers, get_fii_dii_data
from src.data.news import fetch_news
from src.data.brokerage import fetch_brokerage_calls
from src.data.corporate_actions import fetch_corporate_actions
from src.render.html_builder import build_html

IST = pytz.timezone("Asia/Kolkata")
PAGES_URL = "https://khush027.github.io/nse-fno-digest/"


def _date_str(dt: datetime) -> str:
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return f"{dt.day:02d}-{months[dt.month-1]}-{dt.year}"


def send_link_email(date_str: str, to_email: str, gmail_user: str, gmail_pass: str) -> None:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    html = f"""<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f6f9;padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#0f0c29,#302b63);border-radius:8px;padding:20px 24px;margin-bottom:24px;color:#fff;">
        <h2 style="margin:0;font-size:1.2rem;">&#128200; NSE F&amp;O Morning Digest</h2>
        <p style="margin:6px 0 0;opacity:0.85;font-size:0.88rem;">{date_str} &mdash; Ready to read</p>
      </div>
      <p style="color:#444;font-size:0.95rem;margin-bottom:20px;">Your daily NSE F&amp;O digest is ready.</p>
      <a href="{PAGES_URL}" style="display:inline-block;background:#302b63;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View Today's Digest &rarr;</a>
      <p style="margin-top:16px;font-size:0.75rem;color:#bbb;">{PAGES_URL}</p>
    </div>
    </body></html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📈 NSE F&O Morning Digest — {date_str}"
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.ehlo()
        server.starttls()
        server.login(gmail_user, gmail_pass)
        server.sendmail(gmail_user, to_email, msg.as_string())
    print(f"Email sent to {to_email}")


def main() -> None:
    now = datetime.now(IST)
    date_str = _date_str(now)
    date_iso = now.strftime("%Y-%m-%d")

    print(f"NSE F&O Morning Digest — {date_str}")
    print("Collecting data...\n")

    # 1. Market data (yfinance — works globally)
    print("Fetching market data (yfinance)...")
    market = get_market_data()
    nifty    = market.get("nifty50")
    banknifty = market.get("banknifty")
    sensex   = market.get("sensex")
    print(f"  Nifty50:   {nifty and nifty['close']} ({nifty and nifty['pct_change']}%)")
    print(f"  Sensex:    {sensex and sensex['close']}")
    print(f"  BankNifty: {banknifty and banknifty['close']}")
    print(f"  USD/INR:   {market.get('usdinr') and market['usdinr']['close']}")
    print(f"  Crude:     {market.get('crude') and market['crude']['close']}")

    # 2. Gainers / Losers (yfinance batch — all 211 F&O stocks)
    print("\nFetching gainers/losers (yfinance batch)...")
    movers = get_top_gainers_losers(n=5)
    gainers = movers.get("gainers", [])
    losers  = movers.get("losers", [])
    print(f"  Gainers: {len(gainers)}, Losers: {len(losers)}")

    # 3. FII/DII (Trendlyne → RSS fallback)
    print("\nFetching FII/DII...")
    fii_dii = get_fii_dii_data()
    print(f"  FII: {fii_dii.get('fii_net')}  DII: {fii_dii.get('dii_net')}  [src: {fii_dii.get('source')}]")

    # 4. F&O ban list (5paisa → NSE CSV fallback)
    print("\nFetching F&O ban list...")
    ban_list = []
    try:
        ban_list = fetch_ban_list()
        print(f"  Banned: {ban_list or 'None'}")
    except Exception as e:
        print(f"  Ban list failed: {e}")

    # 5. Corporate actions (NSE API — may be empty if blocked)
    print("\nFetching corporate actions...")
    corporate_actions = []
    try:
        corporate_actions = fetch_corporate_actions()
        print(f"  Corporate actions: {len(corporate_actions)}")
    except Exception as e:
        print(f"  Corporate actions failed: {e}")

    # 6. News (RSS — always works)
    print("\nFetching news (RSS)...")
    news_items = []
    try:
        news_items = fetch_news(max_items=15)
        print(f"  News items: {len(news_items)}")
    except Exception as e:
        print(f"  News failed: {e}")

    # 7. Match move reasons from news
    all_text = [(n.get("title","") + " " + n.get("summary","")) for n in news_items]
    for mover in gainers + losers:
        sym = mover["symbol"]
        for text in all_text:
            if sym in text.upper():
                mover["reason"] = next((n["title"] for n in news_items if sym in (n.get("title","") + n.get("summary","")).upper()), "")
                break

    # 8. Brokerage calls (RSS)
    print("\nFetching brokerage calls...")
    broker_calls = []
    try:
        broker_calls = fetch_brokerage_calls(date_str=date_iso)
        print(f"  Brokerage calls: {len(broker_calls)}")
    except Exception as e:
        print(f"  Brokerage calls failed: {e}")

    # 9. Build HTML
    print("\nBuilding HTML...")
    html = build_html(
        date_str=date_str,
        nifty_index=_to_index_dict(nifty),
        banknifty_index=_to_index_dict(banknifty),
        sensex_index=_to_index_dict(sensex),
        market_extras=market,
        fii_dii=fii_dii,
        gainers=gainers,
        losers=losers,
        broker_calls=broker_calls,
        corporate_actions=corporate_actions,
        news_items=news_items,
        ban_list=ban_list,
        fallback_notes=[],
        universe_count=len(gainers) + len(losers),
    )

    # 10. Save
    docs_dir    = Path(__file__).parent.parent / "docs"
    archive_dir = Path(__file__).parent.parent / "archive"
    docs_dir.mkdir(exist_ok=True)
    archive_dir.mkdir(exist_ok=True)
    (docs_dir / "index.html").write_text(html, encoding="utf-8")
    (archive_dir / f"{date_iso}.html").write_text(html, encoding="utf-8")
    print(f"\nDigest saved → docs/index.html and archive/{date_iso}.html")

    # 11. Send email
    gmail_user = os.getenv("GMAIL_USER", "")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "")
    recipient  = os.getenv("RECIPIENT_EMAIL", "Khushbanthia@gmail.com")
    if gmail_user and gmail_pass:
        try:
            send_link_email(date_str, recipient, gmail_user, gmail_pass)
        except Exception as e:
            print(f"Email failed: {e}")
            sys.exit(1)
    else:
        print("No Gmail credentials — skipping email.")
        sys.exit(1)


def _to_index_dict(d: dict | None) -> dict | None:
    """Convert market_data dict keys to html_builder expected keys."""
    if not d:
        return None
    return {
        "last":    d.get("close"),
        "change":  d.get("change"),
        "pChange": d.get("pct_change"),
    }


if __name__ == "__main__":
    main()
