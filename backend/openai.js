const OpenAI = require('openai');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');
const config = require('./config');

const proxyAgent = config.HTTPS_PROXY_URL
  ? new HttpsProxyAgent(config.HTTPS_PROXY_URL)
  : null;

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
  fetch: (url, options = {}) =>
    fetch(url, {
      ...options,
      ...(proxyAgent ? { agent: proxyAgent } : {}),
    }),
});

async function streamSummary(text, res, { lastEventId = null, previous = '' }) {
  try {
    const stream = await openai.chat.completions.create({
      model: 'deepseek-v4-flash',
      store: true,
      messages: [
        {
          role: 'system',
          content: '你是一个任务助手，请将以下内容描述浓缩为一句摘要。',
        },
        { role: 'user', content: text },
      ],
      stream: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = previous;
    let eventId = Number(lastEventId) || 0;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        eventId += 1;
        fullContent += delta;

        res.write(`id: ${eventId}\n`);
        res.write(`data: ${delta}\n\n`);
      }
    }

    res.write('event: done\ndata: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('OpenAI API:', err);
    res.write('event: error\ndata: {"message": "AI摘要失败"}\n\n');
    res.end();
  }
}

module.exports = { streamSummary, openai };
