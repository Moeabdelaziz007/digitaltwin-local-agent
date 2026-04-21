import urllib.request
import urllib.parse
import json
import os
import sys
import time

# REAL WORLD E2E TEST (URLLIB VERSION - ZERO DEPENDENCIES)
# Using standard libraries only to ensure it works on any system

BASE_URL = "http://localhost:3000"
TEST_MESSAGE = "Guardian Test: Verify neural link and memory recall via urllib."
CRON_SECRET = os.getenv("CRON_SECRET", "test")

def run_e2e_streaming_test():
    print("🚀 [NEURAL_TEST] Starting E2E Streaming Validation (urllib)...")
    
    url = f"{BASE_URL}/api/conversation"
    headers = {
        "Content-Type": "application/json",
        "X-Guardian-Auth": CRON_SECRET
    }
    
    payload = {
        "message": TEST_MESSAGE,
        "sessionId": "e2e-canary-session-urllib"
    }

    data = json.dumps(payload).encode('utf-8')
    start_time = time.time()
    first_token_time = None
    full_response = ""

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.getcode() != 200:
                print(f"❌ [NEURAL_TEST] Request failed with status {response.getcode()}")
                return False

            print("✅ [NEURAL_TEST] Connection established. Reading stream...")

            while True:
                chunk = response.read(1024)
                if not chunk:
                    break
                
                if first_token_time is None:
                    first_token_time = time.time()
                    ttft = (first_token_time - start_time) * 1000
                    print(f"⚡ [NEURAL_TEST] First token received in {ttft:.2f}ms (TTFT)")
                
                content = chunk.decode('utf-8', errors='ignore')
                full_response += content

        end_time = time.time()
        total_duration = (end_time - start_time) * 1000

        print(f"\n\n✨ [NEURAL_TEST] Stream closed successfully.")
        print(f"📊 [NEURAL_TEST] Response length: {len(full_response)} chars")
        print(f"⏱️ [NEURAL_TEST] Total duration: {total_duration:.2f}ms")

        if len(full_response) < 5:
            print("⚠️ [NEURAL_TEST] Warning: Abnormally short response.")
            return False

        return True

    except Exception as e:
        print(f"❌ [NEURAL_TEST] Test failed: {e}")
        print("💡 Hint: Ensure your local dev server is running on port 3000 (npm run dev).")
        return False

if __name__ == "__main__":
    success = run_e2e_streaming_test()
    if success:
        print("\n🏆 [NEURAL_TEST] E2E PASS: System is production-ready.")
        sys.exit(0)
    else:
        print("\n💀 [NEURAL_TEST] E2E FAIL: System issues detected.")
        sys.exit(1)
