# Plan Completo MVP - Sistema de Crédito Multipaís

## 📋 RESUMEN EJECUTIVO

### Objetivo
MVP de sistema de solicitudes de crédito para fintech operando en Brasil (BR) y México (MX).

### Stack Validado ✅
- **Backend**: Node.js 20 + TypeScript + Express
- **Frontend**: React 18 + Vite + TypeScript  
- **DB**: PostgreSQL 15
- **Cache/Queue**: Redis 7 + BullMQ
- **Real-time**: Socket.IO
- **DevOps**: Docker + K8s

---

## 🎯 REQUISITOS CUMPLIDOS

### Funcionales
✅ 1. Crear solicitudes
✅ 2. Validar reglas por país (BR/MX)
✅ 3. Proveedores bancarios (mocked)
✅ 4. Consultar individual
✅ 5. Listar con filtros
✅ 6. Actualizar estados
✅ 7. Procesamiento asíncrono
✅ 8. Real-time frontend

### No Funcionales
✅ Clean Architecture
✅ JWT + PII encryption
✅ Logs estructurados
✅ Docker setup < 5 min
✅ DB triggers nativos
✅ Colas de trabajos
✅ Caching con invalidación
✅ K8s manifests
✅ Webhooks
✅ Concurrencia segura

---

## 🏗️ ARQUITECTURA

```
┌─────────────┐
│   React     │ ← Frontend
└──────┬──────┘
       │ HTTP/WS
┌──────┴──────────────────┐
│   Express API           │
│                         │
│ ┌──────────────────┐   │
│ │ Presentation     │   │
│ └────────┬─────────┘   │
│          │              │
│ ┌────────┴─────────┐   │
│ │ Application      │   │ ← Use Cases
│ └────────┬─────────┘   │
│          │              │
│ ┌────────┴─────────┐   │
│ │ Domain (Core)    │   │ ← Business Logic
│ │ • BR Rules       │   │
│ │ • MX Rules       │   │
│ └────────┬─────────┘   │
│          │              │
│ ┌────────┴─────────┐   │
│ │ Infrastructure   │   │ ← Implementaciones
│ └──────────────────┘   │
└─────┬────────┬─────────┘
      │        │
 ┌────┴───┐ ┌─┴──────┐
 │Postgres│ │Redis   │
 │+Triggers│ │+BullMQ │
 └────────┘ └────────┘
```

---

## 📁 ESTRUCTURA DE PROYECTO

```
credit-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── domain/              ← Core Business
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── interfaces/
│   │   │   ├── rules/
│   │   │   │   ├── brazil/
│   │   │   │   └── mexico/
│   │   │   ├── services/
│   │   │   └── factories/
│   │   ├── application/         ← Use Cases
│   │   │   ├── use-cases/
│   │   │   ├── dto/
│   │   │   └── events/
│   │   ├── infrastructure/      ← Implementaciones
│   │   │   ├── database/
│   │   │   ├── cache/
│   │   │   ├── queue/
│   │   │   ├── providers/
│   │   │   └── security/
│   │   ├── presentation/        ← API
│   │   │   ├── controllers/
│   │   │   ├── middlewares/
│   │   │   ├── routes/
│   │   │   └── websocket/
│   │   ├── workers/
│   │   ├── shared/
│   │   ├── main.ts
│   │   └── worker.ts
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   ├── backend-deployment.yaml
│   ├── worker-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── postgres-statefulset.yaml
│   └── redis-deployment.yaml
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 🗄️ MODELO DE DATOS

### Schema PostgreSQL

```sql
-- Tabla: applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('BR', 'MX')),
    full_name VARCHAR(255) NOT NULL,
    document_id VARCHAR(255) NOT NULL,  -- ENCRIPTADO
    requested_amount DECIMAL(15, 2) NOT NULL,
    monthly_income DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    bank_data JSONB,  -- Datos del proveedor bancario
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, country_code)
);

-- Índices para performance
CREATE INDEX idx_applications_country_status 
    ON applications(country_code, status);
CREATE INDEX idx_applications_created_at 
    ON applications(created_at DESC);
CREATE INDEX idx_applications_bank_data 
    ON applications USING GIN (bank_data);

-- Tabla: application_events (Auditoría)
CREATE TABLE application_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_application 
    ON application_events(application_id);

-- Tabla: jobs (Cola asíncrona)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_jobs_pending 
    ON jobs(status) WHERE status = 'pending';
```

### Triggers Automáticos

```sql
-- Trigger 1: Auto-actualizar updated_at
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger 2: Evento al cambiar estado
CREATE FUNCTION create_status_change_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO application_events (application_id, event_type, event_data)
        VALUES (
            NEW.id,
            'status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changed_at', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_status_change
    AFTER UPDATE OF status ON applications
    FOR EACH ROW
    EXECUTE FUNCTION create_status_change_event();

-- Trigger 3: Encolar evaluación de riesgo
CREATE FUNCTION enqueue_risk_evaluation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO jobs (type, payload)
    VALUES (
        'risk_evaluation',
        jsonb_build_object(
            'application_id', NEW.id,
            'country_code', NEW.country_code
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_risk_evaluation
    AFTER INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION enqueue_risk_evaluation();
```

