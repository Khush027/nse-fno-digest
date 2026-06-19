'use strict';

const fetch = require('node-fetch');

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';
const TIMEOUT_MS = 15000;

// Parse result titles and snippets from DuckDuckGo HTML response
function parseDdgResults(html) {
  const results = [];
  // Match result links (titles)
  const titleRegex = /<a[^>]+class="result__a"[^>]*>([^<]+)<\/a>/gi;
  // Match snippets
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles = [];
  const snippets = [];

  let m;
  while ((m = titleRegex.exec(html)) !== null) {
    titles.push(m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
  }
  while ((m = snippetRegex.exec(html)) !== null) {
    // Strip any inner HTML tags from snippets
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    snippets.push(text);
  }

  const count = Math.min(titles.length, snippets.length, 5);
  for (let i = 0; i < count; i++) {
    results.push({ title: titles[i], snippet: snippets[i] });
  }

  // If snippet regex found nothing, just return titles
  if (results.length === 0 && titles.length > 0) {
    return titles.slice(0, 5).map(t => ({ title: t, snippet: '' }));
  }

  return results;
}

// Search DuckDuckGo HTML and return up to 5 { title, snippet } results
async function searchWeb(query) {
  const AbortController = globalThis.AbortController;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams({ q: query, b: '', kl: 'us-en' });
    const res = await fetch(DDG_HTML_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const html = await res.text();
    return parseDdgResults(html);
  } catch (err) {
    clearTimeout(timer);
    return [];
  }
}

async function fallbackFnoList() {
  const results = await searchWeb('NSE F&O eligible stocks list site:nseindia.com OR site:moneycontrol.com');
  if (results.length === 0) return 'No fallback data available for F&O universe.';
  return results.map(r => `${r.title}: ${r.snippet}`).join('\n');
}

async function fallbackBulkDeals(dateStr) {
  return searchWeb(`NSE BSE bulk block deals India ${dateStr}`);
}

async function fallbackBoardMeetings(dateStr) {
  return searchWeb(`NSE India board meeting results declaration ${dateStr}`);
}

// Run multiple targeted broker searches and merge results
async function fallbackBrokerCalls(dateStr) {
  const [kotak, motilal, global, ratings] = await Promise.all([
    searchWeb(`Kotak "Motilal Oswal" "ICICI Securities" stock buy sell target ${dateStr} India`),
    searchWeb(`Emkay Edelweiss "Axis Securities" Nuvama stock recommendation target price ${dateStr}`),
    searchWeb(`Goldman Sachs "Morgan Stanley" Jefferies Nomura India stock rating ${dateStr}`),
    searchWeb(`NSE stock upgrade downgrade target price analyst India ${dateStr}`),
  ]);
  const seen = new Set();
  return [...kotak, ...motilal, ...global, ...ratings].filter(r => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  }).slice(0, 10);
}

async function fallbackGainersLosers(dateStr) {
  return searchWeb(`NSE top gainers losers F&O stocks today ${dateStr} India`);
}

// Fetch FII/DII data via web search
async function fallbackFiiDii(dateStr) {
  return searchWeb(`FII DII net buy sell NSE India ${dateStr} crore`);
}

// Fetch Nifty index level via web search
async function fallbackNiftyLevel(dateStr) {
  return searchWeb(`Nifty 50 closing level ${dateStr} India stock market`);
}

// Fetch F&O ban list via web search
async function fallbackBanList(dateStr) {
  return searchWeb(`NSE F&O ban list securities ${dateStr} MWPL`);
}

// Fetch order wins and corporate news via web search
async function fallbackOrderWins(dateStr) {
  return searchWeb(`India company order win contract award NSE ${dateStr}`);
}

// Fetch index rejig news
async function fallbackIndexRejig(dateStr) {
  return searchWeb(`Nifty Sensex BSE NSE index inclusion exclusion rejig ${dateStr}`);
}

module.exports = {
  searchWeb,
  fallbackFnoList,
  fallbackBulkDeals,
  fallbackBoardMeetings,
  fallbackBrokerCalls,
  fallbackGainersLosers,
  fallbackFiiDii,
  fallbackNiftyLevel,
  fallbackBanList,
  fallbackOrderWins,
  fallbackIndexRejig,
};
