'use strict';
const { searchWeb } = require('./search');

// Find reason for a stock's price move on a given date
// Returns a short string like "Q4 results beat estimates" or "broker upgrade by CLSA" or null
async function findStockReason(symbol, dateStr) {
  // Run two searches in parallel, pick the most relevant snippet
  const [r1, r2] = await Promise.all([
    searchWeb(`${symbol} NSE stock news reason ${dateStr}`),
    searchWeb(`${symbol} India share price move today ${dateStr}`),
  ]);
  const all = [...r1, ...r2];
  if (all.length === 0) return null;
  // Prefer snippets that mention the stock symbol
  const relevant = all.filter(r => r.snippet && r.snippet.toUpperCase().includes(symbol.toUpperCase()));
  const best = relevant[0] || all[0];
  const text = (best.snippet || best.title || '').slice(0, 200);
  return text || null;
}

// Get FII/DII flow data — returns a summary string or null
async function getFiiDiiData(dateStr) {
  const results = await searchWeb(`FII DII net investment NSE India ${dateStr} crore provisional`);
  if (results.length === 0) return null;
  // Combine title + snippet of top results into a summary
  const combined = results.slice(0, 3).map(r => (r.title + ' ' + r.snippet).slice(0, 150)).join(' | ');
  return combined;
}

// Get Nifty closing level from web search
async function getNiftyFromWeb(dateStr) {
  const results = await searchWeb(`Nifty 50 close ${dateStr} India market`);
  if (results.length === 0) return null;
  const combined = results.slice(0, 2).map(r => (r.title + ' ' + r.snippet).slice(0, 120)).join(' ');
  return combined;
}

// Get order wins for a specific stock
async function getStockOrderWin(symbol, dateStr) {
  const results = await searchWeb(`${symbol} order win contract award ${dateStr}`);
  if (results.length === 0) return null;
  const r = results[0];
  return (r.snippet || r.title || '').slice(0, 200);
}

// Research all breakout stocks in parallel (max 8 concurrent)
async function researchBreakouts(breakoutStocks, dateStr) {
  // breakoutStocks: array of { symbol, pChange, lastPrice, ... }
  const results = await Promise.allSettled(
    breakoutStocks.map(s => findStockReason(s.symbol, dateStr))
  );
  return breakoutStocks.map((s, i) => ({
    ...s,
    reason: results[i].status === 'fulfilled' ? results[i].value : null,
  }));
}

module.exports = { findStockReason, getFiiDiiData, getNiftyFromWeb, getStockOrderWin, researchBreakouts };
