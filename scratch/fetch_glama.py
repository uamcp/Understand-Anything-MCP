import urllib.request
import re
import sys

# Configure stdout to use UTF-8
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
            
            # Remove scripts, styles
            content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', content)
            content = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', content)
            
            # Get all visible text lines
            lines = []
            for line in content.split('\n'):
                line = re.sub(r'<[^>]*>', ' ', line).strip()
                line = ' '.join(line.split())
                if line:
                    lines.append(line)
            
            # Print first 200 lines to examine the page structure
            print("\n=== PAGE VISIBLE TEXT ===")
            for idx, l in enumerate(lines[:300]):
                # print any lines that look like status information
                if any(x in l.lower() for x in ['quality', 'test', 'install', 'pending', 'error', 'fails', 'claim', 'owner', 'author', 'status']):
                    print(f"Line {idx}: {l}")
    except Exception as e:
        print("Error fetching:", e)

if __name__ == '__main__':
    fetch('https://glama.ai/mcp/servers/uamcp/Understand-Anything-MCP')
