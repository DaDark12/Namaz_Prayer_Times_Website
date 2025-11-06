// server.js - small proxy to forward requests (Nominatim + Aladhan) to avoid CORS / hide keys.
// Usage: set PROXY_BASE to your deployed server URL and toggle Utils.safeFetch(useProxy=true).
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 7777;

// Simple endpoint: proxy to arbitrary URL via query param ?u=encodedURL
// ONLY for personal/emergency use; don't expose this publicly without rate limits.
app.get('/proxy', async (req, res) => {
  const u = req.query.u;
  if (!u) return res.status(400).json({ error: 'no url' });

  try {
    const response = await fetch(u, {
      headers: {
        'User-Agent': 'ShiaNamazDemo/1.0 (+https://github.com/your-repo)'
      },
      timeout: 10000
    });
    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.buffer();
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: 'proxy failed', detail: err.message });
  }
});

app.listen(PORT, ()=>console.log(`Proxy server running on ${PORT}`));
