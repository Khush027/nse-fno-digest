'use strict';

const fetch = require('node-fetch');
const AbortController = globalThis.AbortController;

const NSE_BASE = 'https://www.nseindia.com';
const TIMEOUT_MS = 10000;

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://www.nseindia.com',
};

// Fetch NSE homepage to get session cookies
async function getSessionCookies() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NSE_BASE + '/', {
      headers: {
        'User-Agent': BASE_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const setCookieHeaders = res.headers.raw()['set-cookie'] || [];
    const cookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
    return cookies;
  } catch (err) {
    clearTimeout(timer);
    throw new Error('BLOCKED');
  }
}

async function nseGet(path, cookies) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NSE_BASE + path, {
      headers: {
        ...BASE_HEADERS,
        ...(cookies ? { 'Cookie': cookies } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 403 || res.status === 401) {
      throw new Error('BLOCKED');
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.message === 'BLOCKED' || err.name === 'AbortError') {
      throw new Error('BLOCKED');
    }
    throw err;
  }
}

// Fetch F&O universe: returns array of { symbol, lastPrice, pChange, totalTradedVolume }
async function fetchFnoUniverse() {
  let cookies;
  try {
    cookies = await getSessionCookies();
  } catch (e) {
    throw new Error('BLOCKED');
  }
  const data = await nseGet('/api/equity-stockIndices?index=SECURITIES%20IN%20F%26O', cookies);
  if (!data || !data.data) throw new Error('BLOCKED');
  return data.data.map(item => ({
    symbol: item.symbol,
    lastPrice: item.lastPrice,
    pChange: item.pChange,
    totalTradedVolume: item.totalTradedVolume,
  }));
}

// Fetch top gainers and losers
async function fetchGainersLosers() {
  let cookies;
  try {
    cookies = await getSessionCookies();
  } catch (e) {
    throw new Error('BLOCKED');
  }
  const [gainersData, losersData] = await Promise.all([
    nseGet('/api/live-analysis-variations?index=gainers', cookies),
    nseGet('/api/live-analysis-variations?index=loosers', cookies),
  ]);
  return {
    gainers: (gainersData && gainersData.NIFTY && gainersData.NIFTY.data) || [],
    losers: (losersData && losersData.NIFTY && losersData.NIFTY.data) || [],
  };
}

// Format date as DD-MM-YYYY for NSE APIs
function formatDateDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Fetch upcoming corporate actions (next 7 days)
async function fetchCorporateActions() {
  let cookies;
  try {
    cookies = await getSessionCookies();
  } catch (e) {
    throw new Error('BLOCKED');
  }
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const fromDate = formatDateDDMMYYYY(today);
  const toDate = formatDateDDMMYYYY(nextWeek);
  const data = await nseGet(
    `/api/corporates-corporateActions?index=equities&from_date=${fromDate}&to_date=${toDate}`,
    cookies
  );
  return Array.isArray(data) ? data : (data && data.data) || [];
}

// Fetch bulk/block deals
async function fetchBulkDeals() {
  let cookies;
  try {
    cookies = await getSessionCookies();
  } catch (e) {
    throw new Error('BLOCKED');
  }
  const data = await nseGet('/api/snapshot-capital-market-largedeal', cookies);
  return (data && data.BLOCK_DEAL_DATA) || (data && data.data) || (Array.isArray(data) ? data : []);
}

// Fetch upcoming board meetings
async function fetchBoardMeetings() {
  let cookies;
  try {
    cookies = await getSessionCookies();
  } catch (e) {
    throw new Error('BLOCKED');
  }
  const data = await nseGet('/api/corporate-board-meetings?index=equities', cookies);
  return Array.isArray(data) ? data : (data && data.data) || [];
}

// Fetch Nifty 50 index data
async function fetchNiftyIndex() {
  const cookies = await getSessionCookies();
  const data = await nseGet('/api/allIndices', cookies);
  if (!data || !data.data) throw new Error('BLOCKED');
  const nifty = data.data.find(i => i.index === 'NIFTY 50');
  if (!nifty) throw new Error('BLOCKED');
  return {
    last: nifty.last,
    change: nifty.variation,
    pChange: nifty.percentChange,
  };
}

// Fetch F&O ban list
async function fetchBanList() {
  const cookies = await getSessionCookies();
  // NSE ban list API
  const data = await nseGet('/api/fo-ban-list', cookies);
  // The API returns { data: [{ tradingSymbol: 'XYZ' }, ...] } or similar
  if (!data) throw new Error('BLOCKED');
  const list = data.data || data.banList || (Array.isArray(data) ? data : []);
  return list.map(item => item.tradingSymbol || item.symbol || item.Symbol || '').filter(Boolean);
}

module.exports = {
  fetchFnoUniverse,
  fetchGainersLosers,
  fetchCorporateActions,
  fetchBulkDeals,
  fetchBoardMeetings,
  fetchNiftyIndex,
  fetchBanList,
};
