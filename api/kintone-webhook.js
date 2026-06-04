const GAS_URL = 'https://script.google.com/macros/s/AKfycbwfMKSBQ3-8AoS2jYs0_-gVaZHhlCDHX-9t-VloOhuN9yuZxyIFraIo2CE2MvEhmVwZ/exec';
const SLACK_CHANNEL = 'C0B7514MXS7';

const TRIGGER_YOMI = [
  'アポ化済商談前',
  'E 5％ (接触・温度感不明)',
  'D 15％ (担当者前向き・比較検討中)',
  'C 30％ (担当者OK・決済に向けた稟議中)',
  'B 50％ (決裁者前向き・比較検討中)',
  'A 70％ (決裁者OK、リーガルチェック中)',
  'S 90％ (契約書送付済、契約待ち)',
  '受注', '受注済み'
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    const body = req.body || {};
    const record = body.record || {};

    const companyName = record['顧客']?.value;
    const yomi = record['ヨミ']?.value;

    if (!companyName || !TRIGGER_YOMI.includes(yomi)) {
      return res.json({ ok: true });
    }

    // Google Sheetsで代理店既得権を確認
    const gasRes = await fetch(
      GAS_URL + '?check_by_name=1&company_name=' + encodeURIComponent(companyName),
      { redirect: 'follow' }
    );
    const gasData = await gasRes.json();

    if (gasData.result === 'protected') {
      const deadline = gasData.deadline || '期限不明';
      await notifySlack(
        `⚠️ *既得権アラート*\n*${companyName}* は代理店の既得権があります（保護期限：${deadline}）。\nINREVOでアポ化する前に代理店に確認してください。`
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.json({ ok: true });
  }
};

async function notifySlack(text) {
  const token = process.env.SLACK_TOKEN;
  if (!token) return;
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text })
  });
}
