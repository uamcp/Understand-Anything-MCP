import urllib.request
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def fetch(url):
    print(f"Fetching {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            
            # Look for status and build log sections
            lines = []
            for line in content.split('\n'):
                line = re.sub(r'<[^>]*>', ' ', line).strip()
                line = ' '.join(line.split())
                if line:
                    lines.append(line)
            
            # Print lines containing build status or logs info
            for idx, l in enumerate(lines):
                if any(x in l.lower() for x in ['019f7b33', 'pending', 'success', 'failed', 'error', 'log', 'duration']):
                    print(f"Line {idx}: {l}")
    except Exception as e:
        print("Error fetching:", e)

if __name__ == '__main__':
    fetch('https://glama.ai/mcp/servers/uamcp/Understand-Anything-MCP/admin/dockerfile')
