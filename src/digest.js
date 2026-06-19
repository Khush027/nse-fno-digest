'use strict';

const CSS = `
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
`;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sym(ticker, cls = '') {
  return `<span class="sym${cls ? ' ' + cls : ''}">${esc(ticker)}</span>`;
}

function formatPrice(p) {
  if (p == null || p === '' || p === undefined) return '';
  const n = typeof p === 'number' ? p : parseFloat(p);
  return isNaN(n) ? String(p) : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctClass(v) {
  const n = parseFloat(v);
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}

function buildSnapshot(niftyIndex, fiiDiiSummary, niftyWebSummary) {
  const last = niftyIndex ? niftyIndex.last : null;
  const pChange = niftyIndex ? niftyIndex.pChange : null;
  const change = niftyIndex ? niftyIndex.change : null;

  const cls = pChange != null ? pctClass(pChange) : 'flat';
  const sign = pChange != null && parseFloat(pChange) > 0 ? '+' : '';

  const niftyVal = last != null
    ? `<div class="s-val ${cls}">${Number(last).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="s-sub ${cls}">${sign}${parseFloat(pChange || 0).toFixed(2)}% (${sign}${formatPrice(change)})</div>`
    : niftyWebSummary
      ? `<div class="s-val flat" style="font-size:0.75rem;">${niftyWebSummary.slice(0, 100)}</div>`
      : `<div class="s-val flat">—</div>`;

  // Parse FII/DII
  let fiiHtml = `<div class="s-val flat">—</div>`;
  let diiHtml = `<div class="s-val flat">—</div>`;
  if (typeof fiiDiiSummary === 'string' && fiiDiiSummary.length > 0) {
    const nums = fiiDiiSummary.match(/[−\-]?[\d,]+\.?\d*/g) || [];
    const cleaned = nums.filter(n => n.replace(/[,\-−]/g, '').length >= 3);
    if (cleaned.length >= 2) {
      const fiiNum = parseFloat(cleaned[0].replace(/[,−]/g, '').replace('−', '-'));
      const diiNum = parseFloat(cleaned[1].replace(/[,−]/g, '').replace('−', '-'));
      fiiHtml = `<div class="s-val ${fiiNum >= 0 ? 'up' : 'down'}">${fiiNum >= 0 ? '+' : ''}${cleaned[0]} Cr</div><div class="s-sub">Provisional</div>`;
      diiHtml = `<div class="s-val ${diiNum >= 0 ? 'up' : 'down'}">${diiNum >= 0 ? '+' : ''}${cleaned[1]} Cr</div><div class="s-sub">Provisional</div>`;
    } else {
      fiiHtml = `<div class="s-val flat" style="font-size:0.72rem;">${fiiDiiSummary.slice(0, 60)}</div>`;
    }
  }

  return `
<div class="snapshot">
  <div class="snap-card">
    <div class="s-label">&#127754; Nifty 50</div>
    ${niftyVal}
  </div>
  <div class="snap-card">
    <div class="s-label">&#128200; Sensex</div>
    <div class="s-val flat">See BSE</div>
    <div class="s-sub">bseindia.com</div>
  </div>
  <div class="snap-card">
    <div class="s-label">&#127758; FII Flow</div>
    ${fiiHtml}
  </div>
  <div class="snap-card">
    <div class="s-label">&#127968; DII Flow</div>
    ${diiHtml}
  </div>
</div>`;
}

function buildGainersSection(gainers) {
  if (!Array.isArray(gainers) || gainers.length === 0) {
    return `<div class="section"><div class="section-header sh-green">&#128994; Top Gainers (Prev Session)</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No gainer data available.</p></div></div>`;
  }
  const cards = gainers.slice(0, 5).map(s => {
    const pct = parseFloat(s.pChange || 0);
    const sign = pct >= 0 ? '+' : '';
    const price = s.lastPrice ? `&#8377;${formatPrice(s.lastPrice)}` : '';
    const reason = s.reason ? `<div class="mc-reason">&#128269; ${esc(s.reason.slice(0, 160))}</div>` : '';
    return `<div class="mover-card gain">
      <div class="mc-top">
        <span class="mc-sym">${esc(s.symbol)}</span>
        <span class="mc-pct">${sign}${pct.toFixed(2)}%</span>
      </div>
      <div class="mc-price">${price}</div>
      ${reason}
    </div>`;
  }).join('');
  return `
<div class="section">
  <div class="section-header sh-green">&#128994; Top Gainers &mdash; Previous Session</div>
  <div class="section-body"><div class="movers-grid">${cards}</div></div>
</div>`;
}

function buildLosersSection(losers) {
  if (!Array.isArray(losers) || losers.length === 0) {
    return `<div class="section"><div class="section-header sh-red">&#128308; Top Losers (Prev Session)</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No loser data available.</p></div></div>`;
  }
  const cards = losers.slice(0, 5).map(s => {
    const pct = parseFloat(s.pChange || 0);
    const price = s.lastPrice ? `&#8377;${formatPrice(s.lastPrice)}` : '';
    const reason = s.reason ? `<div class="mc-reason">&#128269; ${esc(s.reason.slice(0, 160))}</div>` : '';
    return `<div class="mover-card loss">
      <div class="mc-top">
        <span class="mc-sym">${esc(s.symbol)}</span>
        <span class="mc-pct">${pct.toFixed(2)}%</span>
      </div>
      <div class="mc-price">${price}</div>
      ${reason}
    </div>`;
  }).join('');
  return `
<div class="section">
  <div class="section-header sh-red">&#128308; Top Losers &mdash; Previous Session</div>
  <div class="section-body"><div class="movers-grid">${cards}</div></div>
</div>`;
}

function buildBrokerageTable(brokerCallResults) {
  if (!Array.isArray(brokerCallResults) || brokerCallResults.length === 0) {
    return `<div class="section"><div class="section-header sh-indigo">&#128203; Brokerage &amp; Analyst Calls</div><div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No brokerage calls found for today.</p></div></div>`;
  }

  const BROKERS = ['kotak', 'motilal', 'icici', 'emkay', 'edelweiss', 'axis', 'goldman', 'morgan', 'jefferies', 'nomura', 'clsa', 'citi', 'hsbc', 'macquarie', 'ubs', 'bernstein', 'nuvama', 'sharekhan', 'hdfc sec', 'anand rathi'];
  const BUYS = ['buy', 'outperform', 'overweight', 'accumulate', 'add', 'positive', 'upgrade'];
  const SELLS = ['sell', 'underperform', 'underweight', 'reduce', 'negative', 'downgrade'];

  const rows = brokerCallResults.slice(0, 8).map(r => {
    const text = (r.title + ' ' + r.snippet).toLowerCase();
    const broker = BROKERS.find(b => text.includes(b)) || '—';
    let action = '—';
    let actionTag = '';
    if (BUYS.some(b => text.includes(b))) { action = 'BUY'; actionTag = 'tag-buy'; }
    else if (SELLS.some(s => text.includes(s))) { action = 'SELL'; actionTag = 'tag-sell'; }
    else if (text.includes('hold') || text.includes('neutral')) { action = 'HOLD'; actionTag = 'tag-hold'; }

    // Extract a target price if present (e.g. "target 1200" or "TP: 850")
    const tpMatch = (r.title + ' ' + r.snippet).match(/(?:target|tp|price target)[:\s]+(?:rs\.?|inr|₹)?\s*([\d,]+)/i);
    const tp = tpMatch ? `&#8377;${tpMatch[1]}` : '—';

    const rationale = r.snippet ? esc(r.snippet.slice(0, 120)) : esc(r.title.slice(0, 120));

    return `<tr>
      <td style="font-weight:600;color:#283593;">${esc(r.title.split(' ')[0])}</td>
      <td style="text-transform:capitalize;">${esc(broker)}</td>
      <td><span class="tag ${actionTag}">${action}</span></td>
      <td>${tp}</td>
      <td style="color:#555;">${rationale}</td>
    </tr>`;
  }).join('');

  return `
<div class="section">
  <div class="section-header sh-indigo">&#128203; Brokerage &amp; Analyst Calls</div>
  <div class="section-body">
    <table class="broker-table">
      <thead><tr><th>Stock</th><th>Broker</th><th>Action</th><th>Target</th><th>Rationale</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
}

function buildCorporateActionsSection(corporateActions) {
  let items = [];
  const TYPES = ['dividend', 'bonus', 'split', 'results', 'board meeting', 'agm', 'egm', 'rights'];

  if (Array.isArray(corporateActions) && corporateActions.length > 0) {
    const filtered = corporateActions
      .filter(a => TYPES.some(t => (a.purpose || a.subject || '').toLowerCase().includes(t)))
      .slice(0, 10);

    for (const a of filtered) {
      const ticker = a.symbol || '';
      const purpose = a.purpose || a.subject || 'Action';
      const date = a.exDate || a.recordDate || a.bcEndDate || a.meetingDate || '';
      const dateStr = date ? ` &nbsp;<small style="color:#888;">Ex: ${esc(date)}</small>` : '';
      const pl = purpose.toLowerCase();
      let tagClass = 'tag-div', tagLabel = 'ACTION';
      if (pl.includes('dividend')) { tagClass = 'tag-div'; tagLabel = 'DIV'; }
      else if (pl.includes('bonus')) { tagClass = 'tag-bonus'; tagLabel = 'BONUS'; }
      else if (pl.includes('split')) { tagClass = 'tag-split'; tagLabel = 'SPLIT'; }
      else if (pl.includes('results')) { tagClass = 'tag-buy'; tagLabel = 'RESULTS'; }
      items.push(`<li>${sym(ticker)} <span class="tag ${tagClass}">${tagLabel}</span> ${esc(purpose)}${dateStr}</li>`);
    }
  }

  const body = items.length > 0
    ? `<ul class="news">${items.join('')}</ul>`
    : '<p style="color:#999;padding:12px 0;font-size:0.85rem;">No notable corporate actions in the next 7 days.</p>';

  return `
<div class="section">
  <div class="section-header sh-blue">&#128197; Corporate Actions &mdash; Dividends, Splits &amp; Bonuses</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildBulkDealsSection(bulkDeals) {
  let items = [];
  if (Array.isArray(bulkDeals) && bulkDeals.length > 0) {
    for (const d of bulkDeals.slice(0, 6)) {
      const ticker = d.symbol || '';
      const client = d.clientName || d.buyerSellerName || '';
      const qty = d.quantityTraded || d.qty || '';
      const price = d.tradePrice || d.price || '';
      const tradeType = (d.buyOrSell || d.tradeType || '').toUpperCase();
      const tagClass = tradeType === 'BUY' ? 'tag-buy' : tradeType === 'SELL' ? 'tag-sell' : '';
      if (ticker) {
        const qtyStr = qty ? ` &nbsp;<small style="color:#888;">${Number(qty).toLocaleString('en-IN')} shares</small>` : '';
        const priceStr = price ? ` @ &#8377;${formatPrice(price)}` : '';
        items.push(`<li>${sym(ticker)} <span class="tag ${tagClass}">${tradeType || 'DEAL'}</span> &nbsp;${esc(client)}${priceStr}${qtyStr}</li>`);
      }
    }
  } else if (bulkDeals && bulkDeals._fallback) {
    for (const r of (bulkDeals._fallback || []).slice(0, 3)) {
      items.push(`<li>${esc(r.title)}${r.snippet ? ` &mdash; <small style="color:#666;">${esc(r.snippet.slice(0,120))}</small>` : ''}</li>`);
    }
  }

  if (items.length === 0) return '';

  return `
<div class="section">
  <div class="section-header sh-orange">&#128196; Bulk &amp; Block Deals</div>
  <div class="section-body"><ul class="news">${items.join('')}</ul></div>
</div>`;
}

function buildOrderWinsSection(orderWinsResults) {
  if (!Array.isArray(orderWinsResults) || orderWinsResults.length === 0) return '';
  const items = orderWinsResults.slice(0, 5).map(r => {
    const snippet = r.snippet ? `<br/><small style="color:#666;">${esc(r.snippet.slice(0, 160))}</small>` : '';
    return `<li><span class="tag tag-order">ORDER</span> <strong>${esc(r.title)}</strong>${snippet}</li>`;
  }).join('');
  return `
<div class="section">
  <div class="section-header sh-teal">&#128220; Order Wins &amp; Corporate Developments</div>
  <div class="section-body"><ul class="news">${items}</ul></div>
</div>`;
}

function buildIndexRejigSection(indexRejigResults) {
  if (!Array.isArray(indexRejigResults) || indexRejigResults.length === 0) return '';
  const items = indexRejigResults.slice(0, 4).map(r => {
    const snippet = r.snippet ? `<br/><small style="color:#666;">${esc(r.snippet.slice(0, 160))}</small>` : '';
    return `<li><strong>${esc(r.title)}</strong>${snippet}</li>`;
  }).join('');
  return `
<div class="section">
  <div class="section-header sh-purple">&#127758; Index Rejig &amp; Macro News</div>
  <div class="section-body"><ul class="news">${items}</ul></div>
</div>`;
}

function buildBanSection(banList) {
  if (!Array.isArray(banList) || banList.length === 0) {
    return `
<div class="section">
  <div class="section-header sh-red">&#9888;&#65039; F&amp;O Ban Period</div>
  <div class="section-body"><p style="color:#999;padding:12px 0;font-size:0.85rem;">No stocks in F&amp;O ban period today.</p></div>
</div>`;
  }
  const chips = banList.map(s => `<span class="ban-chip">${esc(s)}</span>`).join('');
  return `
<div class="section">
  <div class="section-header sh-red">&#9888;&#65039; F&amp;O Ban Period &mdash; ${banList.length} stock${banList.length > 1 ? 's' : ''}</div>
  <div class="section-body">
    <div class="ban-chips">${chips}</div>
    <p class="ban-note">Stocks exceeding 95% of Market-Wide Position Limit (MWPL). No fresh positions allowed; existing positions can be closed only.</p>
  </div>
</div>`;
}

function buildKeyDatesSection(boardMeetings) {
  let items = [];
  if (Array.isArray(boardMeetings) && boardMeetings.length > 0) {
    for (const m of boardMeetings.slice(0, 8)) {
      const ticker = m.symbol || '';
      const purpose = m.purpose || m.meetingPurpose || 'Board meeting';
      const date = m.meetingDate || m.date || '';
      if (date && ticker) items.push(`<li><strong>${esc(date)}</strong> &mdash; ${sym(ticker)}: ${esc(purpose)}</li>`);
    }
  }
  if (items.length === 0) return '';
  return `
<div class="section">
  <div class="section-header sh-teal">&#128197; Upcoming Key Dates</div>
  <div class="section-body"><ul class="news">${items.join('')}</ul></div>
</div>`;
}

function buildFallbackSection(fallbackNotes) {
  if (!Array.isArray(fallbackNotes) || fallbackNotes.length === 0) return '';
  const items = fallbackNotes.map(n => `<li style="color:#999;">&#9432; ${esc(n)}</li>`).join('');
  return `
<div class="section">
  <div class="section-header sh-orange">&#128221; Data Source Notes</div>
  <div class="section-body"><ul class="news">${items}</ul></div>
</div>`;
}

function buildDigestHtml({ universe, gainersLosers, corporateActions, bulkDeals, boardMeetings, brokerCallResults, banList, niftyIndex, fiiDiiResults, orderWinsResults, indexRejigResults, fallbackNotes, date, dateISO, researchedBreakouts, niftyWebSummary, fiiDiiSummary, synthesizedSections }) {
  const universeCount = Array.isArray(universe) ? universe.length : 0;

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today = new Date();
  const fullDate = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  while (yesterday.getDay() === 0 || yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
  const lastTradingDay = `${dayNames[yesterday.getDay()]}, ${yesterday.getDate()} ${monthNames[yesterday.getMonth()]} ${yesterday.getFullYear()}`;

  const header = `
<div class="header">
  <h1>&#128200; NSE F&amp;O Morning Digest</h1>
  <div class="subtitle">Your daily pre-market briefing for NSE F&amp;O stocks</div>
  <div class="meta">
    <span class="meta-item">&#128197; ${fullDate}</span>
    <span class="meta-item">&#9200; Generated 8:00 AM IST</span>
    <span class="meta-item">&#128218; Prev session: ${lastTradingDay}</span>
    ${universeCount > 0 ? `<span class="meta-item">&#128202; ${universeCount} F&amp;O stocks tracked</span>` : ''}
  </div>
</div>`;

  const snapshot = buildSnapshot(niftyIndex, fiiDiiSummary || (Array.isArray(fiiDiiResults) ? fiiDiiResults.map(r => r.title + ' ' + r.snippet).join(' ') : ''), niftyWebSummary);

  const footer = `
<div class="footer">
  NSE F&amp;O Morning Digest &nbsp;&bull;&nbsp; Auto-generated at 8:00 AM IST &nbsp;&bull;&nbsp; ${date}<br/>
  Data sourced from NSE India, web searches. &nbsp;<em>Not investment advice. Verify before trading.</em>
</div>`;

  let bodySections;
  if (synthesizedSections) {
    bodySections = synthesizedSections;
  } else {
    // Split researched breakouts into gainers and losers
    let gainers = [], losers = [];
    if (Array.isArray(researchedBreakouts) && researchedBreakouts.length > 0) {
      gainers = researchedBreakouts.filter(s => parseFloat(s.pChange) > 0).sort((a, b) => parseFloat(b.pChange) - parseFloat(a.pChange));
      losers = researchedBreakouts.filter(s => parseFloat(s.pChange) < 0).sort((a, b) => parseFloat(a.pChange) - parseFloat(b.pChange));
    } else if (gainersLosers && !gainersLosers._fallback) {
      gainers = gainersLosers.gainers || [];
      losers = gainersLosers.losers || [];
    }

    bodySections = [
      buildGainersSection(gainers),
      buildLosersSection(losers),
      buildBrokerageTable(brokerCallResults),
      buildCorporateActionsSection(corporateActions),
      buildBulkDealsSection(bulkDeals),
      buildOrderWinsSection(orderWinsResults),
      buildIndexRejigSection(indexRejigResults),
      buildBanSection(banList),
      buildKeyDatesSection(boardMeetings),
    ].join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NSE F&amp;O Morning Digest &mdash; ${date}</title>
<style>${CSS}</style>
</head>
<body>
<div class="container">
${header}
${snapshot}
${bodySections}
${buildFallbackSection(fallbackNotes)}
${footer}
</div>
</body>
</html>`;
}

module.exports = { buildDigestHtml };
