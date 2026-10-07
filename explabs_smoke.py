"""
Experiential Labs Gateway — Minimal Smoke Test Script
Reads EXPLABS_API_KEY from environment or .env, connects to https://api.experientiallabs.ai/v1
"""
import os
import sys
import json
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Read API key strictly from environment
API_KEY = os.environ.get("EXPLABS_API_KEY")

# Check .env if available
if not API_KEY and os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("EXPLABS_API_KEY="):
                API_KEY = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                break

if not API_KEY:
    print("[ERROR] EXPLABS_API_KEY environment variable is not set.")
    print("Please set it in your environment: export EXPLABS_API_KEY=\"xpl_...\"")
    sys.exit(1)

GATEWAY_BASE_URL = os.environ.get("EXPLABS_BASE_URL", "https://api.experientiallabs.ai/v1")
MODEL = os.environ.get("EXPLABS_MODEL", "claude-opus-4.6")

def smoke_test(model_slug=MODEL):
    masked_key = API_KEY[:8] + "..." if len(API_KEY) >= 8 else "xpl_..."
    print(f"[*] Gateway: {GATEWAY_BASE_URL}")
    print(f"[*] Key:     {masked_key}")
    print(f"[*] Model:   {model_slug}")
    print("--------------------------------------------------")

    payload = {
        "model": model_slug,
        "messages": [
            {"role": "user", "content": "reply with the single word: ok"}
        ]
    }
    
    req = urllib.request.Request(
        f"{GATEWAY_BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read().decode("utf-8"))
            choice = data.get("choices", [{}])[0].get("message", {}).get("content")
            usage = data.get("usage", {})
            print("[+] SUCCESS (200 OK)")
            print(f"[+] Reply: {choice}")
            print(f"[+] Usage: {usage}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"[-] HTTP Error {e.code}:")
        try:
            parsed = json.loads(err_body)
            print(json.dumps(parsed, indent=2))
        except Exception:
            print(err_body)
        return False
    except Exception as e:
        print(f"[-] Connection error: {e}")
        return False

if __name__ == "__main__":
    target_model = sys.argv[1] if len(sys.argv) > 1 else MODEL
    smoke_test(target_model)
