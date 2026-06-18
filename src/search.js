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

// Fallback: get F&O stock list via web search
async function fallbackFnoList() {
  const results = await searchWeb('NSE F&O stock list current 2025');
  if (results.length === 0) return 'No fallback data available for F&O universe.';
  return results.map(r => `${r.title}: ${r.snippet}`).join('\n');
}

// Fallback: bulk deals for a given date
async function fallbackBulkDeals(dateStr) {
  const results = await searchWeb(`NSE bulk deals ${dateStr}`);
  return results;
}

// Fallback: board meetings for a given date
async function fallbackBoardMeetings(dateStr) {
  const results = await searchWeb(`NSE board meeting ${dateStr}`);
  return results;
}

// Fallback: broker calls/upgrades/downgrades
async function fallbackBrokerCalls(dateStr) {
  const results = await searchWeb(`broker upgrade downgrade NSE ${dateStr}`);
  return results;
}

// Fallback: gainers and losers
async function fallbackGainersLosers(dateStr) {
  const results = await searchWeb(`NSE F&O stocks gainers losers ${dateStr}`);
  return results;
}

module.exports = {
  searchWeb,
  fallbackFnoList,
  fallbackBulkDeals,
  fallbackBoardMeetings,
  fallbackBrokerCalls,
  fallbackGainersLosers,
};
