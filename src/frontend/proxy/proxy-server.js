const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Log incoming requests
app.use((req, res, next) => {
    console.log(`➡️  Request: ${req.method} ${req.originalUrl}`);
    next();
});

app.use('/', createProxyMiddleware({
    target: 'https://api.ssn.pp.ua',
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: 'localhost',
    onProxyReq(proxyReq, req, res) {
        console.log(`🔄 Proxying to: ${proxyReq.getHeader('host')}${req.url}`);
    },
    onProxyRes(proxyRes, req, res) {
        console.log(`⬅️  Response from: ${req.url} - Status: ${proxyRes.statusCode}`);
    },
    logLevel: 'debug'
}));

app.listen(4000, () => {
    console.log('🚀 Proxy running at http://localhost:4000');
});
