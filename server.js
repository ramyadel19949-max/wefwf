const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();

app.use(cors());
app.use(express.json());

const VPS_HOST = '51.75.118.171';
const VPS_PORT = 20218;

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36'
];

app.post('/chat', (req, res) => {
    const userMessage = req.body.message || req.body.prompt || '';

    if (!userMessage) {
        return res.status(400).json({ status: 'error', reply: 'الرسالة فارغة!' });
    }

    const payload = JSON.stringify({
        message: userMessage,
        prompt: userMessage
    });

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const options = {
        hostname: VPS_HOST,
        port: VPS_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': randomUA
        },
        timeout: 9000
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
            try {
                const data = JSON.parse(body);
                res.json({ status: 'success', reply: data.reply || data.response || data.message || body });
            } catch (e) {
                res.json({ status: 'success', reply: body });
            }
        });
    });

    proxyReq.on('error', (err) => {
        res.status(500).json({ status: 'error', reply: 'خطأ اتصال بالـ VPS: ' + err.message });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ status: 'error', reply: 'استغرق النموذج وقتاً أطول من المعتاد.' });
    });

    proxyReq.write(payload);
    proxyReq.end();
});

module.exports = app;
