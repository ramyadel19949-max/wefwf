const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();

app.use(cors());
app.use(express.json());

const VPS_HOST = '51.75.118.171';
const VPS_PORT = 20218;

app.get('/', (req, res) => {
    res.send('WormGPT Bridge is running on Vercel!');
});

app.post('/chat', (req, res) => {
    const userMessage = req.body.message || req.body.prompt || '';

    if (!userMessage) {
        return res.status(400).json({ status: 'error', reply: 'الرسالة فارغة!' });
    }

    const payload = JSON.stringify({
        message: userMessage,
        prompt: userMessage
    });

    // إعدادات الطلب الموجه للـ VPS
    const options = {
        hostname: VPS_HOST,
        port: VPS_PORT,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'Mozilla/5.0 (Windows NT 100.0; Win64; x64)'
        },
        timeout: 25000
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
            // إذا رجع السيرفر خطأ 405 أو أي خطأ HTML
            if (proxyRes.statusCode !== 200) {
                return res.json({ 
                    status: 'error', 
                    reply: `السيرفر أرجع استجابة غير متوقعة (${proxyRes.statusCode}). تأكد من مسار API في الـ VPS.` 
                });
            }

            try {
                const data = JSON.parse(body);
                res.json({ 
                    status: 'success', 
                    reply: data.reply || data.response || data.message || body 
                });
            } catch (e) {
                res.json({ status: 'success', reply: body });
            }
        });
    });

    proxyReq.on('error', (err) => {
        res.status(500).json({ status: 'error', reply: 'تعذر الاتصال بالـ VPS: ' + err.message });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ status: 'error', reply: 'انتهت مهلة الاتصال بالـ VPS.' });
    });

    proxyReq.write(payload);
    proxyReq.end();
});

module.exports = app;
