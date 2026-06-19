'use strict';

const Anthropic = require('@anthropic-ai/sdk');

async function synthesizeDigest({ rawData, date, dateISO }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are generating the content sections of an NSE F&O Morning Digest HTML page for Indian stock market traders.
You will be given raw data from NSE APIs and web search results. Your job is to synthesize this into rich, accurate HTML sections.

Rules:
- Only include facts you can verify from the provided data. Never fabricate prices, order values, or news.
- For each breakout stock, explain WHY it moved based on the search results provided.
- Use specific numbers from the data (exact dividend amounts, exact order values, exact FII/DII figures).
- Include source attributions as <small style="color:#888;">Source: ...</small> where you found the data.
- Format output as HTML sections using these CSS classes: sym, sym-green, sym-red, tag, tag-buy, tag-sell, tag-div, tag-order, ul.news, li, section-header, section-body.
- If data is missing or unverifiable, say "Data unavailable — verify at nseindia.com" rather than guessing.

HTML components to use:
- Ticker chip: <span class="sym sym-green">TICKER</span> (green for positive, red for negative, plain for neutral)
- Tag: <span class="tag tag-div">DIVIDEND</span> or tag-buy, tag-sell, tag-order
- List: <ul class="news"><li>...</li></ul>
- Section: <div class="section"><div class="section-header sh-blue">TITLE</div><div class="section-body">...</div></div>
  Colors: sh-blue (corporate actions), sh-orange (breakouts/macro), sh-teal (order wins/key dates), sh-purple (index rejig), sh-red (ban list), sh-blue (stocks to watch)
`;

  const userPrompt = `Today is ${date}. Generate the HTML content sections for the NSE F&O Morning Digest. Here is all the raw data collected:

${JSON.stringify(rawData, null, 2)}

Generate these sections as HTML (in order):
1. **Price/Volume Breakouts** (sh-orange) — stocks with >2% move. For each: ticker chip, direction, % change, price, volume, and the REASON it moved (from the breakout research data). If reasons found, include them. If not, note "reason unclear".

2. **Corporate Actions — Record Dates & Dividends** (sh-blue) — from corporateActions data. Show ticker chip, tag-div, specific dividend amount, ex-date, brief narrative. Group related items.

3. **Index Rejig & Macro News** (sh-purple) — from indexRejigResults. Show which stocks are being added/removed from which indices, with tag-buy/tag-sell. Include macro regulatory news if present.

4. **Order Wins & Corporate Developments** (sh-teal) — from orderWinsResults + brokerCallResults. Show ticker, tag-order, specific order value if mentioned, brief description.

5. **Macro & Sector Updates** (sh-orange) — from fiiDiiSummary + brokerCallResults. FII/DII flows with specific crore amounts if available. Sector commentary. Any regulatory news.

6. **F&O Ban Period** (sh-red) — from banList. Show ban-chip for each stock. Include MWPL note. If empty, say "No stocks in ban period today."

7. **Key Dates Ahead** (sh-teal) — from corporateActions (next 7 days), boardMeetings. List upcoming record dates, results dates, board meetings with specific dates.

8. **Stocks to Watch Today** (sh-blue, icon 👁️) — synthesize from ALL sections above. Pick 4-6 stocks that have multiple catalysts or notable events TODAY. For each: ticker chip (color-coded), 1-2 sentences on why to watch it.

9. **Sources** — list the actual web search result URLs/sources you used as clickable links in a <div class="sources"> block.

Return ONLY the HTML for these 9 sections, nothing else. No markdown, no explanation, just raw HTML.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  return message.content[0].text;
}

module.exports = { synthesizeDigest };
