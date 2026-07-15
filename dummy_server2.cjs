const http = require('http');
const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        res.writeHead(200, {'Content-Type': 'application/json'});
        if (req.url === '/validate') {
            res.end(JSON.stringify({valid: true, tier: 'Pro'}));
        } else if (req.url === '/analyze/ci-check') {
            // Return 12 impacted files so a critical-path file hits HIGH risk.
            const impacted = Array.from({length: 12}, (_, i) => `src/downstream${i}.ts`);
            res.end(JSON.stringify({impacted}));
        } else {
            res.end('{}');
        }
    });
});
server.listen(3001, () => {
    console.log('Dummy backend running on port 3001');
});
