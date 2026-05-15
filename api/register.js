const GAS_URL = 'https://script.google.com/macros/s/AKfycbxkR2N1EXdD4-MSZgk_i2_hpKIgICEZ6ACJfYNzR8Gv9dkvzfsYjKutCji6NM_bbXPo/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = req.body || {};
    const params = new URLSearchParams(body).toString();
    const response = await fetch(GAS_URL + '?' + params, { redirect: 'follow' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
};
