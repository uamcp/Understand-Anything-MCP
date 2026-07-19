import subprocess
import json
import os

def main():
    env = os.environ.copy()
    env["UA_PROJECT_PATH"] = r"C:\Users\fanue\.gemini\antigravity\scratch\ua-mcp"
    env["UA_LICENSE_KEY"] = "pro_test_key"

    requests = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "ua_status", "arguments": {}}},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "ua_scan", "arguments": {}}},
        {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "ua_precheck", "arguments": {"target": "src/index.ts"}}},
        {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "ua_ci_check", "arguments": {"diff": "diff --git a/src/index.ts b/src/index.ts\nindex 123..456 100644\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,3 @@\n+ // change\n"}}},
        {"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "ua_find_callers", "arguments": {"symbol": "src/index.ts"}}},
        {"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "ua_impact_analysis", "arguments": {"target": "src/index.ts"}}},
        {"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "ua_rules", "arguments": {}}},
        {"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {"name": "ua_validate_graph", "arguments": {"graphData": "{\"nodes\": [{\"id\": \"file:src/index.ts\", \"type\": \"file\"}], \"edges\": []}"}}}
    ]

    input_data = "\n".join(json.dumps(r) for r in requests) + "\n"

    proc = subprocess.Popen(
        ["node", "dist/index.js"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=r"C:\Users\fanue\.gemini\antigravity\scratch\ua-mcp",
        env=env,
        text=True
    )

    stdout, stderr = proc.communicate(input=input_data, timeout=10)
    
    print("=== STDOUT OUTPUT ===")
    for line in stdout.strip().split("\n"):
        if line.strip():
            print(line.strip())

    if stderr.strip():
        print("\n=== STDERR OUTPUT ===")
        print(stderr.strip())

if __name__ == "__main__":
    main()
