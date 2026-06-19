"""
NSE F&O Morning Digest — main entry point.
Collects data, builds HTML, saves to docs/, and emails a link.
"""
import os
import sys
from datetime import datetime
from pathlib import Path
import pytz

# Add repo root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.nse_ban import fetch_ban_list
from src.data.market_data import fetch_nifty_index, fetch_nifty_yfinance, fetch_fno_universe, fetch_gainers_losers
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

    fallback_notes: list[str] = []

    # 1. Nifty index
    nifty_index = None
    try:
        nifty_index = fetch_nifty_index()
        print(f"Nifty 50: {nifty_index['last']} ({nifty_index['pChange']}%)")
    except Exception as e:
        print(f"NSE Nifty fetch failed ({e}), trying yfinance...")
        try:
            nifty_index = fetch_nifty_yfinance()
            print(f"Nifty 50 (yfinance): {nifty_index['last']} ({nifty_index['pChange']}%)")
        except Exception as e2:
            print(f"yfinance Nifty also failed: {e2}")
            fallback_notes.append("Nifty 50: could not fetch index data.")

    # 2. F&O universe
    universe = []
    try:
        universe = fetch_fno_universe()
        print(f"F&O universe: {len(universe)} stocks fetched.")
    except Exception as e:
        print(f"F&O universe fetch failed ({e}).")
        fallback_notes.append("F&O universe: NSE blocked.")

    # 3. Gainers / Losers
    gainers: list = []
    losers: list = []
    try:
        gl = fetch_gainers_losers()
        gainers = gl.get("gainers", [])
        losers = gl.get("losers", [])
        print(f"Gainers: {len(gainers)}, Losers: {len(losers)}")
    except Exception as e:
        print(f"Gainers/losers fetch failed ({e}).")
        # Derive from universe as fallback
        if universe:
            sorted_u = sorted(universe, key=lambda x: float(x.get("pChange") or 0), reverse=True)
            gainers = [s for s in sorted_u if float(s.get("pChange") or 0) > 0][:10]
            losers = list(reversed([s for s in sorted_u if float(s.get("pChange") or 0) < 0][:10]))
            fallback_notes.append("Gainers/losers: derived from F&O universe data.")
        else:
            fallback_notes.append("Gainers/losers: no data available.")

    # 4. F&O ban list
    ban_list: list[str] = []
    try:
        ban_list = fetch_ban_list()
        print(f"F&O ban list: {len(ban_list)} stocks.")
    except Exception as e:
        print(f"Ban list fetch failed ({e}).")
        fallback_notes.append("F&O ban list: NSE blocked — verify at nseindia.com.")

    # 5. Corporate actions
    corporate_actions: list = []
    try:
        corporate_actions = fetch_corporate_actions()
        print(f"Corporate actions: {len(corporate_actions)} fetched.")
    except Exception as e:
        print(f"Corporate actions fetch failed ({e}).")
        fallback_notes.append("Corporate actions: NSE blocked.")

    # 6. News (RSS)
    news_items: list = []
    try:
        news_items = fetch_news(max_items=15)
        print(f"News items: {len(news_items)} fetched.")
    except Exception as e:
        print(f"News fetch failed ({e}).")

    # 7. Brokerage calls
    broker_calls: list = []
    try:
        broker_calls = fetch_brokerage_calls(date_str=date_iso)
        print(f"Brokerage calls: {len(broker_calls)} fetched.")
    except Exception as e:
        print(f"Brokerage calls fetch failed ({e}).")

    # 8. Build HTML
    html = build_html(
        date_str=date_str,
        nifty_index=nifty_index,
        gainers=gainers,
        losers=losers,
        broker_calls=broker_calls,
        corporate_actions=corporate_actions,
        news_items=news_items,
        ban_list=ban_list,
        fii_dii_summary="",
        fallback_notes=fallback_notes,
        universe_count=len(universe),
    )

    # 9. Save to docs/ and archive/
    docs_dir = Path(__file__).parent.parent / "docs"
    archive_dir = Path(__file__).parent.parent / "archive"
    docs_dir.mkdir(exist_ok=True)
    archive_dir.mkdir(exist_ok=True)

    (docs_dir / "index.html").write_text(html, encoding="utf-8")
    (archive_dir / f"{date_iso}.html").write_text(html, encoding="utf-8")
    print(f"Digest HTML saved to docs/index.html and archive/{date_iso}.html")

    # 10. Send email
    gmail_user = os.getenv("GMAIL_USER", "")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "")
    recipient = os.getenv("RECIPIENT_EMAIL", "Khushbanthia@gmail.com")
    if gmail_user and gmail_pass:
        try:
            send_link_email(date_str, recipient, gmail_user, gmail_pass)
        except Exception as e:
            print(f"Email failed: {e}")
            sys.exit(1)
    else:
        print("No Gmail credentials — skipping email.")
        sys.exit(1)


if __name__ == "__main__":
    main()
