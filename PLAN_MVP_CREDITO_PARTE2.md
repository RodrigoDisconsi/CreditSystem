# Plan MVP - Parte 2: Reglas de Negocio & Implementación

## 🇧🇷 REGLAS BRASIL (BR)

### Documento: CPF
- **Formato**: 000.000.000-00 (11 dígitos)
- **Validación**: Algoritmo de dígitos verificadores

### Reglas de Negocio
1. **Score mínimo**: Serasa ≥ 600
2. **Capacidad de pago**: Ingreso ≥ 3x cuota mensual
3. **Sin historial negativo**: `negativeHistory === false`
4. **Deuda/Ingreso**: (deuda_total + nuevo_préstamo) / ingreso_anual < 50%

### Provider Mock: Serasa
```typescript
interface BrazilBankData {
    creditScore: number;        // 300-1000
    totalDebt: number;
    openAccounts: number;
    negativeHistory: boolean;
    evaluatedAt: string;
    provider: 'SERASA';
}
```

---

## 🇲🇽 REGLAS MÉXICO (MX)

### Documento: CURP
- **Formato**: AAAA000000AAAAAA00 (18 caracteres)
- **Validación**: Formato + dígito verificador

### Reglas de Negocio
1. **Score mínimo**: Buró de Crédito ≥ 650
2. **Deuda/Ingreso mensual**: < 40%
3. **Monto máximo sin revisión**: ≤ 100,000 MXN
4. **Historial de pagos**: != 'bad'
5. **Préstamos activos**: ≤ 3

### Provider Mock: Buró de Crédito
```typescript
interface MexicoBankData {
    bureauScore: number;        // 500-850
    totalDebt: number;
    activeLoans: number;
    paymentHistory: 'good' | 'regular' | 'bad';
    evaluatedAt: string;
    provider: 'BURO_CREDITO';
}
```

---

## 🔐 SEGURIDAD

### 1. Autenticación JWT
```typescript
// Middleware de autenticación
authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Autorización por roles
authorize = (roles: string[]) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
```

### 2. Encriptación PII
```typescript
// AES-256-GCM para datos sensibles
class PIIEncryption {
    encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    
    decrypt(encryptedText: string): string {
        const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
        const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        return decrypted + decipher.final('utf8');
    }
}
```

---

## ⚙️ PROCESAMIENTO ASÍNCRONO

### Workers con BullMQ
```typescript
// 1. Risk Evaluation Worker
class RiskEvaluationWorker {
    async process(job: Job) {
        const { applicationId } = job.data;
        
        // Simular análisis complejo
        await sleep(3000);
        
        const riskScore = this.calculateRisk(job.data);
        
        await applicationRepo.update(applicationId, {
            bankData: { ...bankData, riskScore }
        });
        
        // Emitir vía WebSocket
        websocket.emit('application:risk-evaluated', {
            applicationId,
            riskScore
        });
    }
}

// 2. Audit Worker
class AuditWorker {
    async process(job: Job) {
        await eventRepo.create({
            applicationId: job.data.applicationId,
            eventType: job.data.eventType,
            eventData: job.data.payload
        });
    }
}

// 3. Notification Worker
class NotificationWorker {
    async process(job: Job) {
        const { type, recipient, data } = job.data;
        
        switch (type) {
            case 'email':
                await emailService.send(recipient, data);
                break;
            case 'sms':
                await smsService.send(recipient, data);
                break;
        }
    }
}
```

### Queue Management
```typescript
// Encolar trabajo
await queueService.enqueue('risk_evaluation', {
    applicationId: '123',
    countryCode: 'BR'
});

// Procesar
queueService.process('risk_evaluation', async (job) => {
    await riskWorker.process(job);
});
```

---

## 🔄 REAL-TIME (WebSocket)

### Backend - Socket.IO Server
```typescript
class WebSocketServer {
    constructor(httpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: { origin: FRONTEND_URL }
        });
        
        this.io.on('connection', (socket) => {
            // Cliente se suscribe a país
            socket.on('subscribe:country', (country) => {
                socket.join(`country:${country}`);
            });
            
            // Cliente se suscribe a aplicación específica
            socket.on('subscribe:application', (appId) => {
                socket.join(`application:${appId}`);
            });
        });
    }
    
    // Emitir a país específico
    emitToCountry(country, event, data) {
        this.io.to(`country:${country}`).emit(event, data);
    }
    
    // Emitir a aplicación específica
    emitToApplication(appId, event, data) {
        this.io.to(`application:${appId}`).emit(event, data);
    }
}
```

### Frontend - React Hook
```typescript
function useApplicationUpdates(country, onUpdate) {
    const socket = useWebSocket();
    
    useEffect(() => {
        // Suscribirse
        socket.subscribeToCountry(country);
        
        // Escuchar eventos
        socket.on('application:created', onUpdate);
        socket.on('application:updated', onUpdate);
        socket.on('application:status-changed', onUpdate);
        
        return () => {
            // Limpiar
            socket.off('application:created');
            socket.off('application:updated');
            socket.off('application:status-changed');
            socket.unsubscribeFromCountry(country);
        };
    }, [country]);
}
```

---

## 💾 CACHING STRATEGY

### Redis Cache Service
```typescript
class CacheService {
    // Cache-aside pattern
    async getOrFetch<T>(
        key: string, 
        fetcher: () => Promise<T>, 
        ttl: number = 300
    ): Promise<T> {
        // Intentar cache
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);
        
        // Fetch fresh data
        const fresh = await fetcher();
        await redis.setex(key, ttl, JSON.stringify(fresh));
        
        return fresh;
    }
    
    // Invalidación por patrón
    async invalidate(pattern: string) {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(...keys);
    }
}
```

### Uso en Use Cases
```typescript
async execute(query: ListApplicationsQuery) {
    const cacheKey = `applications:${query.country}:${query.status}:${query.page}`;
    
    return cache.getOrFetch(
        cacheKey,
        () => applicationRepo.findByCountryAndStatus(query),
        300  // 5 minutos
    );
}
```

### Qué Cachear
- ✅ Listados de aplicaciones (5 min)
- ✅ Aplicación individual (10 min)
- ✅ Catálogos/configuraciones (1 hora)
- ❌ Datos sensibles no cacheados

---

## 🌐 API ENDPOINTS

### POST /api/applications
Crear nueva solicitud
```json
{
  "countryCode": "BR",
  "fullName": "João Silva",
  "documentId": "12345678900",
  "requestedAmount": 50000,
  "monthlyIncome": 10000
}
```

### GET /api/applications/:id
Obtener solicitud específica

### GET /api/applications
Listar con filtros
- Query params: `?country=BR&status=pending&page=1&limit=20`

### PATCH /api/applications/:id/status
Actualizar estado
```json
{
  "status": "approved"
}
```

### POST /api/webhooks/bank-notification
Recibir notificación externa
```json
{
  "applicationId": "abc-123",
  "status": "verified",
  "data": { ... }
}
```

---

## 🐳 DOCKER SETUP

### docker-compose.yml (Simplificado)
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: credit_system
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres@postgres/credit_system
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]
  
  worker:
    build: ./backend
    command: npm run worker
    depends_on: [postgres, redis]
  
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]

volumes:
  postgres_data:
```

### Quick Start
```bash
# 1. Clonar e instalar
git clone <repo>
make install

# 2. Iniciar
make dev

# 3. Acceder
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## ☸️ KUBERNETES MANIFESTS

### Backend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    spec:
      containers:
      - name: backend
        image: credit-system-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Worker Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: worker
  template:
    spec:
      containers:
      - name: worker
        image: credit-system-backend:latest
        command: ["npm", "run", "worker"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

---

## 📊 ESCALABILIDAD

### Diseño para Millones de Registros

#### 1. Particionamiento de Tabla
```sql
-- Particionar por país y mes
CREATE TABLE applications_partitioned
    PARTITION BY LIST (country_code);

CREATE TABLE applications_br 
    PARTITION OF applications_partitioned
    FOR VALUES IN ('BR')
    PARTITION BY RANGE (created_at);

CREATE TABLE applications_br_2025_02
    PARTITION OF applications_br
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

#### 2. Índices Recomendados
```sql
-- Búsquedas por país/estado
CREATE INDEX idx_country_status 
    ON applications(country_code, status) 
    INCLUDE (created_at);

-- Búsquedas por documento (hash es más rápido)
CREATE INDEX idx_document 
    ON applications USING HASH (document_id);

-- Filtros temporales
CREATE INDEX idx_created_at 
    ON applications(created_at DESC) 
    WHERE status IN ('pending', 'under_review');
```

#### 3. Estrategias de Archivado
- Aplicaciones > 1 año → tabla `applications_archive`
- Compresión con `pg_compress`
- Respaldo S3 con Parquet

#### 4. Cuellos de Botella Identificados
| Query | Problema | Solución |
|-------|----------|----------|
| List all by country | Full scan | Índice compuesto + paginación |
| Search by document | Secuencial | Índice HASH |
| Filter by date range | Lento en millones | Particionamiento mensual |
| JSONB queries | Sin índice | GIN index en bank_data |

---

## 📋 MAKEFILE

```makefile
.PHONY: help install dev test build clean migrate

help:
	@echo "Comandos disponibles:"
	@echo "  make install - Instalar dependencias"
	@echo "  make dev     - Iniciar desarrollo"
	@echo "  make test    - Ejecutar tests"
	@echo "  make migrate - Correr migraciones"
	@echo "  make build   - Build producción"

install:
	cd backend && npm install
	cd frontend && npm install

dev:
	docker-compose up -d postgres redis
	cd backend && npm run dev &
	cd frontend && npm run dev

test:
	cd backend && npm run test
	cd backend && npm run test:integration

migrate:
	cd backend && npm run migrate

build:
	docker-compose build

clean:
	docker-compose down -v
	rm -rf backend/node_modules frontend/node_modules

deploy-k8s:
	kubectl apply -f k8s/
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Fundamentos (Prioridad ALTA)
- [ ] Setup proyecto (estructura, package.json)
- [ ] Docker Compose básico
- [ ] Schema PostgreSQL + migrations
- [ ] Triggers de base de datos
- [ ] Domain entities y value objects
- [ ] Interfaces del dominio

### Fase 2: Reglas de Negocio (Prioridad ALTA)
- [ ] Validator BR (CPF + reglas)
- [ ] Validator MX (CURP + reglas)
- [ ] Bank Provider BR (mock)
- [ ] Bank Provider MX (mock)
- [ ] Factories (CountryRule, BankProvider)

### Fase 3: Use Cases (Prioridad ALTA)
- [ ] CreateApplicationUseCase
- [ ] GetApplicationUseCase
- [ ] ListApplicationsUseCase
- [ ] UpdateStatusUseCase

### Fase 4: Infrastructure (Prioridad ALTA)
- [ ] PostgresApplicationRepository
- [ ] RedisCacheService
- [ ] BullMQService
- [ ] PIIEncryption
- [ ] Logger (Winston)

### Fase 5: API (Prioridad ALTA)
- [ ] Controllers
- [ ] Routes
- [ ] Middlewares (Auth, Validation, Error)
- [ ] WebSocket server

### Fase 6: Workers (Prioridad MEDIA)
- [ ] RiskEvaluationWorker
- [ ] AuditWorker
- [ ] NotificationWorker
- [ ] WorkerRegistry

### Fase 7: Frontend (Prioridad MEDIA)
- [ ] Setup React + Vite + TypeScript
- [ ] API Service
- [ ] WebSocket Service
- [ ] Custom Hooks
- [ ] ApplicationForm component
- [ ] ApplicationList component

### Fase 8: DevOps (Prioridad BAJA)
- [ ] Dockerfiles optimizados
- [ ] K8s manifests
- [ ] Makefile completo
- [ ] README con instrucciones

### Fase 9: Testing (Prioridad BAJA)
- [ ] Tests unitarios (Domain)
- [ ] Tests integración (API)
- [ ] Tests E2E

### Fase 10: Documentación (Prioridad BAJA)
- [ ] README completo
- [ ] Análisis de escalabilidad
- [ ] Decisiones técnicas
- [ ] Diagramas

---

## 🎯 CRITERIOS DE ÉXITO

1. ✅ **Funcionalidad**: 8/8 features funcionan
2. ✅ **Arquitectura**: Clean, modular, extensible
3. ✅ **Escalabilidad**: Diseño para millones de registros
4. ✅ **Seguridad**: JWT + PII encriptada
5. ✅ **Async**: Workers + eventos funcionando
6. ✅ **Real-time**: WebSockets actualizan UI
7. ✅ **DevOps**: Docker + K8s completos
8. ✅ **Documentación**: README claro y exhaustivo

---

## 📚 DECISIONES TÉCNICAS CLAVE

### ¿Por qué Node.js y no .NET?
- Mejor ecosistema para WebSockets (Socket.IO)
- BullMQ superior a Hangfire para este caso
- Mayor agilidad para MVP
- Tu experiencia en ambos permite elección óptima

### ¿Por qué PostgreSQL?
- Triggers nativos (requisito explícito)
- JSONB para datos variables por país
- Excelente performance en lecturas
- Particionamiento robusto

### ¿Por qué Strategy Pattern para países?
- Extensible a nuevos países sin modificar código existente
- Cada país encapsula sus propias reglas
- Testeable de forma aislada
- Cumple Open/Closed Principle

### ¿Por qué BullMQ?
- Redis-based (reutiliza infraestructura)
- Dashboard built-in para monitoreo
- Excelente manejo de concurrencia
- Retry logic incorporado

### ¿Por qué Clean Architecture?
- Separación clara de responsabilidades
- Testeable (domain no depende de infra)
- Preparado para cambios futuros
- Cumple con requerimiento de "modular y extensible"

---

## 🚀 PRÓXIMOS PASOS

1. Revisar y validar este plan completo
2. Crear repositorio Git
3. Implementar Fase 1 (setup + database)
4. Iterar por fases según prioridades
5. Testing continuo
6. Documentar decisiones en README

---

**Fin del Plan - Parte 2**
