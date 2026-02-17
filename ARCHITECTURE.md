# Architecture & Design Decisions

## 1. Architecture: Clean Architecture

The backend follows Clean Architecture (Robert C. Martin) with 4 layers. The key rule is: **dependencies point inward** — outer layers know about inner layers, never the reverse.

```
┌─────────────────────────────────────────────────────┐
│  Presentation (routes, controllers, middlewares)     │  ← Express, Socket.IO
│  ┌─────────────────────────────────────────────┐    │
│  │  Application (use cases, DTOs)              │    │  ← Orchestration
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │  Domain (entities, VOs, rules,      │    │    │  ← Zero dependencies
│  │  │          interfaces, factories)     │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│  Infrastructure (DB, cache, queue, providers)        │  ← Implements domain interfaces
└─────────────────────────────────────────────────────┘
```

**Why:** Testability (domain logic has no framework dependencies), flexibility (swap Prisma for another ORM without touching business rules), and clarity (each layer has a single responsibility).

**In practice:**
- `domain/` defines `IApplicationRepository` (interface) — says *what* operations exist
- `infrastructure/` implements `PrismaApplicationRepository` — says *how* using Prisma
- `application/` use cases receive the interface via constructor injection — they never know about Prisma
- `container.ts` wires everything together (poor man's DI container)

---

## 2. Design Patterns

### Strategy Pattern — Country Rules

Each country has different credit evaluation rules. Instead of `if (country === 'BR') { ... } else if (country === 'MX') { ... }`, each country is a class implementing `ICountryRule`:

```
ICountryRule (interface)
├── BrazilRule      → evaluateRisk() with SERASA criteria
└── MexicoRule      → evaluateRisk() with Buro criteria
```

**Adding a new country (e.g., Colombia):** Create `ColombiaRule`, create `DataCreditoProvider`, register both in their factories. Zero changes to existing code.

### Strategy Pattern — Bank Providers

Same pattern for external bank APIs:

```
IBankProvider (interface)
├── SerasaBankProvider        → Brazil (SERASA)
└── BuroCreditoBankProvider   → Mexico (Buro de Credito)
```

Both are simulated with deterministic data based on `simpleHash(documentId)`, making tests reproducible.

### Factory Pattern — Country Resolution

`CountryRuleFactory` and `BankProviderFactory` encapsulate the mapping from country code to the correct strategy:

```typescript
// Instead of switch/case scattered everywhere:
const rule = countryRuleFactory.getRule('BR');  // → BrazilRule
const provider = bankProviderFactory.getProvider('MX');  // → BuroCreditoBankProvider
```

### Repository Pattern — Data Access

Domain defines the contract, infrastructure fulfills it:

```typescript
// Domain layer (no Prisma knowledge)
interface IApplicationRepository {
  findById(id: string): Promise<Application | null>;
  create(application: Application): Promise<Application>;
  updateStatus(id: string, status: string): Promise<Application>;
}

// Infrastructure layer (Prisma implementation)
class PrismaApplicationRepository implements IApplicationRepository { ... }
```

**Benefit:** Use cases are testable with in-memory mocks. The domain never imports `@prisma/client`.

### Value Object Pattern — Domain Integrity

Value Objects encapsulate validation and business rules. They are immutable and compared by value:

```typescript
const status = ApplicationStatus.create('pending');
status.canTransitionTo('approved');  // true (state machine)
status.canTransitionTo('pending');   // false (can't go back)

const money = Money.create(50000, 'BRL');
money.isPositive();  // true

const country = CountryCode.create('BR');  // validates against allowed list
```

**Why:** Invalid states are impossible. You can't create `Money.create(-100, 'BRL')` — it throws. Business rules live in the domain, not scattered across controllers.

### State Machine — Application Status

Transitions are defined declaratively in `shared/constants`:

```
pending → approved       (auto-approval by worker)
pending → rejected       (auto-rejection by worker)
pending → under_review   (borderline cases)
under_review → approved  (manual decision)
under_review → rejected  (manual decision)
approved → (terminal)
rejected → (terminal)
```

The `ApplicationStatus` value object enforces this. Invalid transitions throw `ValidationError` before touching the database.

---

## 3. Async Processing Architecture

### Why Async?

Bank API calls take 2-4 seconds. If done synchronously in the HTTP request, the user waits. Instead:

```
HTTP Request (50ms)          Worker Process (2-4s)
─────────────────           ─────────────────────
POST /applications    →     risk-evaluation queue    →    Bank API call
  ↓ save to DB              ↓ pick up job                 ↓ evaluate rules
  ↓ enqueue job             ↓ update status               ↓ update DB
  ↓ return 201              ↓ emit WebSocket              ↓ notify frontend
  (user sees "pending")     (user sees "approved")
```

### Three Queues, Three Purposes

| Queue | Concurrency | Purpose |
|-------|-------------|---------|
| `risk-evaluation` | 2 | I/O bound (bank API calls). Two concurrent workers to handle throughput |
| `audit` | 3 | Fast DB inserts. Higher concurrency because operations are quick |
| `notification` | 1 | Serial delivery. Prevents flooding external systems |

**BullMQ guarantees:** At-least-once delivery, automatic retries (3 attempts, exponential backoff), job persistence in Redis.

### Worker ↔ Backend Communication

The worker runs in a separate container (no HTTP server, no Socket.IO). How does it notify the frontend?

```
Worker                    Redis                     Backend                  Browser
  │                         │                         │                       │
  ├─ PUBLISH ws:events ────→│                         │                       │
  │                         ├─ MESSAGE ──────────────→│                       │
  │                         │                         ├─ socket.emit() ──────→│
  │                         │                         │                       │ (real-time update)
```

Redis Pub/Sub bridges the gap. The backend subscribes to a channel, receives messages from the worker, and forwards them via Socket.IO to connected clients.

---

## 4. Caching Strategy

### Cache-Aside Pattern

```
Request → Check Redis → HIT? → Return cached data
                      → MISS? → Query PostgreSQL → Store in Redis → Return
```

### Invalidation

The tricky part of caching. Our approach:

- **On create:** Invalidate all list caches (`applications:*`) — a new item changes any list
- **On status update:** Invalidate specific app cache + all list caches
- **On risk evaluation:** Same as status update (worker invalidates via `cacheService`)
- **Pattern-based:** Uses Redis `SCAN` to find and delete matching keys (no `KEYS *` which blocks Redis)

### Graceful Degradation

If Redis is down, the app still works — it just hits PostgreSQL directly. Cache operations are wrapped in try/catch and never crash the request.

---

## 5. Security Layers

### PII Encryption (AES-256-GCM)

Document IDs (CPF, CURP) contain personal data. They're encrypted before storage:

```
Input:  "52998224725"
Stored: "a1b2c3:d4e5f6:7890ab..."  (iv:authTag:ciphertext in hex)
API:    "***...4725"  (masked for responses)
```

**AES-256-GCM** provides both confidentiality and integrity (authenticated encryption). Each encryption uses a random IV, so the same input produces different ciphertexts — preventing pattern analysis.

**Trade-off:** Can't search by encrypted field (different IVs). Duplicate detection requires decrypting all records for the country and comparing. At scale, a separate HMAC hash column would allow indexed searches.

### JWT with Token Types

```typescript
// Access token (24h) — used for API calls
{ userId, email, role, type: "access" }

// Refresh token (7d) — used to get new access tokens
{ userId, email, role, type: "refresh" }
```

The `type` claim prevents using a refresh token as an access token (and vice versa). The `verifyRefresh()` method checks `type === 'refresh'`.

### RBAC (Role-Based Access Control)

```
admin   → create, read, update status
analyst → create, read, update status
viewer  → read only
```

Enforced at two levels:
1. **Backend middleware:** `authorize('admin', 'analyst')` on PATCH routes
2. **Frontend:** Status update buttons hidden for viewer role

---

## 6. Monorepo Architecture

### Why Turborepo + pnpm Workspaces?

```
CreditSystem/
├── packages/shared/    → Types, Zod schemas, constants
├── apps/backend/       → Express API + Workers
└── apps/frontend/      → React SPA
```

**Shared package** is the key benefit. `ApplicationStatus`, `CountryCode`, `CreateApplicationSchema` are defined once and used in both frontend and backend. Type changes propagate at compile time — no runtime surprises.

**Turborepo** handles:
- Build order (`shared` before `backend` and `frontend`)
- Caching (only rebuild what changed)
- Parallel execution (`backend` and `frontend` build simultaneously)

---

## 7. Real-Time Architecture

### Socket.IO Rooms

Clients subscribe to "rooms" based on what they're viewing:

```
Dashboard viewing all     → rooms: ['country:BR', 'country:MX']
Dashboard filtered to BR  → rooms: ['country:BR']
Detail page for app X     → rooms: ['application:X']
```

When the worker finishes evaluating an application:
1. Emits to `application:{id}` room → detail page updates
2. Emits to `country:{code}` room → dashboard list updates

### Why Not Polling?

With 100 users viewing dashboards, polling every 2 seconds = 50 requests/second to the API. WebSocket = 0 requests until something actually changes. The server pushes only when there's new data.

---

## 8. Database Design Decisions

### PostgreSQL Triggers as Event Source

Three triggers run automatically at the database level:

| Trigger | When | What |
|---------|------|------|
| `trigger_updated_at` | BEFORE UPDATE | Sets `updated_at = NOW()` |
| `trigger_status_change` | AFTER UPDATE of status | Inserts row in `application_events` |
| `trigger_risk_evaluation` | AFTER INSERT | Creates job in `jobs` table |

**Why triggers?** They run regardless of which process modifies data (API, worker, manual SQL). The audit trail is guaranteed even if the application code has a bug.

### JSONB for Bank Data

```sql
bank_data JSONB  -- not a separate table
```

Brazil and Mexico return different fields (`creditScore` vs `bureauScore`, `negativeHistory` vs `paymentHistory`). JSONB handles this naturally without complex table inheritance or EAV patterns. The GIN index enables querying inside the JSON.

---

## 9. Key Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| AES-256-GCM with random IV | Same document encrypts differently each time (no pattern leaks) | Can't search by encrypted field; duplicate check requires decrypt-and-compare |
| BullMQ over pg-boss | Redis already in stack for cache; proven reliability; dashboard | Additional infrastructure dependency (Redis) |
| Deterministic mock providers | Tests are reproducible; same CPF always produces same score | Not realistic (real bank APIs return different data over time) |
| Auto-seed on startup | Zero setup for developers; `make dev-docker` and it works | Risk of accidentally seeding production (guarded by empty-DB check) |
| Hardcoded MVP users | Fast iteration, no user management complexity | Not production-ready; real auth would use bcrypt + DB store |
| Single commit message style | Clean git history | Large commits harder to bisect |

---

## 10. Request Lifecycle (Complete Flow)

```
Browser: POST /api/v1/applications { fullName, documentId, countryCode, ... }
   │
   ├─ nginx (frontend container) proxies /api/* to backend:3000
   │
   ▼
Backend: Express middleware chain
   │
   ├─ helmet()           → Security headers
   ├─ cors()             → Origin validation
   ├─ requestId()        → Generates X-Request-ID
   ├─ requestLogger()    → Logs method, URL, duration
   ├─ rateLimiter()      → Redis-backed rate limiting
   ├─ authMiddleware()   → Validates JWT, extracts user
   ├─ validation()       → Zod schema validation
   │
   ▼
Controller: applicationController.create(req, res)
   │
   ▼
Use Case: createApplicationUseCase.execute(dto)
   │
   ├─ Validate document (CPF/CURP) via CountryRuleFactory
   ├─ Check for duplicates (decrypt + compare)
   ├─ Create Application entity (domain layer)
   ├─ Repository.create() → encrypts documentId → saves to PostgreSQL
   ├─ QueueService.enqueue('risk-evaluation', { applicationId, countryCode })
   ├─ QueueService.enqueue('audit', { applicationId, eventType: 'created' })
   ├─ WebSocket.emitToCountry(countryCode, 'application:created', ...)
   ├─ CacheService.invalidate('applications:*')
   │
   ▼
Response: 201 { success: true, data: { id, status: "pending", ... } }

   ... 2-4 seconds later ...

Worker: risk-evaluation queue picks up the job
   │
   ├─ Fetch application from DB (documentId is decrypted)
   ├─ BankProviderFactory.getProvider(countryCode) → SerasaBankProvider
   ├─ provider.evaluate() → simulated API call (2-4s delay)
   ├─ CountryRuleFactory.getRule(countryCode) → BrazilRule
   ├─ rule.evaluateRisk(application, bankData) → { approved, score, reason }
   ├─ determineStatusFromRisk(result) → 'approved' | 'rejected' | 'under_review'
   ├─ Repository.updateBankData() → stores JSONB
   ├─ Repository.updateStatus() → atomic update
   ├─ CacheService.invalidate() → clears stale cache
   ├─ Redis PUBLISH ws:events → backend picks up → Socket.IO → browser updates
   ├─ QueueService.enqueue('audit', { eventType: 'risk_evaluated' })
   ├─ QueueService.enqueue('notification', ...) → if terminal status
   │
   ▼
Browser: WebSocket receives 'application:risk-evaluated'
   → Zustand store updates → React re-renders → user sees new status
```
