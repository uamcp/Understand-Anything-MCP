import subprocess
import json
import os
import sys

def main():
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
        text=True,
        bufsize=1
    )

    def send_rpc(method, params, req_id):
        msg = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params
        }
        json_str = json.dumps(msg)
        print(f"=== REQ {req_id}: {method} ({params.get('name', '')}) ===")
        print(json_str)
        proc.stdin.write(json_str + "\n")
        proc.stdin.flush()

        line = proc.stdout.readline()
        print(f"=== RESP {req_id} ===")
        print(line.strip())
        return line.strip()

    # 1. Initialize
    send_rpc("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "1.0.0"}
    }, 1)

    # 2. Tools list to verify
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
        send_rpc("tools/call", {"name": name, "arguments": args}, req_id)
        req_id += 1

    proc.terminate()

if __name__ == "__main__":
    main()
