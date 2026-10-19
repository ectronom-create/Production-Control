export default async function handler(req, res) {
  // Set CORS headers for universal access
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { date, shift } = req.query;
  if (!date || !shift) {
    return res.status(400).json({ error: 'Missing date or shift parameter' });
  }

  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHUCPbr7nKCtK9x1NuQ_ObGoyOlbB6GCUWw09dYhAVJODPpAdPuW7OBDxtZgyqRrq1Pw/exec';
  const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Google Apps Script responded with HTTP ${response.status}`);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch from Google Apps Script' });
  }
}
