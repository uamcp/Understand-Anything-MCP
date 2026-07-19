import subprocess
import json
import time
import os

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
        text=True
    )

    # 1. Init
    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}) + "\n")
    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + "\n")
    proc.stdin.flush()

    time.sleep(2.5)

    # Single tool call test
    tool_req = {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "ua_precheck", "arguments": {"target": "src/index.ts"}}}
    print("Sending:", json.dumps(tool_req))
    proc.stdin.write(json.dumps(tool_req) + "\n")
    proc.stdin.flush()

    time.sleep(2)
    proc.terminate()
    stdout, stderr = proc.communicate()

    print("STDOUT:", stdout)
    print("STDERR:", stderr)

if __name__ == "__main__":
    main()
