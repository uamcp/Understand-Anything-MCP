import subprocess
import json
import os

def test_tools():
    env = os.environ.copy()
    env["UA_PROJECT_PATH"] = r"C:\Users\fanue\.gemini\antigravity\scratch\ua-mcp"
    env["UA_LICENSE_KEY"] = "pro_test_key"

    proc = subprocess.Popen(
        ["node", "dist/index.js"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=r"C:\Users\fanue\.gemini\antigravity\scratch\ua-mcp",
        env=env,
        text=True
    )

    # 1. Initialize
    init_req = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}
    print(">>> REQ 1: initialize")
    print(json.dumps(init_req))
    proc.stdin.write(json.dumps(init_req) + "\n")
    proc.stdin.flush()
    print("<<< RESP 1:")
    print(proc.stdout.readline().strip())

    # 2. Initialized notification (no response expected)
    notif = {"jsonrpc": "2.0", "method": "notifications/initialized"}
    proc.stdin.write(json.dumps(notif) + "\n")
    proc.stdin.flush()

    # 3. Tool requests
    tools_to_test = [
        ("ua_status", {}),
        ("ua_scan", {}),
        ("ua_precheck", {"target": "src/index.ts"}),
        ("ua_ci_check", {"diff": "diff --git a/src/index.ts b/src/index.ts\nindex 123..456 100644\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,3 @@\n+ // change\n"}),
        ("ua_find_callers", {"symbol": "src/index.ts"}),
        ("ua_impact_analysis", {"target": "src/index.ts"}),
        ("ua_rules", {}),
        ("ua_validate_graph", {"graphData": "{\"nodes\": [{\"id\": \"file:src/index.ts\", \"type\": \"file\"}], \"edges\": []}"})
    ]

    req_id = 2
    for name, args in tools_to_test:
        req = {"jsonrpc": "2.0", "id": req_id, "method": "tools/call", "params": {"name": name, "arguments": args}}
        json_str = json.dumps(req)
        print(f"\n>>> REQ {req_id}: tools/call ({name})")
        print(json_str)
        proc.stdin.write(json_str + "\n")
        proc.stdin.flush()
        line = proc.stdout.readline()
        print(f"<<< RESP {req_id}:")
        print(line.strip())
        req_id += 1

    proc.terminate()

if __name__ == "__main__":
    test_tools()
