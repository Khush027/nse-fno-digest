'use strict';

const BREAKOUT_THRESHOLD = 2.0; // pChange % threshold
const MAX_ITEMS = 5;

function formatPrice(p) {
  if (p == null) return 'N/A';
  return typeof p === 'number' ? p.toFixed(2) : String(p);
}

function buildBreakoutsSection(universe, gainersLosers) {
  const lines = ['PRICE/VOLUME BREAKOUTS'];

  const items = [];

  // Use F&O universe data if available
  if (Array.isArray(universe) && universe.length > 0) {
    const breakouts = universe
      .filter(s => s && s.pChange != null && Math.abs(Number(s.pChange)) >= BREAKOUT_THRESHOLD)
      .sort((a, b) => Math.abs(Number(b.pChange)) - Math.abs(Number(a.pChange)))
      .slice(0, MAX_ITEMS);

    for (const s of breakouts) {
      const dir = Number(s.pChange) > 0 ? 'UP' : 'DOWN';
      const vol = s.totalTradedVolume ? ` | Vol: ${Number(s.totalTradedVolume).toLocaleString('en-IN')}` : '';
      items.push(`  ${s.symbol} — ${dir} ${Math.abs(Number(s.pChange)).toFixed(2)}% @ ₹${formatPrice(s.lastPrice)}${vol}`);
    }
  }

  // Supplement with gainers/losers if universe data is missing or sparse
  if (items.length === 0 && gainersLosers) {
    const gainers = Array.isArray(gainersLosers.gainers) ? gainersLosers.gainers.slice(0, 3) : [];
    const losers = Array.isArray(gainersLosers.losers) ? gainersLosers.losers.slice(0, 2) : [];

    for (const g of gainers) {
      const sym = g.symbol || g.Symbol || '';
      const chg = g.pChange || g.perChange || g.change || '';
      const price = g.lastPrice || g.LTP || '';
      if (sym) items.push(`  ${sym} — UP ${chg}% @ ₹${formatPrice(price)} (top gainer)`);
    }
    for (const l of losers) {
      const sym = l.symbol || l.Symbol || '';
      const chg = l.pChange || l.perChange || l.change || '';
      const price = l.lastPrice || l.LTP || '';
      if (sym) items.push(`  ${sym} — DOWN ${chg}% @ ₹${formatPrice(price)} (top loser)`);
    }
  }

  // Handle web-search fallback results (array of {title, snippet})
  if (items.length === 0 && gainersLosers && gainersLosers._fallback) {
    const results = gainersLosers._fallback;
    if (Array.isArray(results) && results.length > 0) {
      for (const r of results.slice(0, 3)) {
        items.push(`  ${r.title}`);
        if (r.snippet) items.push(`    ${r.snippet}`);
      }
    }
  }

  if (items.length === 0) {
    lines.push('  No notable breakouts today.');
  } else {
    lines.push(...items);
  }

  return lines.join('\n');
}

function buildCorporateActionsSection(corporateActions) {
  const lines = ['CORPORATE ACTIONS'];

  const RELEVANT_TYPES = ['dividend', 'bonus', 'split', 'results', 'board meeting', 'agm', 'egm', 'rights'];

  let filtered = [];
  if (Array.isArray(corporateActions) && corporateActions.length > 0) {
    filtered = corporateActions
      .filter(a => {
        const purpose = (a.purpose || a.subject || '').toLowerCase();
        return RELEVANT_TYPES.some(t => purpose.includes(t));
      })
      .slice(0, MAX_ITEMS);

    for (const a of filtered) {
      const sym = a.symbol || a.Symbol || '';
      const purpose = a.purpose || a.subject || 'Action';
      const date = a.exDate || a.recordDate || a.bcEndDate || a.meetingDate || '';
      const dateStr = date ? ` on ${date}` : '';
      lines.push(`  ${sym} — ${purpose}${dateStr}`);
    }
  }

  if (filtered.length === 0) {
    lines.push('  No notable corporate actions in the next 7 days.');
  }

  return lines.join('\n');
}

function buildNewsSection(bulkDeals, boardMeetings, brokerCallResults, fallbackNotes) {
  const lines = ['NEWS & BROKER CALLS'];
  const items = [];

  // Bulk deals > 0.5% significance
  if (Array.isArray(bulkDeals) && bulkDeals.length > 0) {
    const notable = bulkDeals
      .filter(d => {
        const pct = parseFloat(d.quantityTraded || d.qty || d.percentageOfEquity || 0);
        return pct >= 0.5 || (d.totalTradedValue && parseFloat(d.totalTradedValue) > 10);
      })
      .slice(0, 3);

    for (const d of notable) {
      const sym = d.symbol || d.Symbol || '';
      const client = d.clientName || d.buyerSellerName || '';
      const qty = d.quantityTraded || d.qty || '';
      const tradeType = d.buyOrSell || d.tradeType || '';
      if (sym) {
        items.push(`  BULK DEAL: ${sym} — ${client} ${tradeType} ${qty ? qty + ' shares' : ''}`);
      }
    }
  } else if (bulkDeals && bulkDeals._fallback) {
    const results = bulkDeals._fallback;
    if (Array.isArray(results) && results.length > 0) {
      items.push('  Bulk deals (web):');
      for (const r of results.slice(0, 2)) {
        items.push(`    ${r.title}`);
      }
    }
  }

  // Board meetings
  if (Array.isArray(boardMeetings) && boardMeetings.length > 0) {
    for (const m of boardMeetings.slice(0, 2)) {
      const sym = m.symbol || m.Symbol || '';
      const purpose = m.purpose || m.meetingPurpose || 'Board meeting';
      const date = m.meetingDate || m.date || '';
      const dateStr = date ? ` on ${date}` : '';
      if (sym) items.push(`  BOARD MEETING: ${sym} — ${purpose}${dateStr}`);
    }
  } else if (boardMeetings && boardMeetings._fallback) {
    const results = boardMeetings._fallback;
    if (Array.isArray(results) && results.length > 0) {
      items.push('  Board meetings (web):');
      for (const r of results.slice(0, 2)) {
        items.push(`    ${r.title}`);
      }
    }
  }

  // Broker calls from web search
  if (Array.isArray(brokerCallResults) && brokerCallResults.length > 0) {
    items.push('  Broker calls:');
    for (const r of brokerCallResults.slice(0, 3)) {
      items.push(`    ${r.title}`);
      if (r.snippet) items.push(`      ${r.snippet.slice(0, 120)}`);
    }
  }

  // Fallback notes
  if (Array.isArray(fallbackNotes) && fallbackNotes.length > 0) {
    for (const note of fallbackNotes) {
      items.push(`  [NOTE] ${note}`);
    }
  }

  if (items.length === 0) {
    lines.push('  No notable news or broker calls today.');
  } else {
    lines.push(...items);
  }

  return lines.join('\n');
}

// Main digest builder
function buildDigest({ universe, gainersLosers, corporateActions, bulkDeals, boardMeetings, brokerCallResults, fallbackNotes, date }) {
  const header = `NSE F&O MORNING DIGEST — ${date}`;
  const separator = '='.repeat(header.length);

  const breakoutsSection = buildBreakoutsSection(universe, gainersLosers);
  const corporateSection = buildCorporateActionsSection(corporateActions);
  const newsSection = buildNewsSection(bulkDeals, boardMeetings, brokerCallResults, fallbackNotes);

  const footer = [
    '---',
    'Data sourced from NSE India. Past performance is not indicative of future results.',
    'This digest is for informational purposes only and does not constitute investment advice.',
  ].join('\n');

  return [header, separator, '', breakoutsSection, '', corporateSection, '', newsSection, '', footer].join('\n');
}

module.exports = { buildDigest };
