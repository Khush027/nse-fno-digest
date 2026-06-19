'use strict';

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9; color: #222; padding: 16px; }
.container { max-width: 800px; margin: 0 auto; }
.header { background: linear-gradient(135deg, #1a237e, #283593); color: #fff; border-radius: 10px; padding: 24px 28px; margin-bottom: 20px; }
.header h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: 0.5px; }
.header .subtitle { font-size: 0.9rem; opacity: 0.85; margin-top: 6px; }
.header .meta { display: flex; gap: 20px; margin-top: 14px; font-size: 0.82rem; opacity: 0.8; }
.market-bar { background: #fff; border-radius: 8px; padding: 14px 20px; display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); font-size: 0.88rem; }
.market-bar .stat { display: flex; flex-direction: column; gap: 2px; }
.market-bar .stat .label { color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.4px; }
.market-bar .stat .value { font-weight: 700; font-size: 1rem; }
.up { color: #2e7d32; } .down { color: #c62828; } .flat { color: #555; }
.section { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 18px; overflow: hidden; }
.section-header { padding: 12px 20px; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: 0.3px; }
.section-body { padding: 14px 20px; }
.sh-red { background: #ffebee; color: #b71c1c; border-left: 4px solid #e53935; }
.sh-orange { background: #fff3e0; color: #bf360c; border-left: 4px solid #fb8c00; }
.sh-blue { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #1e88e5; }
.sh-purple { background: #f3e5f5; color: #4a148c; border-left: 4px solid #8e24aa; }
.sh-teal { background: #e0f2f1; color: #004d40; border-left: 4px solid #00897b; }
ul.news { list-style: none; padding: 0; }
ul.news li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.875rem; line-height: 1.55; }
ul.news li:last-child { border-bottom: none; }
.sym { font-weight: 700; background: #e8eaf6; color: #283593; padding: 1px 6px; border-radius: 4px; font-size: 0.8rem; }
.sym-red { background: #ffcdd2; color: #b71c1c; }
.sym-green { background: #c8e6c9; color: #1b5e20; }
.tag { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 1px 6px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
.tag-buy { background: #c8e6c9; color: #1b5e20; }
.tag-sell { background: #ffcdd2; color: #b71c1c; }
.tag-div { background: #e3f2fd; color: #0d47a1; }
.ban-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.ban-chip { background: #ffcdd2; color: #b71c1c; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.footer { text-align: center; font-size: 0.75rem; color: #999; padding: 16px 0 8px; margin-top: 8px; }
`;

function sym(ticker, cls = '') {
  return `<span class="sym ${cls}">${ticker}</span>`;
}

function formatPrice(p) {
  if (p == null || p === '' || p === undefined) return '';
  const n = typeof p === 'number' ? p : parseFloat(p);
  return isNaN(n) ? String(p) : n.toFixed(2);
}

function niftyClass(pChange) {
  const v = parseFloat(pChange);
  if (v > 0) return 'up';
  if (v < 0) return 'down';
  return 'flat';
}

function buildMarketBar(niftyIndex, fiiDiiSummary, niftyWebSummary) {
  const last = niftyIndex ? niftyIndex.last : null;
  const change = niftyIndex ? niftyIndex.change : null;
  const pChange = niftyIndex ? niftyIndex.pChange : null;

  const cls = pChange != null ? niftyClass(pChange) : 'flat';
  const sign = pChange != null && parseFloat(pChange) > 0 ? '+' : '';

  const niftyVal = last != null
    ? `<span class="${cls}">${Number(last).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`
    : '<span class="flat">N/A</span>';

  const niftyDisplay = (last != null) ? niftyVal
    : niftyWebSummary
      ? `<span class="flat" style="font-size:0.82rem;">${niftyWebSummary.slice(0, 150)}</span>`
      : '<span class="flat">N/A</span>';

  const niftyChg = pChange != null
    ? `<span class="${cls}">${sign}${parseFloat(pChange).toFixed(2)}% (${sign}${formatPrice(change)})</span>`
    : '<span class="flat">N/A</span>';

  // Try to extract FII/DII numbers from fiiDiiSummary string
  let fiiHtml = '<span class="flat">See nseindia.com</span>';
  let diiHtml = '<span class="flat">See nseindia.com</span>';
  if (typeof fiiDiiSummary === 'string' && fiiDiiSummary.length > 0) {
    const numMatches = fiiDiiSummary.match(/[−\-\+]?[₹]?[\d,]+\.?\d*/g) || [];
    if (numMatches.length >= 2) {
      fiiHtml = `<span class="down">${numMatches[0]} Cr</span>`;
      diiHtml = `<span class="up">${numMatches[1]} Cr</span>`;
    } else {
      fiiHtml = `<span class="flat" style="font-size:0.78rem;">${fiiDiiSummary.slice(0, 80)}</span>`;
    }
  }

  return `
<div class="market-bar">
  <div class="stat">
    <span class="label">Nifty 50</span>
    <span class="value">${niftyDisplay}</span>
  </div>
  <div class="stat">
    <span class="label">Change</span>
    <span class="value">${niftyChg}</span>
  </div>
  <div class="stat">
    <span class="label">FII (prev day)</span>
    <span class="value">${fiiHtml}</span>
  </div>
  <div class="stat">
    <span class="label">DII (prev day)</span>
    <span class="value">${diiHtml}</span>
  </div>
</div>`;
}

function buildBreakoutsSection(universe, gainersLosers, researchedBreakouts) {
  const MAX = 8;
  let items = [];

  // Use researched breakouts (with reasons) if available, else fall back to raw universe
  const breakoutSource = (Array.isArray(researchedBreakouts) && researchedBreakouts.length > 0)
    ? researchedBreakouts
    : null;

  if (breakoutSource) {
    for (const s of breakoutSource) {
      const pct = Number(s.pChange);
      const cls = pct > 0 ? 'sym-green' : 'sym-red';
      const dir = pct > 0 ? 'UP' : 'DOWN';
      const sign = pct > 0 ? '+' : '';
      const vol = s.totalTradedVolume
        ? ` | Vol: ${Number(s.totalTradedVolume).toLocaleString('en-IN')}`
        : '';
      const reasonHtml = s.reason
        ? `<br/><small style="color:#555;font-style:italic;">&#128269; ${s.reason}</small>`
        : '';
      items.push(`<li>${sym(s.symbol, cls)} &mdash; ${dir} ${sign}${Math.abs(pct).toFixed(2)}% @ &#8377;${formatPrice(s.lastPrice)}${vol}${reasonHtml}</li>`);
    }
  } else if (Array.isArray(universe) && universe.length > 0) {
    const breakouts = universe
      .filter(s => s && s.pChange != null && Math.abs(Number(s.pChange)) >= 2.0)
      .sort((a, b) => Math.abs(Number(b.pChange)) - Math.abs(Number(a.pChange)))
      .slice(0, MAX);

    for (const s of breakouts) {
      const pct = Number(s.pChange);
      const cls = pct > 0 ? 'sym-green' : 'sym-red';
      const dir = pct > 0 ? 'UP' : 'DOWN';
      const sign = pct > 0 ? '+' : '';
      const vol = s.totalTradedVolume
        ? ` | Vol: ${Number(s.totalTradedVolume).toLocaleString('en-IN')}`
        : '';
      const why = Math.abs(pct) >= 5 ? ' — strong momentum move' : ' — notable intraday move';
      items.push(`<li>${sym(s.symbol, cls)} &mdash; ${dir} ${sign}${Math.abs(pct).toFixed(2)}% @ &#8377;${formatPrice(s.lastPrice)}${vol}${why}</li>`);
    }
  }

  if (items.length === 0 && gainersLosers && !gainersLosers._fallback) {
    const gainers = Array.isArray(gainersLosers.gainers) ? gainersLosers.gainers.slice(0, 5) : [];
    const losers = Array.isArray(gainersLosers.losers) ? gainersLosers.losers.slice(0, 3) : [];
    for (const g of gainers) {
      // NSE API may use different field names across endpoints
      const ticker = g.symbol || g.Symbol || g.meta?.symbol || '';
      const pct = g.pChange || g.perChange || g.change || g.netPrice || '';
      const price = g.lastPrice || g.ltp || g.LTP || g.ltP || g.open || '';
      const priceStr = price ? ` @ &#8377;${formatPrice(price)}` : '';
      const reasonHtml = g.reason
        ? `<br/><small style="color:#555;font-style:italic;">&#128269; ${g.reason}</small>`
        : '';
      if (ticker) items.push(`<li>${sym(ticker, 'sym-green')} &mdash; UP ${pct}%${priceStr} — top F&amp;O gainer${reasonHtml}</li>`);
    }
    for (const l of losers) {
      const ticker = l.symbol || l.Symbol || l.meta?.symbol || '';
      const pct = l.pChange || l.perChange || l.change || l.netPrice || '';
      const price = l.lastPrice || l.ltp || l.LTP || l.ltP || l.open || '';
      const priceStr = price ? ` @ &#8377;${formatPrice(price)}` : '';
      const reasonHtml = l.reason
        ? `<br/><small style="color:#555;font-style:italic;">&#128269; ${l.reason}</small>`
        : '';
      if (ticker) items.push(`<li>${sym(ticker, 'sym-red')} &mdash; DOWN ${pct}%${priceStr} — top F&amp;O loser${reasonHtml}</li>`);
    }
  }

  if (items.length === 0 && gainersLosers && gainersLosers._fallback) {
    for (const r of (gainersLosers._fallback || []).slice(0, 3)) {
      items.push(`<li>${r.title}${r.snippet ? ` — ${r.snippet.slice(0, 150)}` : ''}</li>`);
    }
  }

  const body = items.length > 0
    ? `<ul class="news">${items.join('')}</ul>`
    : '<p style="color:#888;font-size:0.875rem;">No notable breakouts today.</p>';

  return `
<div class="section">
  <div class="section-header sh-orange">&#128201; Price/Volume Breakouts</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildCorporateActionsSection(corporateActions) {
  const RELEVANT_TYPES = ['dividend', 'bonus', 'split', 'results', 'board meeting', 'agm', 'egm', 'rights'];
  let items = [];

  if (Array.isArray(corporateActions) && corporateActions.length > 0) {
    const filtered = corporateActions
      .filter(a => {
        const purpose = (a.purpose || a.subject || '').toLowerCase();
        return RELEVANT_TYPES.some(t => purpose.includes(t));
      })
      .slice(0, 8);

    for (const a of filtered) {
      const ticker = a.symbol || a.Symbol || '';
      const purpose = a.purpose || a.subject || 'Action';
      const date = a.exDate || a.recordDate || a.bcEndDate || a.meetingDate || '';
      const dateStr = date ? ` | Ex-date: ${date}` : '';
      const purposeLower = purpose.toLowerCase();
      let tagClass = 'tag-div';
      let tagLabel = 'ACTION';
      if (purposeLower.includes('dividend')) { tagClass = 'tag-div'; tagLabel = 'DIVIDEND'; }
      else if (purposeLower.includes('bonus')) { tagLabel = 'BONUS'; }
      else if (purposeLower.includes('split')) { tagLabel = 'SPLIT'; }
      else if (purposeLower.includes('results')) { tagLabel = 'RESULTS'; }
      items.push(`<li>${sym(ticker)} <span class="tag ${tagClass}">${tagLabel}</span> — ${purpose}${dateStr}</li>`);
    }
  }

  const body = items.length > 0
    ? `<ul class="news">${items.join('')}</ul>`
    : '<p style="color:#888;font-size:0.875rem;">No notable corporate actions in the next 7 days.</p>';

  return `
<div class="section">
  <div class="section-header sh-blue">&#128203; Corporate Actions — Record Dates &amp; Dividends</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildNewsSection(bulkDeals, boardMeetings, brokerCallResults) {
  let items = [];

  // Bulk deals
  if (Array.isArray(bulkDeals) && bulkDeals.length > 0) {
    const notable = bulkDeals.slice(0, 5);
    for (const d of notable) {
      const ticker = d.symbol || d.Symbol || '';
      const client = d.clientName || d.buyerSellerName || '';
      const qty = d.quantityTraded || d.qty || '';
      const tradeType = (d.buyOrSell || d.tradeType || '').toUpperCase();
      const tagClass = tradeType === 'BUY' ? 'tag-buy' : (tradeType === 'SELL' ? 'tag-sell' : '');
      const tagHtml = tradeType ? `<span class="tag ${tagClass}">${tradeType}</span>` : '';
      if (ticker) {
        items.push(`<li>${sym(ticker)}${tagHtml} Bulk deal — ${client}${qty ? `, ${Number(qty).toLocaleString('en-IN')} shares` : ''}</li>`);
      }
    }
  } else if (bulkDeals && bulkDeals._fallback) {
    for (const r of (bulkDeals._fallback || []).slice(0, 2)) {
      items.push(`<li>${r.title}</li>`);
    }
  }

  // Board meetings
  if (Array.isArray(boardMeetings) && boardMeetings.length > 0) {
    for (const m of boardMeetings.slice(0, 3)) {
      const ticker = m.symbol || m.Symbol || '';
      const purpose = m.purpose || m.meetingPurpose || 'Board meeting';
      const date = m.meetingDate || m.date || '';
      const dateStr = date ? ` on ${date}` : '';
      if (ticker) items.push(`<li>${sym(ticker)} Board Meeting${dateStr} — ${purpose}</li>`);
    }
  } else if (boardMeetings && boardMeetings._fallback) {
    for (const r of (boardMeetings._fallback || []).slice(0, 2)) {
      items.push(`<li>${r.title}</li>`);
    }
  }

  // Broker calls
  if (Array.isArray(brokerCallResults) && brokerCallResults.length > 0) {
    for (const r of brokerCallResults.slice(0, 4)) {
      const snippet = r.snippet ? ` — ${r.snippet.slice(0, 150)}` : '';
      items.push(`<li>${r.title}${snippet}</li>`);
    }
  }

  const body = items.length > 0
    ? `<ul class="news">${items.join('')}</ul>`
    : '<p style="color:#888;font-size:0.875rem;">No notable news or broker calls today.</p>';

  return `
<div class="section">
  <div class="section-header sh-teal">&#128202; News &amp; Broker Calls</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildBanSection(banList) {
  let body;
  if (Array.isArray(banList) && banList.length > 0) {
    const chips = banList.map(s => `<span class="ban-chip">${s}</span>`).join('');
    body = `<div class="ban-chips">${chips}</div>
<p style="margin-top:12px;font-size:0.8rem;color:#888;">Stocks with aggregate open interest &gt;95% of MWPL are placed in the F&amp;O ban period. New positions cannot be created.</p>`;
  } else {
    body = '<p style="color:#888;font-size:0.875rem;">No stocks in F&amp;O ban period today.</p>';
  }

  return `
<div class="section">
  <div class="section-header sh-red">&#9888;&#65039; F&amp;O Ban Period</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildKeyDatesSection(boardMeetings) {
  let items = [];
  if (Array.isArray(boardMeetings) && boardMeetings.length > 0) {
    const upcoming = boardMeetings.slice(0, 7);
    for (const m of upcoming) {
      const ticker = m.symbol || m.Symbol || '';
      const purpose = m.purpose || m.meetingPurpose || 'Board meeting';
      const date = m.meetingDate || m.date || '';
      if (date && ticker) {
        items.push(`<li>${date} — ${sym(ticker)}: ${purpose}</li>`);
      }
    }
  }

  const body = items.length > 0
    ? `<ul class="news">${items.join('')}</ul>`
    : '<p style="color:#888;font-size:0.875rem;">No upcoming board meetings in the next 7 days.</p>';

  return `
<div class="section">
  <div class="section-header sh-teal">&#128197; Key Dates Ahead</div>
  <div class="section-body">${body}</div>
</div>`;
}

function buildWebSearchSection(title, icon, colorClass, results) {
  if (!Array.isArray(results) || results.length === 0) return '';
  const items = results.slice(0, 4).map(r => {
    const snippet = r.snippet ? `<br/><small style="color:#666;">${r.snippet.slice(0, 180)}</small>` : '';
    return `<li><strong>${r.title}</strong>${snippet}</li>`;
  }).join('');
  return `
<div class="section">
  <div class="section-header ${colorClass}">${icon} ${title}</div>
  <div class="section-body"><ul class="news">${items}</ul></div>
</div>`;
}

function buildFallbackSection(fallbackNotes) {
  if (!Array.isArray(fallbackNotes) || fallbackNotes.length === 0) return '';
  const items = fallbackNotes.map(n => `<li>${n}</li>`).join('');
  return `
<div class="section">
  <div class="section-header sh-orange">&#128221; Data Notes</div>
  <div class="section-body"><ul class="news">${items}</ul></div>
</div>`;
}

function buildDigestHtml({ universe, gainersLosers, corporateActions, bulkDeals, boardMeetings, brokerCallResults, banList, niftyIndex, fiiDiiResults, orderWinsResults, indexRejigResults, fallbackNotes, date, dateISO, researchedBreakouts, niftyWebSummary, fiiDiiSummary, synthesizedSections }) {
  const universeCount = Array.isArray(universe) ? universe.length : 0;

  // Compute day of week and last trading day
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today = new Date();
  const dayName = dayNames[today.getDay()];
  const fullDate = `${dayName}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  while (yesterday.getDay() === 0 || yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
  const lastTradingDay = `${dayNames[yesterday.getDay()]}, ${yesterday.getDate()} ${monthNames[yesterday.getMonth()]} ${yesterday.getFullYear()}`;

  const header = `
<div class="header">
  <h1>&#128200; NSE F&amp;O Morning Digest</h1>
  <div class="subtitle">${fullDate} &nbsp;|&nbsp; NSE F&amp;O Universe (${universeCount > 0 ? universeCount : '~200+'} stocks)</div>
  <div class="meta">
    <span>&#9200; Generated at 8:00 AM IST</span>
    <span>&#128197; Last trading day: ${lastTradingDay}</span>
  </div>
</div>`;

  const marketBar = buildMarketBar(niftyIndex, fiiDiiSummary || fiiDiiResults, niftyWebSummary);

  const fallback = buildFallbackSection(fallbackNotes);

  const footer = `
<div class="footer">
  NSE F&amp;O Morning Digest &nbsp;|&nbsp; Auto-generated &nbsp;|&nbsp; ${date}, 8:00 AM IST<br/>
  <em>For informational purposes only. Not investment advice. Always verify with official NSE/BSE sources.</em>
</div>`;

  let bodySections;
  if (synthesizedSections) {
    bodySections = synthesizedSections;
  } else {
    const breakouts = buildBreakoutsSection(universe, gainersLosers, researchedBreakouts);
    const corpActions = buildCorporateActionsSection(corporateActions);
    const news = buildNewsSection(bulkDeals, boardMeetings, brokerCallResults);
    const orderWins = buildWebSearchSection('Order Wins &amp; Corporate Developments', '&#128220;', 'sh-teal', orderWinsResults);
    const indexRejig = buildWebSearchSection('Index Rejig &amp; Macro News', '&#127758;', 'sh-purple', indexRejigResults);
    const ban = buildBanSection(banList);
    const keyDates = buildKeyDatesSection(boardMeetings);
    bodySections = [breakouts, corpActions, news, orderWins, indexRejig, ban, keyDates].join('\n');
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
${marketBar}
${bodySections}
${fallback}
${footer}
</div>
</body>
</html>`;
}

module.exports = { buildDigestHtml };
