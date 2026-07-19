import { spawn } from 'child_process';
import readline from 'readline';

const child = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    UA_PROJECT_PATH: process.cwd(),
    UA_LICENSE_KEY: 'pro_test_key'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

const rl = readline.createInterface({
  input: child.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const data = JSON.parse(line);
    console.log(`\n--- RESPONSE #${data.id} (${data.result ? 'SUCCESS' : 'ERROR'}) ---`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('RAW LINE:', line);
  }
});

function send(msg) {
  const str = JSON.stringify(msg) + '\n';
  child.stdin.write(str);
}

// 1. Initialize
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'node-test-client', version: '1.0.0' }
  }
});

send({ jsonrpc: '2.0', method: 'notifications/initialized' });

// Wait 1s for file watcher initialization then send tool requests
setTimeout(() => {
  const tools = [
    { name: 'ua_status', args: {} },
    { name: 'ua_scan', args: {} },
    { name: 'ua_precheck', args: { target: 'src/index.ts' } },
    { name: 'ua_ci_check', args: { pr_diff: 'diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,3 @@\n+ // test change\n' } },
    { name: 'ua_find_callers', args: { target: 'src/index.ts' } },
    { name: 'ua_impact_analysis', args: { target: 'src/index.ts' } },
    { name: 'ua_rules', args: {} },
    { name: 'ua_validate_graph', args: { graphData: JSON.stringify({ nodes: [{ id: 'file:src/index.ts', type: 'file' }], edges: [] }) } }
  ];

  tools.forEach((t, i) => {
    send({
      jsonrpc: '2.0',
      id: i + 2,
      method: 'tools/call',
      params: { name: t.name, arguments: t.args }
    });
  });

  setTimeout(() => {
    child.kill();
    process.exit(0);
  }, 2000);
}, 1000);
