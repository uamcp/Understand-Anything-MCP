import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/validate' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid: true, tier: 'Pro', expiresAt: '2099-12-31' }));
  } else if (req.url === '/analyze/ci-check' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      riskLevel: 'LOW',
      impacted: ['src/index.ts'],
      riskFactors: ['Minor function edit', 'No breaking contract changes detected']
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(9999, '127.0.0.1', () => {
  console.log('Mock license & CI backend running on http://127.0.0.1:9999');
});
