"""
Build the full HTML digest page.
"""
from datetime import datetime, timedelta
import pytz

IST = pytz.timezone("Asia/Kolkata")

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #eef0f5; color: #1a1a2e; padding: 20px 16px; font-size: 14px; }
.container { max-width: 860px; margin: 0 auto; }

/* Header */
.header { background: linear-gradient(135deg, #0d1b4b 0%, #1a3a8f 60%, #1565c0 100%); color: #fff; border-radius: 14px; padding: 28px 32px 24px; margin-bottom: 16px; position: relative; overflow: hidden; }
.header::after { content: ''; position: absolute; right: -40px; top: -40px; width: 220px; height: 220px; background: rgba(255,255,255,0.04); border-radius: 50%; }
.header h1 { font-size: 1.55rem; font-weight: 800; letter-spacing: 0.3px; }
.header .subtitle { font-size: 0.88rem; opacity: 0.78; margin-top: 5px; }
.header .meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 16px; }
.header .meta-item { font-size: 0.78rem; opacity: 0.7; display: flex; align-items: center; gap: 5px; }

/* Market snapshot bar */
.snapshot { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }
.snap-card { background: #fff; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.snap-card .s-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.6px; color: #888; margin-bottom: 4px; }
.snap-card .s-val { font-size: 1.05rem; font-weight: 800; }
.snap-card .s-sub { font-size: 0.72rem; color: #999; margin-top: 2px; }
.up { color: #1b8a4a; } .down { color: #d32f2f; } .flat { color: #666; }

/* Sections */
.section { background: #fff; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); margin-bottom: 14px; overflow: hidden; }
.section-header { padding: 13px 20px; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: 0.2px; }
.section-body { padding: 4px 20px 16px; }

/* Section header colours */
.sh-green  { background: #e8f5e9; color: #1b5e20; border-left: 4px solid #43a047; }
.sh-red    { background: #ffebee; color: #b71c1c; border-left: 4px solid #e53935; }
.sh-orange { background: #fff3e0; color: #bf360c; border-left: 4px solid #fb8c00; }
.sh-blue   { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #1e88e5; }
.sh-purple { background: #f3e5f5; color: #4a148c; border-left: 4px solid #8e24aa; }
.sh-teal   { background: #e0f2f1; color: #004d40; border-left: 4px solid #00897b; }
.sh-indigo { background: #e8eaf6; color: #1a237e; border-left: 4px solid #3949ab; }

/* Mover cards */
.movers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 12px; }
.mover-card { border-radius: 8px; padding: 12px 14px; }
.mover-card.gain { background: #f1faf3; border: 1px solid #a5d6a7; }
.mover-card.loss { background: #fff5f5; border: 1px solid #ef9a9a; }
.mover-card .mc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.mover-card .mc-sym { font-weight: 800; font-size: 0.9rem; }
.mover-card.gain .mc-sym { color: #1b5e20; }
.mover-card.loss .mc-sym { color: #b71c1c; }
.mover-card .mc-pct { font-weight: 700; font-size: 0.9rem; padding: 2px 8px; border-radius: 12px; }
.mover-card.gain .mc-pct { background: #c8e6c9; color: #1b5e20; }
.mover-card.loss .mc-pct { background: #ffcdd2; color: #b71c1c; }
.mover-card .mc-price { font-size: 0.75rem; color: #777; }
.mover-card .mc-reason { font-size: 0.75rem; color: #555; margin-top: 6px; line-height: 1.45; font-style: italic; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 5px; }

/* News list */
ul.news { list-style: none; padding: 0; }
ul.news li { padding: 10px 0; border-bottom: 1px solid #f2f2f2; font-size: 0.85rem; line-height: 1.6; }
ul.news li:last-child { border-bottom: none; }
ul.news li:first-child { padding-top: 12px; }

/* Brokerage table */
.broker-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.82rem; }
.broker-table th { background: #f0f2f8; color: #444; font-weight: 700; padding: 8px 10px; text-align: left; border-bottom: 2px solid #dde1ef; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.4px; }
.broker-table td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
.broker-table tr:last-child td { border-bottom: none; }
.broker-table tr:hover td { background: #fafbff; }

/* Chips & tags */
.sym { font-weight: 700; background: #e8eaf6; color: #283593; padding: 2px 7px; border-radius: 4px; font-size: 0.78rem; }
.sym-red { background: #ffcdd2; color: #b71c1c; }
.sym-green { background: #c8e6c9; color: #1b5e20; }
.tag { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 4px; vertical-align: middle; letter-spacing: 0.2px; }
.tag-buy    { background: #c8e6c9; color: #1b5e20; }
.tag-sell   { background: #ffcdd2; color: #b71c1c; }
.tag-hold   { background: #fff9c4; color: #795548; }
.tag-div    { background: #e3f2fd; color: #0d47a1; }
.tag-bonus  { background: #f3e5f5; color: #6a1b9a; }
.tag-split  { background: #e8f5e9; color: #2e7d32; }
.tag-order  { background: #fff8e1; color: #e65100; }

.ban-chips { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 12px; }
.ban-chip { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; padding: 5px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.ban-note { font-size: 0.75rem; color: #999; margin-top: 10px; line-height: 1.5; }

/* Footer */
.footer { text-align: center; font-size: 0.72rem; color: #aaa; padding: 18px 0 6px; margin-top: 4px; line-height: 1.7; }
.footer a { color: #888; }

@media (max-width: 600px) {
  .movers-grid { grid-template-columns: 1fr; }
  .snapshot { grid-template-columns: 1fr 1fr; }
}
"""


def esc(s) -> str:
    s = str(s or "")
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def sym_tag(ticker: str, cls: str = "") -> str:
    extra = f" {cls}" if cls else ""
    return f'<span class="sym{extra}">{esc(ticker)}</span>'


def fmt_price(p) -> str:
    if p is None or p == "":
        return ""
    try:
        n = float(p)
        return f"{n:,.2f}"
    except (ValueError, TypeError):
        return str(p)


def pct_class(v) -> str:
    try:
        n = float(v)
        if n > 0:
            return "up"
        if n < 0:
            return "down"
    except (ValueError, TypeError):
        pass
    return "flat"


def _index_card(label: str, icon: str, index: dict | None) -> str:
    if index:
        last = index.get("last")
        p_change = index.get("pChange")
        change = index.get("change")
        cls = pct_class(p_change)
        sign = "+" if p_change is not None and float(p_change) > 0 else ""
        val = (
            f'<div class="s-val {cls}">{float(last):,.2f}</div>'
            f'<div class="s-sub {cls}">{sign}{float(p_change or 0):.2f}% ({sign}{fmt_price(change)})</div>'
        )
    else:
        val = '<div class="s-val flat">&mdash;</div>'
    return f'<div class="snap-card"><div class="s-label">{icon} {label}</div>{val}</div>'


def _build_snapshot(nifty_index: dict | None, sensex_index: dict | None, fii_dii: dict) -> str:
    nifty_card = _index_card("Nifty 50", "&#127754;", nifty_index)
    sensex_card = _index_card("Sensex", "&#128200;", sensex_index)

    fii_net = fii_dii.get("fii_net", "—")
    dii_net = fii_dii.get("dii_net", "—")

    def flow_card(label: str, icon: str, net) -> str:
        try:
            val = float(str(net).replace(",", ""))
            sign = "+" if val >= 0 else ""
            cls = "up" if val >= 0 else "down"
            return f'<div class="snap-card"><div class="s-label">{icon} {label}</div><div class="s-val {cls}">{sign}&#8377;{net} Cr</div><div class="s-sub">Net flow</div></div>'
        except (ValueError, TypeError):
            return f'<div class="snap-card"><div class="s-label">{icon} {label}</div><div class="s-val flat">&mdash;</div><div class="s-sub">Unavailable</div></div>'

    fii_card = flow_card("FII Flow", "&#127758;", fii_net)
    dii_card = flow_card("DII Flow", "&#127968;", dii_net)

    return f'<div class="snapshot">{nifty_card}{sensex_card}{fii_card}{dii_card}</div>'


def _build_gainers_section(gainers: list) -> str:
    if not gainers:
        return '<div class="section"><div class="section-header sh-green">&#128994; Top Gainers (Prev Session)</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No gainer data available.</p></div></div>'
    cards = []
    for s in gainers[:5]:
        pct = float(s.get("pChange", 0) or 0)
        sign = "+" if pct >= 0 else ""
        price = f"&#8377;{fmt_price(s.get('lastPrice'))}" if s.get("lastPrice") else ""
        reason = f'<div class="mc-reason">&#128269; {esc(str(s.get("reason",""))[:160])}</div>' if s.get("reason") else ""
        cards.append(f"""<div class="mover-card gain">
      <div class="mc-top">
        <span class="mc-sym">{esc(s.get("symbol",""))}</span>
        <span class="mc-pct">{sign}{pct:.2f}%</span>
      </div>
      <div class="mc-price">{price}</div>
      {reason}
    </div>""")
    return f"""
<div class="section">
  <div class="section-header sh-green">&#128994; Top Gainers &mdash; Previous Session</div>
  <div class="section-body"><div class="movers-grid">{"".join(cards)}</div></div>
</div>"""


def _build_losers_section(losers: list) -> str:
    if not losers:
        return '<div class="section"><div class="section-header sh-red">&#128308; Top Losers (Prev Session)</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No loser data available.</p></div></div>'
    cards = []
    for s in losers[:5]:
        pct = float(s.get("pChange", 0) or 0)
        price = f"&#8377;{fmt_price(s.get('lastPrice'))}" if s.get("lastPrice") else ""
        reason = f'<div class="mc-reason">&#128269; {esc(str(s.get("reason",""))[:160])}</div>' if s.get("reason") else ""
        cards.append(f"""<div class="mover-card loss">
      <div class="mc-top">
        <span class="mc-sym">{esc(s.get("symbol",""))}</span>
        <span class="mc-pct">{pct:.2f}%</span>
      </div>
      <div class="mc-price">{price}</div>
      {reason}
    </div>""")
    return f"""
<div class="section">
  <div class="section-header sh-red">&#128308; Top Losers &mdash; Previous Session</div>
  <div class="section-body"><div class="movers-grid">{"".join(cards)}</div></div>
</div>"""


def _build_brokerage_table(broker_calls: list) -> str:
    if not broker_calls:
        return '<div class="section"><div class="section-header sh-indigo">&#128203; Brokerage &amp; Analyst Calls</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No brokerage calls found for today.</p></div></div>'
    rows = []
    for r in broker_calls[:8]:
        rows.append(f"""<tr>
      <td style="font-weight:600;color:#283593;">{esc(r.get("stock","—"))}</td>
      <td style="text-transform:capitalize;">{esc(r.get("broker","—"))}</td>
      <td><span class="tag {r.get('action_tag','')}">{esc(r.get("action","—"))}</span></td>
      <td>{esc(r.get("target","—"))}</td>
      <td style="color:#555;">{esc(str(r.get("rationale",""))[:120])}</td>
    </tr>""")
    return f"""
<div class="section">
  <div class="section-header sh-indigo">&#128203; Brokerage &amp; Analyst Calls</div>
  <div class="section-body">
    <table class="broker-table">
      <thead><tr><th>Stock</th><th>Broker</th><th>Action</th><th>Target</th><th>Rationale</th></tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
</div>"""


def _build_corporate_actions_section(corporate_actions: list) -> str:
    items = []
    for a in corporate_actions[:10]:
        ticker = a.get("symbol", "")
        purpose = a.get("purpose") or a.get("subject") or "Action"
        date = a.get("exDate") or a.get("recordDate") or a.get("bcEndDate") or a.get("meetingDate") or ""
        date_str = f' &nbsp;<small style="color:#888;">Ex: {esc(date)}</small>' if date else ""
        pl = purpose.lower()
        if "dividend" in pl:
            tag_cls, tag_lbl = "tag-div", "DIV"
        elif "bonus" in pl:
            tag_cls, tag_lbl = "tag-bonus", "BONUS"
        elif "split" in pl:
            tag_cls, tag_lbl = "tag-split", "SPLIT"
        elif "results" in pl:
            tag_cls, tag_lbl = "tag-buy", "RESULTS"
        else:
            tag_cls, tag_lbl = "tag-div", "ACTION"
        items.append(f'<li>{sym_tag(ticker)} <span class="tag {tag_cls}">{tag_lbl}</span> {esc(purpose)}{date_str}</li>')

    body = f'<ul class="news">{"".join(items)}</ul>' if items else '<p style="color:#999;padding:12px 0;font-size:0.85rem;">No notable corporate actions in the next 7 days.</p>'
    return f"""
<div class="section">
  <div class="section-header sh-blue">&#128197; Corporate Actions &mdash; Dividends, Splits &amp; Bonuses</div>
  <div class="section-body">{body}</div>
</div>"""


def _build_news_section(news_items: list) -> str:
    if not news_items:
        return ""
    items = []
    for n in news_items[:10]:
        link = n.get("link", "")
        title = esc(n.get("title", ""))
        source = esc(n.get("source", ""))
        summary = esc(str(n.get("summary", ""))[:150])
        title_html = f'<a href="{esc(link)}" style="color:#1a237e;text-decoration:none;">{title}</a>' if link else title
        items.append(f'<li>{title_html}<br/><small style="color:#888;">{source}</small>{(" &mdash; " + summary) if summary else ""}</li>')
    return f"""
<div class="section">
  <div class="section-header sh-teal">&#128240; Market News</div>
  <div class="section-body"><ul class="news">{"".join(items)}</ul></div>
</div>"""


def _build_ban_section(ban_list: list) -> str:
    if not ban_list:
        return """
<div class="section">
  <div class="section-header sh-red">&#9888;&#65039; F&amp;O Ban Period</div>
  <div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No stocks in F&amp;O ban period today.</p></div>
</div>"""
    chips = "".join(f'<span class="ban-chip">{esc(s)}</span>' for s in ban_list)
    count = len(ban_list)
    return f"""
<div class="section">
  <div class="section-header sh-red">&#9888;&#65039; F&amp;O Ban Period &mdash; {count} stock{"s" if count > 1 else ""}</div>
  <div class="section-body">
    <div class="ban-chips">{chips}</div>
    <p class="ban-note">Stocks exceeding 95% of Market-Wide Position Limit (MWPL). No fresh positions allowed; existing positions can be closed only.</p>
  </div>
</div>"""


def _build_fallback_section(fallback_notes: list) -> str:
    if not fallback_notes:
        return ""
    items = "".join(f'<li style="color:#999;">&#9432; {esc(n)}</li>' for n in fallback_notes)
    return f"""
<div class="section">
  <div class="section-header sh-orange">&#128221; Data Source Notes</div>
  <div class="section-body"><ul class="news">{items}</ul></div>
</div>"""


def build_html(
    *,
    date_str: str,
    nifty_index: dict | None = None,
    sensex_index: dict | None = None,
    fii_dii: dict | None = None,
    gainers: list | None = None,
    losers: list | None = None,
    broker_calls: list | None = None,
    corporate_actions: list | None = None,
    news_items: list | None = None,
    ban_list: list | None = None,
    fallback_notes: list | None = None,
    universe_count: int = 0,
) -> str:
    gainers = gainers or []
    losers = losers or []
    broker_calls = broker_calls or []
    corporate_actions = corporate_actions or []
    news_items = news_items or []
    ban_list = ban_list or []
    fallback_notes = fallback_notes or []

    now_ist = datetime.now(IST)
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    month_names = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]
    full_date = f"{day_names[now_ist.weekday()]}, {now_ist.day} {month_names[now_ist.month - 1]} {now_ist.year}"

    yesterday = now_ist - timedelta(days=1)
    while yesterday.weekday() >= 5:
        yesterday -= timedelta(days=1)
    last_trading_day = f"{day_names[yesterday.weekday()]}, {yesterday.day} {month_names[yesterday.month - 1]} {yesterday.year}"

    universe_meta = f'<span class="meta-item">&#128202; {universe_count} F&amp;O stocks tracked</span>' if universe_count > 0 else ""

    header = f"""
<div class="header">
  <h1>&#128200; NSE F&amp;O Morning Digest</h1>
  <div class="subtitle">Your daily pre-market briefing for NSE F&amp;O stocks</div>
  <div class="meta">
    <span class="meta-item">&#128197; {full_date}</span>
    <span class="meta-item">&#9200; Generated 8:00 AM IST</span>
    <span class="meta-item">&#128218; Prev session: {last_trading_day}</span>
    {universe_meta}
  </div>
</div>"""

    snapshot = _build_snapshot(nifty_index, sensex_index, fii_dii or {})

    sections = "\n".join([
        _build_gainers_section(gainers),
        _build_losers_section(losers),
        _build_brokerage_table(broker_calls),
        _build_corporate_actions_section(corporate_actions),
        _build_news_section(news_items),
        _build_ban_section(ban_list),
        _build_fallback_section(fallback_notes),
    ])

    footer = f"""
<div class="footer">
  NSE F&amp;O Morning Digest &nbsp;&bull;&nbsp; Auto-generated at 8:00 AM IST &nbsp;&bull;&nbsp; {date_str}<br/>
  Data sourced from NSE India, RSS feeds. &nbsp;<em>Not investment advice. Verify before trading.</em>
</div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NSE F&amp;O Morning Digest &mdash; {date_str}</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">
{header}
{snapshot}
{sections}
{footer}
</div>
</body>
</html>"""
