import urllib.request
import json
import uuid

api_key = "smry_EtMBCmkKHm9yZ18wMUtYVFNQOUJIRkYwUDk3ODNOOTNNU0hRUAoGb3JnX2lkGAMiCQoHCAoSAxiACCIKCggIgQgSAxiACDImCiQKAggbEgYIBRICCAUaFgoECgIIBQoICgYgzu_I1gYKBBoCCAISJAgAEiCY9hcUtpCpP_yKj2bYiKgM3dl6UcpfSlsTH40RCRCn4xpAISGkm8F1_2gY-Vt4gyuNTDID1cYj80GgdK5ByIhOQ4M3NWnHk-An60Al7ERPmXvtODMw4gkdn8lUyOZJAW0xBxqZAQovCgF0GAMyKAomCgIIGxIHCAUSAwiCCBoXCgUKAwiCCAoICgYgzu_I1gYKBBoCCAISJAgAEiBaEzDEFY5l3dBkALKvSNH4nvhpsAL-tjgVlMZC9yUrCBpAB_w-2mDe5LWMu6zcmEBOVmC5FibXKqCHCokRPW-seZ-mJfuhufc8a8YgiedZ4RK9Fub_dt7xMs4ksHyGALwOBCIiCiB2Yj42zsQJLbFzlpG4xoyL834Bh7LZj9KbnEWi2x6gcQ=="

def upload_icon():
    url = "https://api.smithery.ai/servers/uaprotocol/ua-mcp/icon"
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    with open("icon.svg", "rb") as f:
        icon_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="icon"; filename="icon.svg"\r\n'
        "Content-Type: image/svg+xml\r\n\r\n"
    ).encode("utf-8") + icon_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0"
        },
        method="PUT"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print("Icon Upload Status:", resp.status)
            print("Icon Response:", resp.read().decode("utf-8"))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Icon Upload Error:", e.read().decode("utf-8"))
        else:
            print("Icon Upload Error:", e)

def patch_server():
    url = "https://api.smithery.ai/servers/uaprotocol/ua-mcp"
    payload = {
        "displayName": "Understand Anything - MCP",
        "description": "A powerful Model Context Protocol (MCP) server for code analysis, dependency graph exploration, architecture reports, and automated governance for AI coding agents.",
        "homepage": "https://github.com/uamcp/Understand-Anything-MCP",
        "repositoryUrl": "https://github.com/uamcp/Understand-Anything-MCP",
        "iconUrl": "https://raw.githubusercontent.com/uamcp/Understand-Anything-MCP/main/icon.svg",
        "license": "MIT"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0"
        },
        method="PATCH"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print("Patch Status:", resp.status)
            print("Patch Response:", resp.read().decode("utf-8"))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Patch Error:", e.read().decode("utf-8"))
        else:
            print("Patch Error:", e)

if __name__ == "__main__":
    upload_icon()
    patch_server()
