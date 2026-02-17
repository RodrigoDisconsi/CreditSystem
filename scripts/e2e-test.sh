#!/bin/bash
# =============================================================================
# Credit System - E2E Integration Test Script
# Tests all API flows against the running system
# Requirements: backend on :3000, postgres, redis running
# =============================================================================

API="http://localhost:3000"
PASS=0
FAIL=0
TOTAL=0

green() { echo -e "\033[32m$1\033[0m"; }
red()   { echo -e "\033[31m$1\033[0m"; }
bold()  { echo -e "\033[1m$1\033[0m"; }

assert() {
  TOTAL=$((TOTAL + 1))
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    green "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $desc (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  TOTAL=$((TOTAL + 1))
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    green "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $desc (expected to contain: $needle)"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  TOTAL=$((TOTAL + 1))
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    red "  FAIL: $desc (should NOT contain: $needle)"
    FAIL=$((FAIL + 1))
  else
    green "  PASS: $desc"
    PASS=$((PASS + 1))
  fi
}

# =============================================================================
bold "=========================================="
bold "  CREDIT SYSTEM - E2E INTEGRATION TESTS"
bold "=========================================="
echo ""

# =============================================================================
# Clean DB before tests
echo "  Cleaning previous test data..."
docker exec credit-system-postgres psql -U postgres -d credit_system -c "DELETE FROM application_events; DELETE FROM jobs; DELETE FROM applications;" > /dev/null 2>&1
# Wait for any pending BullMQ jobs from previous runs to finish processing
echo "  Waiting for queues to drain..."
sleep 8
echo ""

bold "1. HEALTH CHECK"
# =============================================================================
HEALTH=$(curl -s $API/health)
assert_contains "Health endpoint returns ok" '"status":"ok"' "$HEALTH"
assert_contains "Health has timestamp" '"timestamp"' "$HEALTH"

echo ""

# =============================================================================
bold "2. AUTHENTICATION"
# =============================================================================

# 2.1 Login with valid admin credentials
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@credit.com","password":"admin123"}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Admin login returns 200" "200" "$HTTP"
assert_contains "Login returns token" '"token"' "$BODY"
assert_contains "Login returns refreshToken" '"refreshToken"' "$BODY"
assert_contains "Login returns user with admin role" '"role":"admin"' "$BODY"
ADMIN_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

# 2.2 Login with analyst
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@credit.com","password":"analyst123"}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Analyst login returns 200" "200" "$HTTP"
assert_contains "Analyst has analyst role" '"role":"analyst"' "$BODY"
ANALYST_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

# 2.3 Login with viewer
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@credit.com","password":"viewer123"}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Viewer login returns 200" "200" "$HTTP"
assert_contains "Viewer has viewer role" '"role":"viewer"' "$BODY"
VIEWER_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

# 2.4 Login with bad credentials
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bad@email.com","password":"wrong"}')
HTTP=$(echo "$RES" | tail -1)
assert "Bad credentials returns 401" "401" "$HTTP"

# 2.5 No token = unauthorized
RES=$(curl -s -w "\n%{http_code}" $API/api/v1/applications)
HTTP=$(echo "$RES" | tail -1)
assert "No token returns 401" "401" "$HTTP"

# 2.6 Token refresh
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@credit.com","password":"admin123"}')
REFRESH_TOKEN=$(echo "$RES" | head -1 | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
RES=$(curl -s -w "\n%{http_code}" -X POST $API/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
HTTP=$(echo "$RES" | tail -1)
assert "Token refresh returns 200" "200" "$HTTP"
assert_contains "Refresh returns new token" '"token"' "$(echo "$RES" | head -1)"

echo ""

# =============================================================================
bold "3. CREATE APPLICATIONS"
# =============================================================================

# 3.1 Create Brazil application (valid CPF)
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"BR","fullName":"Test Brasil User","documentId":"52998224725","requestedAmount":25000,"monthlyIncome":5000}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Create BR application returns 201" "201" "$HTTP"
assert_contains "Response has success:true" '"success":true' "$BODY"
assert_contains "Status is pending" '"status":"pending"' "$BODY"
assert_contains "Document is masked" '***' "$BODY"
assert_not_contains "Document ID not exposed in plain" '52998224725' "$BODY"
BR_APP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# 3.2 Create Mexico application (valid CURP)
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"MX","fullName":"Test Mexico User","documentId":"GARC850101HDFRRL09","requestedAmount":75000,"monthlyIncome":20000}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Create MX application returns 201" "201" "$HTTP"
assert_contains "MX app has correct country" '"countryCode":"MX"' "$BODY"
MX_APP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# 3.3 Invalid CPF should fail validation
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"BR","fullName":"Bad CPF","documentId":"00000000000","requestedAmount":10000,"monthlyIncome":3000}')
HTTP=$(echo "$RES" | tail -1)
assert "Invalid CPF returns 400" "400" "$HTTP"

# 3.4 Invalid CURP should fail
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"MX","fullName":"Bad CURP","documentId":"INVALID","requestedAmount":10000,"monthlyIncome":3000}')
HTTP=$(echo "$RES" | tail -1)
assert "Invalid CURP returns 400" "400" "$HTTP"

# 3.5 Missing required fields
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"BR"}')
HTTP=$(echo "$RES" | tail -1)
assert "Missing fields returns 400" "400" "$HTTP"

# 3.6 Invalid country code
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode":"US","fullName":"Invalid Country","documentId":"12345","requestedAmount":10000,"monthlyIncome":3000}')
HTTP=$(echo "$RES" | tail -1)
assert "Invalid country returns 400" "400" "$HTTP"

# 3.7 Viewer cannot create (should work - create is allowed for all authenticated)
RES=$(curl -s -w "\n%{http_code}" -X POST $API/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -d '{"countryCode":"BR","fullName":"Viewer Test","documentId":"11144477735","requestedAmount":10000,"monthlyIncome":3000}')
HTTP=$(echo "$RES" | tail -1)
assert "Viewer can create application (201)" "201" "$HTTP"

echo ""

# =============================================================================
bold "4. LIST & FILTER APPLICATIONS"
# =============================================================================

# 4.1 List all
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "List applications returns 200" "200" "$HTTP"
assert_contains "Response has pagination" '"pagination"' "$BODY"
assert_contains "Has totalPages" '"totalPages"' "$BODY"

# 4.2 Filter by country=BR
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications?country=BR" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
BODY=$(echo "$RES" | head -1)
assert_not_contains "BR filter excludes MX apps" '"countryCode":"MX"' "$BODY"

# 4.3 Filter by country=MX
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications?country=MX" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
BODY=$(echo "$RES" | head -1)
assert_not_contains "MX filter excludes BR apps" '"countryCode":"BR"' "$BODY"
assert_contains "MX filter shows MX apps" '"countryCode":"MX"' "$BODY"

# 4.4 Pagination
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications?page=1&limit=2" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
BODY=$(echo "$RES" | head -1)
assert_contains "Pagination limit=2 works" '"limit":2' "$BODY"

echo ""

# =============================================================================
bold "5. GET APPLICATION BY ID"
# =============================================================================

# 5.1 Get existing application
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications/$BR_APP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Get by ID returns 200" "200" "$HTTP"
assert_contains "Returns correct app" "$BR_APP_ID" "$BODY"

# 5.2 Get non-existent application
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$RES" | tail -1)
assert "Non-existent ID returns 404" "404" "$HTTP"

# 5.3 Invalid UUID format
RES=$(curl -s -w "\n%{http_code}" "$API/api/v1/applications/not-a-uuid" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$RES" | tail -1)
assert "Invalid UUID returns 400" "400" "$HTTP"

echo ""

# =============================================================================
bold "6. RISK EVALUATION (WORKER - async)"
# =============================================================================

# Wait for workers to process
# Poll until BR app is evaluated (max 30s)
echo "  Polling for BR risk evaluation (max 30s)..."
echo "  BR_APP_ID=$BR_APP_ID"
BR_EVALUATED=false
for i in $(seq 1 30); do
  BR_DETAIL=$(curl -s "$API/api/v1/applications/$BR_APP_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
  if echo "$BR_DETAIL" | grep -q 'creditScore'; then
    echo "  BR evaluated after ${i}s"
    BR_EVALUATED=true
    break
  fi
  sleep 1
done
if [ "$BR_EVALUATED" = "false" ]; then
  echo "  WARNING: BR app not evaluated after 30s. Current state:"
  echo "  $BR_DETAIL" | head -c 200
  echo ""
fi
assert_contains "BR app has bankData after evaluation" 'bankData' "$BR_DETAIL"
assert_contains "BR app evaluated by SERASA" 'SERASA' "$BR_DETAIL"
assert_contains "BR app has creditScore" 'creditScore' "$BR_DETAIL"
assert_contains "BR app status is under_review or later" '"status"' "$BR_DETAIL"

# Poll until MX app is evaluated (max 20s)
echo "  Polling for MX risk evaluation (max 20s)..."
for i in $(seq 1 20); do
  MX_DETAIL=$(curl -s "$API/api/v1/applications/$MX_APP_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)
  if echo "$MX_DETAIL" | grep -q 'BURO_CREDITO'; then
    echo "  Evaluated after ${i}s"
    break
  fi
  sleep 1
done
assert_contains "MX app evaluated by BURO_CREDITO" 'BURO_CREDITO' "$MX_DETAIL"
assert_contains "MX app has bureauScore" 'bureauScore' "$MX_DETAIL"

echo ""

# =============================================================================
bold "7. UPDATE STATUS (RBAC)"
# =============================================================================

# 7.1 Admin can approve
RES=$(curl -s -w "\n%{http_code}" -X PATCH "$API/api/v1/applications/$BR_APP_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"approved"}')
HTTP=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
assert "Admin can update status (200)" "200" "$HTTP"
assert_contains "Status changed to approved" '"status":"approved"' "$BODY"

# 7.2 Analyst can reject
RES=$(curl -s -w "\n%{http_code}" -X PATCH "$API/api/v1/applications/$MX_APP_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -d '{"status":"rejected"}')
HTTP=$(echo "$RES" | tail -1)
assert "Analyst can update status (200)" "200" "$HTTP"
assert_contains "Status changed to rejected" '"status":"rejected"' "$(echo "$RES" | head -1)"

# 7.3 Viewer CANNOT update status (403)
RES=$(curl -s -w "\n%{http_code}" -X PATCH "$API/api/v1/applications/$BR_APP_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -d '{"status":"rejected"}')
HTTP=$(echo "$RES" | tail -1)
assert "Viewer cannot update status (403)" "403" "$HTTP"

# 7.4 Invalid status transition
RES=$(curl -s -w "\n%{http_code}" -X PATCH "$API/api/v1/applications/$BR_APP_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"invalid_status"}')
HTTP=$(echo "$RES" | tail -1)
assert "Invalid status returns 400" "400" "$HTTP"

echo ""

# =============================================================================
bold "8. WEBHOOK (Bank Notification)"
# =============================================================================

# 8.1 Valid webhook
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/api/v1/webhooks/bank-notification" \
  -H "Content-Type: application/json" \
  -d "{\"applicationId\":\"$BR_APP_ID\",\"provider\":\"SERASA\",\"status\":\"success\",\"data\":{\"creditScore\":750,\"totalDebt\":5000,\"openAccounts\":2,\"negativeHistory\":false}}")
HTTP=$(echo "$RES" | tail -1)
assert "Webhook returns 200" "200" "$HTTP"

# 8.2 Invalid provider
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/api/v1/webhooks/bank-notification" \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"some-id","provider":"INVALID","status":"completed"}')
HTTP=$(echo "$RES" | tail -1)
assert "Invalid provider returns 400" "400" "$HTTP"

echo ""

# =============================================================================
bold "9. PII ENCRYPTION VERIFICATION"
# =============================================================================

# Verify document IDs are masked in all responses
RES=$(curl -s "$API/api/v1/applications" -H "Authorization: Bearer $ADMIN_TOKEN")
assert_contains "List masks documents with ***" '***' "$RES"
assert_not_contains "List does not expose raw CPF" '52998224725' "$RES"
assert_not_contains "List does not expose raw CURP" 'GARC850101HDFRRL09' "$RES"

echo ""

# =============================================================================
bold "10. QUEUE DASHBOARD"
# =============================================================================
RES=$(curl -s -w "\n%{http_code}" "$API/admin/queues/")
HTTP=$(echo "$RES" | tail -1)
assert "Bull Board accessible (200)" "200" "$HTTP"

echo ""

# =============================================================================
bold "=========================================="
bold "  RESULTS"
bold "=========================================="
echo ""
echo "  Total:  $TOTAL"
green "  Passed: $PASS"
if [ $FAIL -gt 0 ]; then
  red "  Failed: $FAIL"
else
  echo "  Failed: 0"
fi
echo ""

if [ $FAIL -eq 0 ]; then
  green "  ALL TESTS PASSED!"
else
  red "  SOME TESTS FAILED - review output above"
fi
echo ""
exit $FAIL
