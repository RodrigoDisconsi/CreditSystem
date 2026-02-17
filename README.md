# Credit System MVP

Multi-country credit application management system with async risk evaluation, real-time updates, and role-based access control.

**Countries supported:** Brazil (BR) and Mexico (MX)

## Quick Start (< 5 minutes)

### Prerequisites
- Docker and Docker Compose

### Run with Docker Compose

```bash
git clone <repo-url> && cd CreditSystem
cp .env.example .env
make dev-docker
```

This starts all services: PostgreSQL, Redis, Backend API (:3000), Worker, and Frontend (:5173).
The database is automatically seeded with 6 sample applications (3 BR, 3 MX) on first startup.

Open http://localhost:5173 and login with `admin@credit.com` / `admin123`.

### Local Development (without Docker for app code)

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Install dependencies
pnpm install

# 3. Generate Prisma client and sync DB
cd apps/backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/credit_system" pnpm exec prisma db push && cd ../..

# 4. Build shared package
pnpm turbo build --filter=@credit-system/shared

# 5. Start all services (3 terminals)
# Terminal 1: Backend API
source .env && pnpm --filter @credit-system/backend dev

# Terminal 2: Worker
source .env && pnpm --filter @credit-system/backend worker

# Terminal 3: Frontend
pnpm --filter @credit-system/frontend dev
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Health Check | http://localhost:3000/health |
| Bull Board (Queue Dashboard) | http://localhost:3000/admin/queues |

### Demo Users

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@credit.com | admin123 | Admin | Full access: create, read, update status |
| analyst@credit.com | analyst123 | Analyst | Create, read, update status |
| viewer@credit.com | viewer123 | Viewer | Read only |

## Testing

```bash
# All tests (141 tests: 99 backend + 42 frontend)
pnpm turbo test

# Backend only
pnpm --filter @credit-system/backend test

# Frontend only
pnpm --filter @credit-system/frontend test
```

See [TESTING.md](TESTING.md) for the full end-to-end testing guide.

## Architecture

### Monorepo Structure

```
CreditSystem/
├── apps/
│   ├── backend/          # Express API + Workers (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/           # Entities, Value Objects, Rules, Interfaces
│   │   │   ├── application/      # Use Cases, DTOs
│   │   │   ├── infrastructure/   # DB, Cache, Queue, Providers, Security
│   │   │   ├── presentation/     # Routes, Controllers, Middlewares, WebSocket
│   │   │   ├── workers/          # Background job processors
│   │   │   ├── startup/          # Auto-seed logic
│   │   │   ├── main.ts           # HTTP server entry point
│   │   │   └── worker.ts         # Worker process entry point
│   │   └── prisma/               # Schema definition + seed script
│   └── frontend/         # React SPA
│       └── src/
│           ├── components/       # UI and domain components
│           ├── hooks/            # Custom hooks (useApplications, useWebSocket)
│           ├── pages/            # Route pages
│           ├── services/         # API and WebSocket clients
│           └── stores/           # Zustand state management
├── packages/
│   └── shared/           # Shared types, validation schemas (Zod)
├── docker/               # Dockerfiles, nginx config, SQL init scripts
├── k8s/                  # Kubernetes manifests
└── Makefile              # Common commands
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Express + TypeScript, Clean Architecture |
| **Frontend** | React 18 + Vite + TailwindCSS + Zustand |
| **Database** | PostgreSQL 15 with triggers and functions |
| **Cache** | Redis 7 (cache-aside pattern) |
| **Queue** | BullMQ (Redis-backed) |
| **Real-time** | Socket.IO + Redis Pub/Sub |
| **Auth** | JWT (access + refresh tokens) |
| **Encryption** | AES-256-GCM for PII |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Testing** | Vitest + Testing Library |

### Clean Architecture Layers

```
Presentation → Application → Domain ← Infrastructure
(routes,       (use cases,   (entities,  (database,
 controllers,   DTOs)         rules,      cache,
 middlewares)                  interfaces) providers)
```

Dependencies flow inward. Domain has zero external dependencies. Infrastructure implements domain interfaces via dependency injection.

## Data Model

### Entity Relationship

```
┌─────────────────┐      ┌──────────────────────┐      ┌──────────┐
│  applications   │──1:N─│  application_events   │      │   jobs   │
├─────────────────┤      ├──────────────────────┤      ├──────────┤
│ id (UUID PK)    │      │ id (UUID PK)         │      │ id       │
│ country_code    │      │ application_id (FK)  │      │ type     │
│ full_name       │      │ event_type           │      │ payload  │
│ document_id *   │      │ event_data (JSONB)   │      │ status   │
│ requested_amount│      │ created_at           │      │ attempts │
│ monthly_income  │      └──────────────────────┘      │ error    │
│ status          │                                     └──────────┘
│ bank_data (JSONB)│
│ created_at      │
│ updated_at      │
└─────────────────┘
* document_id is encrypted with AES-256-GCM
```

### Database Indices

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `idx_applications_country_status` | (country_code, status) | B-tree composite | Filter by country + status |
| `idx_applications_created_at` | (created_at DESC) | B-tree | Sort by newest |
| `idx_applications_bank_data` | (bank_data) | GIN | JSONB queries on bank data |
| `idx_events_application` | (application_id) | B-tree | Event lookup by application |
| `idx_jobs_pending` | (status) WHERE status='pending' | Partial | Efficient pending job queries |

### PostgreSQL Triggers

| Trigger | Event | Action |
|---------|-------|--------|
| `trigger_updated_at` | BEFORE UPDATE on applications | Auto-sets `updated_at = NOW()` |
| `trigger_status_change` | AFTER UPDATE of status | Inserts event in `application_events` |
| `trigger_risk_evaluation` | AFTER INSERT on applications | Creates job in `jobs` table |

## Business Rules

### Brazil (BR)
- **Document:** CPF (11 digits with check digit validation)
- **Bank Provider:** SERASA (simulated, 2-4s latency)
- **Risk Rules:**
  - Credit score >= 600 required
  - Monthly income >= 3x monthly installment (amount / 12 months)
  - No negative credit history
  - Debt-to-income ratio < 50%
  - All criteria met → Approved; score >= 600 but other criteria fail → Under Review; score < 600 → Rejected

### Mexico (MX)
- **Document:** CURP (18 chars with format validation)
- **Bank Provider:** Buro de Credito (simulated, 2-4s latency)
- **Risk Rules:**
  - Bureau score >= 650 required
  - Debt-to-income ratio < 40%
  - Payment history must not be "bad"
  - Active loans <= 3
  - Amount <= $100,000 MXN for auto-approval (above requires manual review)
  - All criteria met → Approved; score >= 600 but other criteria fail → Under Review; score < 600 → Rejected

### Status Flow

```
pending → approved   (auto-approval if all criteria pass)
pending → rejected   (auto-rejection if credit score too low)
pending → under_review → approved  (manual decision by analyst)
                       → rejected  (manual decision by analyst)
```

Status transitions trigger: audit events (DB trigger + BullMQ), notification jobs, WebSocket broadcasts, cache invalidation.

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with email/password, returns JWT |
| POST | `/auth/refresh` | Refresh access token |

### Applications (requires JWT)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/v1/applications` | Any | Create application |
| GET | `/api/v1/applications` | Any | List with filters (country, status, page, limit) |
| GET | `/api/v1/applications/:id` | Any | Get by ID |
| PATCH | `/api/v1/applications/:id/status` | Admin, Analyst | Update status |

### Webhooks (no auth - simulates external bank system)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webhooks/bank-notification` | Receive bank evaluation data |

### WebSocket Events (Socket.IO)
| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:country` | Client → Server | Join country room for updates |
| `subscribe:application` | Client → Server | Join application room |
| `application:created` | Server → Client | New application created |
| `application:status-changed` | Server → Client | Status updated |
| `application:risk-evaluated` | Server → Client | Risk evaluation completed |

## Security

### PII Encryption
- Document IDs (CPF, CURP) are encrypted at rest using **AES-256-GCM** with random IV
- Storage format: `iv:authTag:ciphertext` (hex encoded)
- Documents are masked in API responses: `***...4725`
- Encryption key stored in environment variable (64 hex chars = 256 bits)

### Authentication & Authorization
- **JWT tokens** with 24h access / 7d refresh expiration
- Role-based access control (RBAC): admin, analyst, viewer
- Status updates restricted to admin and analyst roles
- Bearer token required on all `/api/v1/*` endpoints
- WebSocket connections require valid JWT in handshake

### API Security
- Helmet middleware (security headers: CSP, HSTS, X-Frame-Options)
- CORS with configurable origin
- Request body size limit (10KB)
- Request ID tracking (X-Request-ID header)
- PII redaction in logs (documentId fields masked)
- Input validation with Zod schemas on all endpoints

## Async Processing & Queues

### Technology: BullMQ + Redis

BullMQ provides reliable, Redis-backed job queues with:
- Automatic retries with exponential backoff (max 3 attempts, 1s base delay)
- Concurrency control per queue
- Job deduplication and priority
- Dashboard via Bull Board at `/admin/queues`

### Queue Architecture

```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐
│ API      │───>│ risk-evaluation │───>│ Worker (x2)  │
│ (create) │    │ queue           │    │ SERASA/Buro  │
└──────────┘    └─────────────────┘    └──────┬───────┘
                                              │
     ┌────────────────────────────────────────┤
     │                                        │
     ▼                                        ▼
┌─────────────┐                    ┌──────────────────┐
│ audit queue │                    │ notification     │
│ (x3 conc.)  │                    │ queue (x1 conc.) │
└─────────────┘                    └──────────────────┘
```

### Job Flow
1. **Application created** → Use case enqueues `risk-evaluation` + `audit` jobs
2. **Risk evaluation worker** picks job → calls bank provider → evaluates country rules → updates status + bankData → invalidates cache → emits WebSocket event via Redis Pub/Sub → enqueues `audit` job
3. **Audit worker** records events in `application_events` table
4. **Notification worker** handles terminal status notifications (simulated)

### Worker ↔ Backend Communication (Redis Pub/Sub)

The worker runs in a separate process/container without a Socket.IO server. WebSocket events from the worker are bridged to connected clients via Redis Pub/Sub:

```
Worker → Redis PUBLISH (ws:events) → Backend SUBSCRIBE → Socket.IO emit to clients
```

### DB Triggers as Event Source
PostgreSQL triggers complement the queue system:
- `AFTER INSERT` on applications → creates job row in `jobs` table (DB-level audit)
- `AFTER UPDATE` of status → records event in `application_events` (full audit trail)
- `BEFORE UPDATE` → auto-updates `updated_at` timestamp

## Caching Strategy

### Technology: Redis (cache-aside pattern)

### What We Cache and Why

| Cache Key Pattern | TTL | Content | Reason |
|-------------------|-----|---------|--------|
| `application:{id}` | 5 min | Single application | Frequent detail views, rarely changes |
| `applications:{country}:{status}:{page}:{limit}` | 2 min | Paginated list | Most common query, short TTL for freshness |

### Invalidation Strategy

- **On create:** Invalidate all list caches (`applications:*`)
- **On status update:** Invalidate specific app cache + all list caches
- **On webhook/risk evaluation:** Invalidate specific app cache + all list caches
- **Pattern-based invalidation:** Uses Redis `SCAN` + `DEL` for wildcard patterns
- **Graceful degradation:** If Redis unavailable, falls through to database

## Webhooks

### Inbound Webhook: Bank Notification

```
POST /api/v1/webhooks/bank-notification
{
  "applicationId": "uuid",
  "provider": "SERASA" | "BURO_CREDITO",
  "status": "success" | "error",
  "data": { /* bank-specific fields */ },
  "timestamp": "2026-01-01T00:00:00Z"
}
```

Flow:
1. External system sends bank evaluation data
2. Webhook handler validates payload (Zod schema)
3. Updates application's bankData in database
4. **Re-evaluates risk** using country-specific rules
5. Updates application status based on evaluation
6. Invalidates cache
7. Emits WebSocket events for real-time UI updates

### Simulated External Notifications (Outbound)

The notification worker simulates sending notifications to external systems when applications reach terminal status (approved/rejected). In production, this would integrate with email/SMS/push notification services.

## Concurrency

### Strategy: Domain State Machine + Atomic Updates

- Status transitions are validated in the domain layer via `ApplicationStatus.canTransitionTo()`
- Database updates use atomic `UPDATE ... WHERE id = ?` (single-row, no table locks)
- Invalid transitions return HTTP 422 (e.g., trying to approve an already rejected application)
- BullMQ ensures each job is processed exactly once (no duplicate risk evaluations)

### Worker Concurrency

| Queue | Concurrency | Reason |
|-------|-------------|--------|
| risk-evaluation | 2 | Bank API calls are I/O bound (2-4s each) |
| audit | 3 | Fast DB inserts, can handle more |
| notification | 1 | Ordered delivery, prevent flooding |

### Scaling

- **Backend API:** Stateless, horizontally scalable (K8s HPA: 2-8 replicas)
- **Workers:** Independent process, scalable (K8s HPA: 2-10 replicas)
- **WebSocket:** Redis Pub/Sub bridge enables multi-instance communication
- **Database:** Connection pooling via Prisma, read replicas possible

## Scalability Analysis (Millions of Records)

### Current Index Strategy

The 5 indices cover the primary query patterns:
- **Country + Status filter:** Composite index avoids full table scan
- **Date sorting:** DESC index for "newest first" queries
- **JSONB search:** GIN index for bank_data queries
- **Partial index on jobs:** Only indexes pending jobs, keeping index small

### Table Partitioning (for > 10M rows)

```sql
-- Range partition by created_at (monthly)
CREATE TABLE applications (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE applications_2026_01 PARTITION OF applications
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Benefits:** Each partition has smaller indices, faster queries, easy archival (detach old partitions).

**Alternative:** List partition by `country_code` for even distribution:
```sql
PARTITION BY LIST (country_code);
-- Partition per country: applications_br, applications_mx
```

### Critical Queries & Bottleneck Prevention

| Query | Index Used | Optimization |
|-------|-----------|-------------|
| List by country+status | `idx_applications_country_status` | Composite covers both predicates |
| Get by ID | PK (UUID) | Direct lookup, O(log n) |
| Newest applications | `idx_applications_created_at` | Pre-sorted DESC, avoids sort step |
| Pending jobs | `idx_jobs_pending` | Partial index, only ~1% of rows |
| Events by app | `idx_events_application` | FK index, fast join |

### Archiving Strategy

For tables exceeding 50M rows:
1. **Partition by month** on `created_at`
2. **Detach old partitions** (> 12 months) to archive tables
3. **Compress archived partitions** using pg_dump to cold storage (S3)
4. **Application events:** Aggregate old events into monthly summaries, delete raw records
5. **Jobs table:** Delete completed jobs older than 30 days (processed data lives in events)

### Connection Pooling

- Prisma manages connection pool (default 10 connections)
- For high throughput: PgBouncer in transaction mode in front of PostgreSQL
- Redis: Single connection per service (ioredis handles pipelining)

## Kubernetes Deployment

### Manifests (`k8s/` directory)

| File | Resource | Description |
|------|----------|-------------|
| `namespace.yaml` | Namespace | Isolated namespace `credit-system` |
| `configmap.yaml` | ConfigMap | Non-sensitive config (NODE_ENV, PORT, etc.) |
| `secrets.yaml` | Secret | Credentials (DB URL, JWT secret, encryption key) |
| `postgres.yaml` | StatefulSet + PVC + Service | PostgreSQL with persistent storage |
| `redis.yaml` | Deployment + Service | Redis cache and queue backend |
| `backend.yaml` | Deployment + Service + HPA | API server (2-8 replicas) |
| `worker.yaml` | Deployment + HPA | Background workers (2-10 replicas) |
| `frontend.yaml` | Deployment + Service | Nginx serving SPA (2 replicas) |
| `ingress.yaml` | Ingress | Nginx ingress with WebSocket support |

### Deploy

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
kubectl get pods -n credit-system
```

### Considerations
- **Secrets:** In production, use External Secrets Operator or Vault instead of plain K8s secrets
- **Database:** Consider managed PostgreSQL (RDS, Cloud SQL) instead of in-cluster StatefulSet
- **Redis:** Consider managed Redis (ElastiCache, Memorystore) for HA
- **Images:** Build and push to container registry, update image tags in manifests
- **TLS:** Add cert-manager for automatic HTTPS certificates

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Clean Architecture** | Separation of concerns, testable domain logic, easy to swap infrastructure |
| **Turborepo monorepo** | Shared types between frontend/backend, cached builds, single repo |
| **Zod for validation** | Runtime type checking + TypeScript inference, shared between client/server |
| **BullMQ over pg-boss** | Redis-backed (already have Redis for cache), proven reliability, dashboard |
| **AES-256-GCM for PII** | Authenticated encryption, prevents tampering, standard for PII at rest |
| **Optimistic concurrency** | No table locks, scales with multiple workers, conflict detection |
| **Strategy pattern for countries** | Adding a new country = new Rule class + new Provider, zero changes to core |
| **Socket.IO + Redis Pub/Sub** | Built-in rooms for subscriptions, Redis bridge for multi-process communication |
| **Zustand over Redux** | Simpler API, less boilerplate, perfect for MVP scope |
| **Auto-seed on startup** | Developer convenience; backend detects empty DB and seeds automatically |
| **Hardcoded MVP users** | Faster iteration; production would use DB-backed user management |

## Assumptions

1. **Two countries (BR, MX)** suffice for demonstrating the multi-country pattern. Adding a new country requires: one Rule class, one Provider class, and registration in factories.
2. **Bank providers are simulated** with realistic delays (2-4s) and deterministic data based on document hash. In production, these would make real HTTP calls to SERASA/Buro APIs.
3. **MVP authentication** uses hardcoded users. Production would use a database-backed user store with bcrypt password hashing.
4. **Single PostgreSQL instance** is acceptable for MVP. Production would use managed DB with replicas.
5. **PII encryption** uses AES-256-GCM with random IVs. Duplicate detection decrypts and compares; at scale a hash column would improve performance.
6. **Notification worker** logs to stdout as placeholder. Production would integrate with email (SendGrid) or SMS (Twilio).

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) | Random string |
| `ENCRYPTION_KEY` | Yes | AES-256 key (64 hex chars) | `0123456789abcdef...` |
| `PORT` | No | Backend port (default: 3000) | `3000` |
| `NODE_ENV` | No | Environment (default: development) | `production` |
| `CORS_ORIGIN` | No | Allowed CORS origin | `http://localhost:5173` |
| `LOG_LEVEL` | No | Winston log level | `debug`, `info`, `warn` |
| `VITE_API_URL` | No | Frontend API URL | `http://localhost:3000` |

## License

MIT
