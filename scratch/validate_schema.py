import urllib.request
import json

def test():
    # Fetch schema
    url = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        schema = json.loads(resp.read().decode('utf-8'))

    data = {
      "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      "name": "io.github.uamcp/ua-mcp",
      "title": "Understand Anything - MCP",
      "description": "A powerful MCP server for codebase architecture analysis and automated governance.",
      "version": "1.2.16",
      "websiteUrl": "https://github.com/uamcp/Understand-Anything-MCP",
      "repository": {
        "url": "https://github.com/uamcp/Understand-Anything-MCP",
        "source": "github"
      },
      "icons": [
        {
          "src": "https://raw.githubusercontent.com/uamcp/Understand-Anything-MCP/main/docs/logo.png",
          "mimeType": "image/png",
          "sizes": ["128x128"]
        }
      ],
      "packages": [
        {
          "registryType": "npm",
          "identifier": "ua-mcp",
          "version": "1.2.16",
          "transport": {
            "type": "stdio"
          }
        }
      ]
    }

    try:
        # Check if jsonschema is installed. If not, we will install it or do simple validation.
        from jsonschema import validate
        validate(instance=data, schema=schema)
        print("VALIDATION SUCCESS")
    except ImportError:
        print("jsonschema not installed, falling back to manual type/required checks")
        # manual checks
        for req_field in schema.get('definitions', {}).get('ServerDetail', {}).get('required', []):
            if req_field not in data:
                print(f"MISSING REQUIRED FIELD: {req_field}")
                return
        print("MANUAL CHECKS PASSED")

if __name__ == '__main__':
    test()
