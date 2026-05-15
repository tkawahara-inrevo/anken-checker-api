const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwWUPshp1rug_j0fHQ9La9aS7H4PCZhXtqKAMM0u6fakOKQG28IGv0HwG2FANnC6qS/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const input = req.method === 'GET' ? req.query : (req.body || {});
    const params = new URLSearchParams(input).toString();
    const response = await fetch(GAS_URL + '?' + params, { redirect: 'follow' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
};
