import { spawn } from 'child_process';
import readline from 'readline';

console.log("Starting Smithery listing integration test...");

// On Windows cmd.exe shell: true, we need to escape the inner double quotes with backslashes
// and wrap the entire JSON string in double quotes.
const configJson = '"{\\"UA_PROJECT_PATH\\":\\"C:/Users/fanue/.gemini/antigravity/scratch/ua-mcp\\"}"';

console.log("Config JSON passed:", configJson);

const child = spawn('npx', ['@smithery/cli', 'run', 'uaprotocol/ua-mcp', '--config', configJson], {
  cwd: process.cwd(),
  env: {
    ...process.env
  },
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

const rl = readline.createInterface({
  input: child.stdout,
  terminal: false
});

child.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg) console.log('STDERR:', msg);
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const data = JSON.parse(line);
    if (data.result && data.result.tools) {
      console.log(`\n--- RECEIVED TOOL LIST FROM SMITHERY (id: ${data.id}) ---`);
      console.log(`Total tools returned: ${data.result.tools.length}`);
      data.result.tools.forEach((t) => {
        console.log(`- ${t.name}: ${t.description.split('\n')[0]}`);
      });
    } else if (data.result && data.result.content) {
      console.log(`\n--- RECEIVED TOOL RESPONSE FROM SMITHERY (id: ${data.id}) ---`);
      console.log(JSON.stringify(data.result.content, null, 2));
    } else {
      console.log(`\n--- RECEIVED GENERAL RESPONSE FROM SMITHERY (id: ${data.id}) ---`);
      console.log(JSON.stringify(data, null, 2));
    }
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
    clientInfo: { name: 'smithery-test-client', version: '1.0.0' }
  }
});

send({ jsonrpc: '2.0', method: 'notifications/initialized' });

// Wait 4s for startup/fetch, check tool list, then call ua_status
setTimeout(() => {
  console.log("\nRequesting tool list...");
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });

  setTimeout(() => {
    console.log("\nRequesting ua_status...");
    send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'ua_status',
        arguments: {}
      }
    });

    setTimeout(() => {
      child.kill();
      process.exit(0);
    }, 3000);
  }, 3000);
}, 5000);
