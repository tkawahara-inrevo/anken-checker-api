module.exports = async function handler(req, res) {
  const token = process.env.SLACK_TOKEN;

  if (!token) {
    return res.json({ error: 'SLACK_TOKEN not set', env_keys: Object.keys(process.env).filter(k => k.startsWith('SLACK')) });
  }

  const result = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ channel: 'C0B7514MXS7', text: 'Vercelからのデバッグテスト' })
  });

  const data = await result.json();
  return res.json({ token_prefix: token.substring(0, 20) + '...', slack_response: data });
};
