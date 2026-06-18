'use strict';

const {
  fetchFnoUniverse,
  fetchGainersLosers,
  fetchCorporateActions,
  fetchBulkDeals,
  fetchBoardMeetings,
} = require('./nse');

const {
  fallbackFnoList,
  fallbackBulkDeals,
  fallbackBoardMeetings,
  fallbackBrokerCalls,
  fallbackGainersLosers,
} = require('./search');

const { buildDigest } = require('./digest');
const { sendDigest, createDraft } = require('./email');

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

  // 7. Build digest
  const body = buildDigest({
    universe,
    gainersLosers,
    corporateActions,
    bulkDeals,
    boardMeetings,
    brokerCallResults,
    fallbackNotes,
    date: dateDisplay,
  });

  const subject = `NSE F&O Morning Digest – ${dateDisplay}`;

  if (isDryRun) {
    console.log('\n--- DRY RUN OUTPUT ---\n');
    console.log(`Subject: ${subject}\n`);
    console.log(body);
    console.log('\n--- END DRY RUN ---');
    return;
  }

  // 8. Send email
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const recipientEmail = process.env.RECIPIENT_EMAIL || 'khushbanthia@gmail.com';

  if (!gmailUser || !gmailAppPassword) {
    console.error('ERROR: GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required.');
    console.error('Set them in your environment or .env file.');
    createDraft({ subject, body, to: recipientEmail, from: gmailUser || 'nse-digest@localhost' });
    process.exit(1);
  }

  try {
    await sendDigest({ subject, body, to: recipientEmail, gmailUser, gmailAppPassword });
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
