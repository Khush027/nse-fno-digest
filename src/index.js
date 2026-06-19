'use strict';

const {
  fetchFnoUniverse,
  fetchGainersLosers,
  fetchCorporateActions,
  fetchBulkDeals,
  fetchBoardMeetings,
  fetchNiftyIndex,
  fetchBanList,
} = require('./nse');

const {
  fallbackFnoList,
  fallbackBulkDeals,
  fallbackBoardMeetings,
  fallbackBrokerCalls,
  fallbackGainersLosers,
  fallbackFiiDii,
  fallbackBanList,
  fallbackOrderWins,
  fallbackIndexRejig,
} = require('./search');

const { buildDigestHtml } = require('./digest');
const { sendDigest, createDraft } = require('./email');
const { researchBreakouts, getFiiDiiData, getNiftyFromWeb } = require('./research');
const { synthesizeDigest } = require('./claude');

// Format date as DD-MMM-YYYY (e.g. 18-Jun-2026)
function formatDateDisplay(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

// Format date as YYYY-MM-DD
function formatDateISO(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const today = new Date();
  const dateDisplay = formatDateDisplay(today);
  const dateISO = formatDateISO(today);

  console.log(`NSE F&O Morning Digest — ${dateDisplay}${isDryRun ? ' [DRY RUN]' : ''}`);
  console.log('Collecting data...\n');

  const fallbackNotes = [];

  // 1. F&O Universe
  let universe = [];
  try {
    universe = await fetchFnoUniverse();
    console.log(`F&O universe: ${universe.length} stocks fetched.`);
  } catch (err) {
    console.warn(`F&O universe fetch failed (${err.message}), using web fallback.`);
    fallbackNotes.push('F&O universe: fetched via web search (NSE blocked).');
    try {
      const text = await fallbackFnoList();
      // universe stays empty array; fallback text is noted
      console.log('Web fallback for F&O list retrieved.');
    } catch (e2) {
      fallbackNotes.push('F&O universe: web fallback also failed.');
    }
  }

  // 2. Gainers / Losers
  let gainersLosers = { gainers: [], losers: [] };
  try {
    gainersLosers = await fetchGainersLosers();
    console.log(`Gainers: ${gainersLosers.gainers.length}, Losers: ${gainersLosers.losers.length}`);
  } catch (err) {
    console.warn(`Gainers/losers fetch failed (${err.message}), using web fallback.`);
    fallbackNotes.push('Gainers/losers: fetched via web search (NSE blocked).');
    try {
      const results = await fallbackGainersLosers(dateISO);
      gainersLosers = { _fallback: results };
    } catch (e2) {
      fallbackNotes.push('Gainers/losers: web fallback also failed.');
    }
  }

  // 3. Corporate Actions
  let corporateActions = [];
  try {
    corporateActions = await fetchCorporateActions();
    console.log(`Corporate actions: ${corporateActions.length} fetched.`);
  } catch (err) {
    console.warn(`Corporate actions fetch failed (${err.message}).`);
    fallbackNotes.push('Corporate actions: NSE blocked, no fallback available.');
  }

  // 4. Bulk Deals
  let bulkDeals = [];
  try {
    bulkDeals = await fetchBulkDeals();
    console.log(`Bulk deals: ${bulkDeals.length} fetched.`);
  } catch (err) {
    console.warn(`Bulk deals fetch failed (${err.message}), using web fallback.`);
    fallbackNotes.push('Bulk deals: fetched via web search (NSE blocked).');
    try {
      const results = await fallbackBulkDeals(dateISO);
      bulkDeals = { _fallback: results };
    } catch (e2) {
      fallbackNotes.push('Bulk deals: web fallback also failed.');
    }
  }

  // 5. Board Meetings
  let boardMeetings = [];
  try {
    boardMeetings = await fetchBoardMeetings();
    console.log(`Board meetings: ${boardMeetings.length} fetched.`);
  } catch (err) {
    console.warn(`Board meetings fetch failed (${err.message}), using web fallback.`);
    fallbackNotes.push('Board meetings: fetched via web search (NSE blocked).');
    try {
      const results = await fallbackBoardMeetings(dateISO);
      boardMeetings = { _fallback: results };
    } catch (e2) {
      fallbackNotes.push('Board meetings: web fallback also failed.');
    }
  }

  // 6. Broker Calls (always web search)
  let brokerCallResults = [];
  try {
    brokerCallResults = await fallbackBrokerCalls(dateISO);
    console.log(`Broker calls: ${brokerCallResults.length} results from web search.`);
  } catch (err) {
    console.warn(`Broker calls web search failed: ${err.message}`);
  }

  // 7. Nifty index
  let niftyIndex = null;
  try {
    niftyIndex = await fetchNiftyIndex();
    console.log(`Nifty 50: ${niftyIndex.last} (${niftyIndex.pChange}%)`);
  } catch (err) {
    console.warn(`Nifty index fetch failed (${err.message}).`);
  }

  // 8. F&O ban list
  let banList = [];
  try {
    banList = await fetchBanList();
    console.log(`F&O ban list: ${banList.length} stocks.`);
  } catch (err) {
    console.warn(`Ban list fetch failed (${err.message}), using web fallback.`);
    try {
      const banResults = await fallbackBanList(dateISO);
      // Extract ticker-like tokens from search results (all-caps 2-10 char words)
      const text = banResults.map(r => r.title + ' ' + r.snippet).join(' ');
      const tickers = [...new Set((text.match(/\b[A-Z]{2,10}\b/g) || [])
        .filter(t => !['NSE','BSE','FNO','BAN','MWPL','THE','FOR','AND','ARE','NOT','PER'].includes(t)))];
      if (tickers.length > 0) banList = tickers.slice(0, 10);
      else fallbackNotes.push('F&O ban list: NSE blocked, verify at nseindia.com.');
    } catch (e2) {
      fallbackNotes.push('F&O ban list: NSE blocked, verify at nseindia.com.');
    }
  }

  // 9. Research step: find reasons for notable breakout stocks
  let breakoutStocksWithReasons = [];
  if (Array.isArray(universe) && universe.length > 0) {
    const breakouts = universe
      .filter(s => s && Math.abs(Number(s.pChange)) >= 2.0)
      .sort((a, b) => Math.abs(Number(b.pChange)) - Math.abs(Number(a.pChange)))
      .slice(0, 8);
    if (breakouts.length > 0) {
      console.log(`Researching reasons for ${breakouts.length} breakout stocks...`);
      try {
        breakoutStocksWithReasons = await researchBreakouts(breakouts, dateISO);
        console.log('Research complete.');
      } catch (err) {
        console.warn(`Research step failed: ${err.message}`);
      }
    }
  }

  // Also get Nifty web summary if NSE API was blocked
  let niftyWebSummary = null;
  if (!niftyIndex) {
    try {
      niftyWebSummary = await getNiftyFromWeb(dateISO);
    } catch {}
  }

  // Also get FII/DII data via research module
  let fiiDiiSummary = null;
  try {
    fiiDiiSummary = await getFiiDiiData(dateISO);
  } catch {}

  // 10. FII/DII, order wins, index rejig (all web search)
  const [fiiDiiResults, orderWinsResults, indexRejigResults] = await Promise.allSettled([
    fallbackFiiDii(dateISO),
    fallbackOrderWins(dateISO),
    fallbackIndexRejig(dateISO),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  console.log(`FII/DII: ${fiiDiiResults.length}, Order wins: ${orderWinsResults.length}, Index rejig: ${indexRejigResults.length}`);

  // 11. Synthesize with Claude API
  let synthesizedSections = '';
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Synthesizing digest with Claude API...');
    try {
      const rawData = {
        breakouts: breakoutStocksWithReasons,
        gainersLosers: gainersLosers._fallback ? gainersLosers._fallback : {
          gainers: gainersLosers.gainers ? gainersLosers.gainers.slice(0, 10) : [],
          losers: gainersLosers.losers ? gainersLosers.losers.slice(0, 10) : [],
        },
        corporateActions: corporateActions.slice ? corporateActions.slice(0, 20) : [],
        bulkDeals: Array.isArray(bulkDeals) ? bulkDeals.slice(0, 10) : [],
        boardMeetings: Array.isArray(boardMeetings) ? boardMeetings.slice(0, 10) : [],
        brokerCallResults,
        banList,
        fiiDiiSummary,
        orderWinsResults,
        indexRejigResults,
        niftyIndex,
      };
      synthesizedSections = await synthesizeDigest({ rawData, date: dateDisplay, dateISO });
      console.log('Claude synthesis complete.');
    } catch (err) {
      console.warn(`Claude synthesis failed (${err.message}), falling back to template.`);
    }
  }

  // 12. Build final HTML digest
  const htmlBody = buildDigestHtml({
    universe,
    gainersLosers,
    corporateActions,
    bulkDeals,
    boardMeetings,
    brokerCallResults,
    banList,
    niftyIndex,
    fiiDiiResults,
    orderWinsResults,
    indexRejigResults,
    fallbackNotes,
    date: dateDisplay,
    dateISO,
    researchedBreakouts: breakoutStocksWithReasons,
    niftyWebSummary,
    fiiDiiSummary,
    synthesizedSections,
  });

  const subject = `NSE F&O Morning Digest – ${dateDisplay}`;
  const PAGES_URL = 'https://khush027.github.io/nse-fno-digest/';

  // 12. Save HTML to docs/ (always, even before send, so it's preserved on failure)
  const fs = require('fs');
  const path = require('path');
  const docsDir = path.join(__dirname, '..', 'docs');
  const archiveDir = path.join(docsDir, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'index.html'), htmlBody);
  fs.writeFileSync(path.join(archiveDir, `${dateISO}.html`), htmlBody);
  console.log(`Digest HTML saved to docs/index.html`);

  // 13. Build short link email
  const linkEmailHtml = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6f9; padding: 32px; color: #222;">
  <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a237e, #283593); border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; color: #fff;">
      <h2 style="margin: 0; font-size: 1.2rem;">📈 NSE F&amp;O Morning Digest</h2>
      <p style="margin: 6px 0 0; opacity: 0.85; font-size: 0.88rem;">${dateDisplay} — Ready to read</p>
    </div>
    <p style="margin: 0 0 20px; font-size: 0.95rem; color: #444;">Your daily NSE F&amp;O digest has been generated. Click below to view the full report:</p>
    <a href="${PAGES_URL}" style="display: inline-block; background: #1a237e; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">View Today's Digest →</a>
    <p style="margin: 20px 0 0; font-size: 0.78rem; color: #999;">Or copy this link: ${PAGES_URL}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
    <p style="margin: 0; font-size: 0.75rem; color: #bbb;">For informational purposes only. Not investment advice.</p>
  </div>
</body>
</html>`;

  if (isDryRun) {
    console.log(`\n[DRY RUN] Digest link: ${PAGES_URL}`);
    console.log(`Subject: ${subject}`);
    return;
  }

  // 14. Send link email
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const recipientEmail = process.env.RECIPIENT_EMAIL || 'khushbanthia@gmail.com';

  if (!gmailUser || !gmailAppPassword) {
    console.error('ERROR: GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required.');
    console.error('Set them in your environment or .env file.');
    createDraft({ subject, htmlBody: linkEmailHtml, to: recipientEmail });
    process.exit(1);
  }

  try {
    await sendDigest({ subject, htmlBody: linkEmailHtml, to: recipientEmail, gmailUser, gmailAppPassword });
    console.log(`Digest sent to ${recipientEmail}`);
  } catch (err) {
    console.error(`Failed to send digest: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
