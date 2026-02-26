const APIFY_API_TOKEN = String(process.env.APIFY_API_TOKEN || '').trim();
const ACTOR_ID = 'harvestapi~linkedin-profile-scraper';

/**
 * Scrape a LinkedIn profile via Apify to get the full name.
 * Returns the full name string or null if scraping fails.
 */
async function scrapeLinkedInName(linkedinUrl) {
  if (!APIFY_API_TOKEN || !linkedinUrl) return null;

  try {
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: [linkedinUrl],
        profileScraperMode: 'Profile details no email ($4 per 1k)',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error('[linkedin] Apify error', response.status);
      return null;
    }

    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    const profile = items[0];
    const fullName = String(profile.fullName || profile.name || '').trim();
    console.log('[linkedin] scraped name:', fullName, 'for', linkedinUrl);
    return fullName || null;
  } catch (error) {
    console.error('[linkedin] scrape failed', error.message);
    return null;
  }
}

export { scrapeLinkedInName };
