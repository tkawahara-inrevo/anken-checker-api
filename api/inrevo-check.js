const KINTONE_DOMAIN = 'ca7n5wh2hfvv.cybozu.com';
const KINTONE_APP = '102';
const KINTONE_TOKEN = 'AZsoAU6lPUhmuHr0YC0H194VWQPCGkeb0Fvq6LaU';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwWUPshp1rug_j0fHQ9La9aS7H4PCZhXtqKAMM0u6fakOKQG28IGv0HwG2FANnC6qS/exec';

const HITOTORE_YOMI = ['受注', '受注済み'];
const BLOCK_YOMI = [
  'アポ化済商談前',
  'E 5％ (接触・温度感不明)',
  'D 15％ (担当者前向き・比較検討中)',
  'C 30％ (担当者OK・決済に向けた稟議中)',
  'B 50％ (決裁者前向き・比較検討中)',
  'A 70％ (決裁者OK、リーガルチェック中)',
  'S 90％ (契約書送付済、契約待ち)'
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const input = req.method === 'POST' ? (req.body || {}) : req.query;
    const companyName = input.company_name;
    if (!companyName) return res.json({ error: '企業名を入力してください' });

    // kintone app102 を企業名（顧客フィールド）で検索
    const query = encodeURIComponent(`顧客 like "${companyName}"`);
    const kRes = await fetch(
      `https://${KINTONE_DOMAIN}/k/v1/records.json?app=${KINTONE_APP}&query=${query}&fields[]=ヨミ&fields[]=初回商談日_コンサルチーム&fields[]=顧客`,
      { headers: { 'X-Cybozu-API-Token': KINTONE_TOKEN } }
    );
    const kData = await kRes.json();
    const records = kData.records || [];

    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    for (const record of records) {
      const yomi = record['ヨミ']?.value || '';
      const meetingDateStr = record['初回商談日_コンサルチーム']?.value;

      if (HITOTORE_YOMI.includes(yomi)) {
        return res.json({ result: 'blocked', reason: 'hitotore', company_name: companyName });
      }

      if (BLOCK_YOMI.includes(yomi)) {
        return res.json({ result: 'blocked', reason: 'inrevo_pursuit', yomi, company_name: companyName });
      }

      if (meetingDateStr) {
        const meetingDate = new Date(meetingDateStr);
        if (meetingDate >= threeMonthsAgo) {
          const expiry = new Date(meetingDate);
          expiry.setMonth(expiry.getMonth() + 3);
          const expiryStr = expiry.toISOString().split('T')[0].replace(/-/g, '/');
          return res.json({
            result: 'blocked',
            reason: 'first_meeting',
            meeting_date: meetingDateStr,
            expiry_date: expiryStr,
            company_name: companyName
          });
        }
      }
    }

    // Google Sheets で代理店既得権を確認（企業名検索）
    const gasRes = await fetch(
      GAS_URL + '?check_by_name=1&company_name=' + encodeURIComponent(companyName),
      { redirect: 'follow' }
    );
    const gasData = await gasRes.json();

    if (gasData.result === 'protected') {
      return res.json({
        result: 'blocked',
        reason: 'agent_rights',
        deadline: gasData.deadline,
        company_name: companyName
      });
    }

    return res.json({ result: 'available', company_name: companyName });

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
};
