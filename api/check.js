const GAS_URL = 'https://script.google.com/macros/s/AKfycbwfMKSBQ3-8AoS2jYs0_-gVaZHhlCDHX-9t-VloOhuN9yuZxyIFraIo2CE2MvEhmVwZ/exec';

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
