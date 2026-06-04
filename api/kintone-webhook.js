const KINTONE_DOMAIN = 'ca7n5wh2hfvv.cybozu.com';
const KINTONE_APP = '102';
const KINTONE_TOKEN = 'AZsoAU6lPUhmuHr0YC0H194VWQPCGkeb0Fvq6LaU';
const SLACK_CHANNEL = 'C0B7514MXS7';

const BLOCK_YOMI = [
  '受注', '受注済み',
  'アポ化済商談前',
  'E 5％ (接触・温度感不明)',
  'D 15％ (担当者前向き・比較検討中)',
  'C 30％ (担当者OK・決済に向けた稟議中)',
  'B 50％ (決裁者前向き・比較検討中)',
  'A 70％ (決裁者OK、リーガルチェック中)',
  'S 90％ (契約書送付済、契約待ち)'
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const debug = {};

  try {
    const body = req.body || {};
    debug.body_type = typeof req.body;
    debug.record_keys = Object.keys(body.record || {});

    const record = body.record || {};
    const recordId = body.recordId;

    const companyName = record['顧客']?.value;
    const yomi = record['ヨミ']?.value;

    debug.companyName = companyName;
    debug.yomi = yomi;
    debug.yomi_match = yomi === 'アポ化済商談前';

    if (!companyName || yomi !== 'アポ化済商談前') {
      return res.json({ ok: true, debug, reason: 'early_return' });
    }

    const query = encodeURIComponent(
      `顧客 like "${companyName}" and レコード番号 != ${recordId}`
    );
    const kRes = await fetch(
      `https://${KINTONE_DOMAIN}/k/v1/records.json?app=${KINTONE_APP}&query=${query}` +
      `&fields[]=ヨミ&fields[]=初回商談日_コンサルチーム`,
      { headers: { 'X-Cybozu-API-Token': KINTONE_TOKEN } }
    );
    const kData = await kRes.json();
    const records = kData.records || [];
    debug.kintone_count = records.length;
    debug.kintone_yomis = records.map(r => r['ヨミ']?.value);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let reason = null;

    for (const r of records) {
      const rYomi = r['ヨミ']?.value || '';
      const meetingDate = r['初回商談日_コンサルチーム']?.value;

      if (rYomi === '受注' || rYomi === '受注済み') {
        reason = 'ヒトトレ受注済み'; break;
      }
      if (BLOCK_YOMI.includes(rYomi)) {
        reason = `INREVO商談中（ヨミ：${rYomi}）`; break;
      }
      if (meetingDate && new Date(meetingDate) >= threeMonthsAgo) {
        reason = `初回商談済み（${meetingDate}）3ヶ月以内`; break;
      }
    }

    debug.reason = reason;

    if (reason) {
      const slackResult = await notifySlack(
        `⚠️ *既得権アラート*\n*${companyName}* はすでに保護対象です。\n理由：${reason}\n重複アプローチの可能性があります。確認してください。`
      );
      debug.slack = slackResult;
    }

    return res.json({ ok: true, debug });
  } catch (err) {
    return res.json({ ok: false, error: err.message, debug });
  }
};

async function notifySlack(text) {
  const token = process.env.SLACK_TOKEN;
  if (!token) return { error: 'no token' };

  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text })
  });
  return await r.json();
}
