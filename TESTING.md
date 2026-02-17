# Testing Guide - Credit System MVP

## 1. Start the System

```bash
cp .env.example .env
make dev-docker
```

Wait until you see in the logs:
```
credit-system-backend  | Auto-seed completed: 6 applications created (3 BR, 3 MX)
credit-system-backend  | Backend server running on port 3000
credit-system-worker   | All workers started and listening for jobs
credit-system-frontend | VITE ready
```

No additional steps needed. The database seeds automatically.

## 2. Unit Tests

```bash
# Run all 141 tests
pnpm turbo test
```

Expected: 99 backend + 42 frontend tests passing.

---

## 3. Frontend Testing (Browser)

### 3.1 Login

1. Open http://localhost:5173
2. The login form is pre-filled with `admin@credit.com` / `admin123`
3. Click **Login**
4. You should see:
   - Title "Applications" with a green dot and "Real-time" below it
   - A table with 6 applications from the seed data
   - Filters for Country and Status
   - A "New Application" button

### 3.2 Dashboard Filters

1. Select Country: **Brazil** -> only 3 rows (Carlos, Maria, Ana)
2. Select Country: **Mexico** -> only 3 rows (Juan, Sofia, Roberto)
3. Select Status: **Approved** -> 2 rows (Ana Santos, Roberto Martinez)
4. Select Status: **Rejected** -> 1 row (Sofia Lopez)
5. Reset both filters to "All" -> 6 rows

### 3.3 Test Auto-Approve (Brazil)

**Why it auto-approves:** This CPF generates creditScore=790 (>= 600), no negative history, and with the amounts below the debt-to-income ratio stays under 50%. All 4 Brazil criteria pass.

1. Click **"New Application"**
2. Fill in:
   - Country: **Brazil**
   - Full Name: `Lucas Ferreira`
   - CPF: `11144477735`
   - Requested Amount: `5000`
   - Monthly Income: `16000`
3. Click **Submit Application**
4. You arrive at the detail page with status **Pending** (yellow badge, pulsing dot)
5. **Wait 2-4 seconds without refreshing** — the worker is calling the simulated SERASA bank API
6. The page updates automatically:
   - Status changes to **Approved** (green badge)
   - A **"Bank Evaluation Data"** card appears showing: creditScore: 790, provider: SERASA
7. Click **"Back to Dashboard"** -> the application shows as Approved in the table

### 3.4 Test Auto-Reject (Brazil)

**Why it auto-rejects:** This CPF generates creditScore=557, which is below the minimum threshold of 600. The system auto-rejects applications with low credit scores.

1. Click **"New Application"**
2. Fill in:
   - Country: **Brazil**
   - Full Name: `Pedro Almeida`
   - CPF: `52998224725`
   - Requested Amount: `5000`
   - Monthly Income: `8000`
3. Click **Submit Application**
4. **Wait 2-4 seconds** — the worker evaluates and determines the score is too low
5. The page updates automatically:
   - Status changes to **Rejected** (red badge)
   - Bank data card shows: creditScore: 557, provider: SERASA

### 3.5 Test Under Review (Brazil)

**Why it goes to Under Review:** This CPF generates creditScore=801 (>= 600, so the score is good), but has negativeHistory=true. The score is high enough that the system doesn't auto-reject; instead it flags it for manual human review.

1. Click **"New Application"**
2. Fill in:
   - Country: **Brazil**
   - Full Name: `Ana Revisao`
   - CPF: `31785409620`
   - Requested Amount: `5000`
   - Monthly Income: `15000`
3. Click **Submit Application**
4. **Wait 2-4 seconds** — the worker evaluates and finds negative credit history
5. The page updates automatically:
   - Status changes to **Under Review** (blue badge)
   - Bank data card shows: creditScore: 801, negativeHistory: true, provider: SERASA
6. This application now needs a **manual decision** — we'll do that in section 3.9

### 3.6 Test Auto-Approve (Mexico)

**Why it auto-approves:** This CURP generates bureauScore=830 (>= 650), activeLoans=1 (<= 3), paymentHistory=good, and the amount is under 100,000 MXN. All 5 Mexico criteria pass.

1. Click **"New Application"**
2. Fill in:
   - Country: **Mexico**
   - Full Name: `Pedro Alvarez`
   - CURP: `PEAA901231HDFRRL02`
   - Requested Amount: `50000`
   - Monthly Income: `80000`
3. Click **Submit Application**
4. **Wait 2-4 seconds** — the worker is calling the simulated Buro de Credito bank API
5. The page updates automatically:
   - Status changes to **Approved** (green badge)
   - Bank data card shows: bureauScore: 830, activeLoans: 1, provider: BURO_CREDITO
6. Click **"Back to Dashboard"** -> the application shows as Approved in the table

### 3.7 Test Auto-Reject (Mexico)

**Why it auto-rejects:** This CURP generates bureauScore=551, which is below the minimum threshold of 650 (and below 600 for auto-reject). The system auto-rejects applications with very low bureau scores.

1. Click **"New Application"**
2. Fill in:
   - Country: **Mexico**
   - Full Name: `Sofia Rechazo`
   - CURP: `MXRV880512HDFNLR08`
   - Requested Amount: `50000`
   - Monthly Income: `25000`
3. Click **Submit Application**
4. **Wait 2-4 seconds** — the worker evaluates and determines the score is too low
5. The page updates automatically:
   - Status changes to **Rejected** (red badge)
   - Bank data card shows: bureauScore: 551, provider: BURO_CREDITO

### 3.8 Test Under Review (Mexico)

**Why it goes to Under Review:** This CURP generates bureauScore=683 (>= 600, so it's not auto-rejected), but activeLoans=5 (exceeds maximum of 3). The score is decent but other criteria fail, so the system flags it for manual review.

1. Click **"New Application"**
2. Fill in:
   - Country: **Mexico**
   - Full Name: `Laura Hernandez`
   - CURP: `GARC850101HDFRRL09`
   - Requested Amount: `50000`
   - Monthly Income: `25000`
3. Click **Submit Application**
4. **Wait 2-4 seconds** — the worker evaluates and finds too many active loans
5. The page updates automatically:
   - Status changes to **Under Review** (blue badge)
   - Bank data card shows: bureauScore: 683, activeLoans: 5, provider: BURO_CREDITO
6. This application now needs a **manual decision** — we'll do that next

### 3.9 Manual Status Change (Approve or Reject)

Applications in **Under Review** require a human analyst to make the final decision.

**Test a manual rejection:**

1. Go to the Dashboard
2. Click on **"Ana Revisao"** (the Under Review application from section 3.5)
3. In the detail page, you see an **"Update Status"** card with two buttons:
   - **"Approved"** (green) — to manually approve
   - **"Rejected"** (red) — to manually reject
4. Click **"Rejected"**
5. The status badge updates immediately to **Rejected** (red badge)
6. Go back to Dashboard -> the table reflects the change in real-time

**Test a manual approval:**

1. Click on **"Laura Hernandez"** (the Under Review application from section 3.8)
2. Click **"Approved"** (green)
3. The status changes to **Approved** (green badge)

### 3.10 Real-Time Updates (Two Tabs)

1. Open **Tab 1**: Dashboard (logged in as admin)
2. Open **Tab 2**: Dashboard (same browser, new tab)
3. In **Tab 1**: create a new application
4. In **Tab 2**: the new application appears in the table automatically (no refresh)
5. Wait for the worker to process it -> status updates in **both tabs** simultaneously
6. In **Tab 1**: click on an application and change its status manually
7. In **Tab 2**: the table refreshes automatically to show the new status

### 3.11 Role-Based Permissions

1. Open an incognito window at http://localhost:5173
2. Login with `viewer@credit.com` / `viewer123`
3. Dashboard loads normally (you can see all applications)
4. Click on any application's name -> detail page loads
5. The **"Update Status" card does NOT appear** (viewer has read-only access)
6. Go back and try `analyst@credit.com` / `analyst123` -> the Update Status card IS visible

### 3.12 Form Validation

1. Click "New Application"
2. Click **Submit** with empty fields -> validation errors appear
3. Select Brazil, type an invalid CPF like `00000000000` -> "Invalid CPF"
4. Select Mexico, type an invalid CURP like `ABCDEF` -> "Invalid CURP"
5. Enter a negative amount -> "Must be positive"
6. Fill everything correctly and submit -> success

---

## 4. How the Processing Flow Works

When you create an application, this happens automatically:

```
Create Application (frontend)
  → API saves to PostgreSQL (status: pending)
  → Enqueues "risk-evaluation" job to BullMQ (Redis)
  → WebSocket notifies dashboard in real-time

Worker picks up the job (2-4 seconds later):
  → Calls simulated bank provider (SERASA for BR, BURO_CREDITO for MX)
  → Evaluates country-specific business rules
  → Updates status (approved or under_review) and bankData in DB
  → WebSocket notifies frontend via Redis pub/sub
  → Frontend updates automatically (no refresh needed)
```

**Business Rules - Brazil (SERASA):**
- Credit score >= 600
- Monthly income >= 3x the monthly installment (12-month loan)
- No negative credit history
- Debt-to-income ratio < 50%

**Business Rules - Mexico (Buró de Crédito):**
- Bureau score >= 650
- Debt-to-income ratio < 40%
- Payment history is not "bad"
- Active loans <= 3
- Requested amount <= 100,000 MXN for auto-approval

---

## 5. Bull Board (Queue Dashboard)

Open http://localhost:3000/admin/queues in your browser.

**What is Bull Board?** It's a visual dashboard for monitoring BullMQ job queues. It shows you what's happening with background processing in real-time.

You will see 3 queues:

| Queue | Purpose | When it triggers |
|---|---|---|
| `risk-evaluation` | Calls bank provider + evaluates business rules | When a new application is created |
| `audit` | Records events in the application_events table | On creation, status changes, risk evaluation |
| `notification` | Sends notifications (logs in MVP) | When an application reaches approved/rejected |

**What you can see for each queue:**
- **Completed**: Jobs that finished successfully (click to see job data and result)
- **Failed**: Jobs that errored (click to see the error message and stack trace)
- **Active**: Jobs currently being processed
- **Waiting**: Jobs in queue waiting to be picked up
- **Delayed**: Jobs scheduled for later execution

**How to use it:**
1. Create a new application in the frontend
2. Open Bull Board → you'll see a new job appear in `risk-evaluation` (Active → Completed)
3. Click on the completed job to see the input data (applicationId, countryCode)
4. The `audit` queue will show audit events being recorded
5. If the application reaches approved/rejected, a `notification` job appears

This is useful for debugging: if an application stays in "Pending" forever, check Bull Board for failed jobs.

---

## 6. Backend Testing (curl)

### 6.1 Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 6.2 Login and Get Token

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@credit.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['data']['token'])")

echo $TOKEN
```

### 6.3 List Applications

```bash
# All applications
curl -s http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Filter by country
curl -s "http://localhost:3000/api/v1/applications?country=BR" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Filter by status
curl -s "http://localhost:3000/api/v1/applications?status=approved" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 6.4 Create Application - Auto Approved (Brazil)

```bash
curl -s -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "countryCode": "BR",
    "fullName": "Lucas Ferreira",
    "documentId": "11144477735",
    "requestedAmount": 10000,
    "monthlyIncome": 15000
  }' | python3 -m json.tool
```

Save the returned `id`. Wait 3-4 seconds, then:

```bash
APP_ID="<paste-uuid-here>"
curl -s http://localhost:3000/api/v1/applications/$APP_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `status: "approved"`, bankData with `creditScore: 790`.

### 6.5 Create Application - Auto Reject (Brazil)

```bash
curl -s -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "countryCode": "BR",
    "fullName": "Pedro Almeida",
    "documentId": "52998224725",
    "requestedAmount": 5000,
    "monthlyIncome": 8000
  }' | python3 -m json.tool
```

Wait 3-4 seconds and check. Expected: `status: "rejected"`, bankData with `creditScore: 557` (below 600 threshold).

### 6.6 Manual Rejection (from Under Review)

```bash
# Use the APP_ID from the under_review application above
curl -s -X PATCH http://localhost:3000/api/v1/applications/$APP_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "rejected"}' | python3 -m json.tool
```

Expected: `status: "rejected"`.

Valid transitions:
- `pending` -> `under_review`, `approved` or `rejected`
- `under_review` -> `approved` or `rejected`

### 6.7 Webhook (Simulate Bank Notification)

You can manually inject bank data via the webhook endpoint. This overrides the worker's simulated data.

**Force an approval** (high score, low debt):
```bash
curl -s -X POST http://localhost:3000/api/v1/webhooks/bank-notification \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "'$APP_ID'",
    "provider": "SERASA",
    "status": "success",
    "data": {
      "creditScore": 900,
      "totalDebt": 500,
      "openAccounts": 1,
      "negativeHistory": false,
      "evaluatedAt": "2026-01-01T12:00:00Z",
      "provider": "SERASA"
    },
    "timestamp": "2026-01-01T12:00:00Z"
  }' | python3 -m json.tool
```

**Force a rejection** (low score, bad history):
```bash
curl -s -X POST http://localhost:3000/api/v1/webhooks/bank-notification \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "'$APP_ID'",
    "provider": "SERASA",
    "status": "success",
    "data": {
      "creditScore": 350,
      "totalDebt": 200000,
      "openAccounts": 8,
      "negativeHistory": true,
      "evaluatedAt": "2026-02-01T12:00:00Z",
      "provider": "SERASA"
    },
    "timestamp": "2026-02-01T12:00:00Z"
  }' | python3 -m json.tool
```

If you have the frontend open on that application's detail page, it updates in real-time.

### 6.8 Authorization Test

```bash
# Login as viewer
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@credit.com","password":"viewer123"}' \
  | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['data']['token'])")

# Viewer CAN list applications
curl -s http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $VIEWER_TOKEN" | python3 -m json.tool | head -5

# Viewer CANNOT change status (returns 403)
curl -s -X PATCH http://localhost:3000/api/v1/applications/$APP_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -d '{"status":"approved"}' | python3 -m json.tool

# No token at all (returns 401)
curl -s http://localhost:3000/api/v1/applications | python3 -m json.tool
```

---

## 7. Test Data Reference

### Users

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@credit.com` | `admin123` | Admin | Full access (create, read, update status) |
| `analyst@credit.com` | `analyst123` | Analyst | Create, read, update status |
| `viewer@credit.com` | `viewer123` | Viewer | Read-only |

### Brazil Test Documents (CPF)

| CPF | Credit Score | Negative History | Best tested with | Expected Result |
|---|---|---|---|---|
| `11144477735` | 790 | No | amount=5000, income=16000 | **Approved** (all criteria pass) |
| `52998224725` | 557 | No | amount=5000, income=8000 | **Rejected** (score < 600) |
| `31785409620` | 801 | Yes | amount=5000, income=15000 | **Under Review** (score OK but negative history) |

### Mexico Test Documents (CURP)

| CURP | Bureau Score | Payment History | Active Loans | Best tested with | Expected Result |
|---|---|---|---|---|---|
| `PEAA901231HDFRRL02` | 830 | good | 1 | amount=50000, income=80000 | **Approved** (all criteria pass) |
| `MXRV880512HDFNLR08` | 551 | good | 1 | amount=50000, income=25000 | **Rejected** (score < 600) |
| `GARC850101HDFRRL09` | 683 | good | 5 | amount=50000, income=25000 | **Under Review** (score OK but loans > 3) |

### Seed Data (pre-loaded)

| Name | Country | Status | Notes |
|---|---|---|---|
| Carlos Silva | BR | Pending | No bank data yet |
| Maria Oliveira | BR | Under Review | Has SERASA data (score: 720) |
| Ana Santos | BR | Approved | Has SERASA data (score: 850) |
| Juan Garcia | MX | Pending | No bank data yet |
| Sofia Lopez | MX | Rejected | Has BURO_CREDITO data (score: 520) |
| Roberto Martinez | MX | Approved | Has BURO_CREDITO data (score: 780) |

---

## 8. Infrastructure Verification

### 8.1 Check All Containers

```bash
docker compose ps
```

All 5 services should show "Up": postgres (healthy), redis (healthy), backend, worker, frontend.

### 8.2 Database Inspection

```bash
make db-shell
```

```sql
-- View all applications
SELECT id, country_code, full_name, status, requested_amount FROM applications ORDER BY created_at;

-- View audit events
SELECT ae.event_type, ae.event_data, a.full_name
FROM application_events ae
JOIN applications a ON a.id = ae.application_id
ORDER BY ae.created_at DESC LIMIT 10;

-- View jobs
SELECT type, status, attempts FROM jobs ORDER BY created_at DESC LIMIT 10;

-- Exit
\q
```

### 8.3 Redis Inspection

```bash
make redis-shell
```

```
KEYS bull:*
KEYS application:*
QUIT
```

### 8.4 Worker Logs

```bash
docker compose logs -f worker
```

You should see messages like:
```
SERASA: starting evaluation {"applicationId":"..."}
SERASA: evaluation completed {"applicationId":"...","creditScore":790}
Risk evaluation completed for ...: approved (score: 790)
```

---

## 9. Clean Up

```bash
# Stop everything
docker compose down

# Stop and delete all data (clean slate)
docker compose down -v

# Full cleanup (node_modules, build artifacts, docker volumes)
make clean
```
