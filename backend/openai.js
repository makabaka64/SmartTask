const OpenAI = require('openai');
const config = require('./config')
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch'); 
const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:7890'); // 使用我的代理服务器地址和端口
// 初始化 OpenAI 客户端（传入自定义 fetch）
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: 'https://openai.api2d.net',
  fetch: (url, options = {}) => fetch(url, {
    ...options,
    dispatcher: proxyAgent,  // undici 用 dispatcher
  }),
});

async function streamSummary(text, res) {
    try{
const stream = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  store: true,
  messages: [
    {  role: "system", "content": "你是一个任务助手，请将以下内容描述浓缩为一句摘要" },
    {  role: "user", content: text  }
  ],
      stream: true
});
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${delta}\n\n`);
      }
    }

    res.write(`event: done\ndata: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error('OpenAI API:', err);
    res.write(`event: error\ndata: {"message": "AI摘要失败"}\n\n`);
    res.end();
  }
}

module.exports = { streamSummary }