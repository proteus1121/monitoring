const express = require('express');
const fs = require('fs');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');

const privateKey = fs.readFileSync('private-key.pem', 'utf8');
const certificate = fs.readFileSync('certificate.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();

app.use((req, res, next) => {
  console.log(`➡️  Request: ${req.method} ${req.originalUrl}`);
  next();
});

app.use(
  '/',
  createProxyMiddleware({
    target: 'https://api.ssn.pp.ua',
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: 'localhost',
    onProxyReq(proxyReq, req, res) {
      console.log(`🔄 Proxying to: ${proxyReq.getHeader('host')}${req.url}`);
    },
    onProxyRes(proxyRes, req, res) {
      console.log(
        `⬅️  Response from: ${req.url} - Status: ${proxyRes.statusCode}`
      );
    },
    logLevel: 'debug',
  })
);

https.createServer(credentials, app).listen(4000, () => {
  console.log('🚀 Proxy running at https://localhost:4000');
});
