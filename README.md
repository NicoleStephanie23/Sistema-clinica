# ClinicaOS — Sistema de Historias Clínicas y Control de Medicamentos

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│                     Puerto 3000                      │
│        Login · Dashboard · Módulos por perfil        │
└───────────────┬─────────────────┬────────────────────┘
                │                 │
    ┌───────────▼────┐   ┌────────▼──────────┐
    │  ms-historias  │   │  ms-medicamentos   │
    │   Puerto 4001  │   │    Puerto 4002     │
    │  Node/Express  │   │   Node/Express     │
    └───────────┬────┘   └────────┬───────────┘
                │                 │
    ┌───────────▼────┐   ┌────────▼───────────┐
    │  MySQL:3307    │   │   MySQL:3308        │
    │ historias_     │   │   medicamentos      │
    │ clinicas       │   │   (BD independiente)│
    └────────────────┘   └────────────────────┘
```

**Independencia de servicios**: si `ms-historias` cae, `ms-medicamentos`
sigue operando con su propia BD y su propio sistema de autenticación.
El frontend detecta el estado de cada servicio y lo muestra en el dashboard.

## Perfiles y accesos

| Perfil        | Email                    | Contraseña |
|---------------|--------------------------|------------|
| Médico        | medico@clinica.com       | Admin123*  |
| Administrador | admin@clinica.com        | Admin123*  |
| Farmacéutico  | farmaceutico@clinica.com | Admin123*  |

## Levantar con Docker Compose (recomendado)

```bash
# 1. Clonar / descomprimir el proyecto
cd clinica

# 2. Levantar todo
docker compose up -d

# 3. Sincronizar contraseñas (bcrypt real)
docker exec ms_historias   node config/seed.js
docker exec ms_medicamentos node config/seed.js

# 4. Abrir en el navegador
# Frontend:          http://localhost:3000
# API Historias:     http://localhost:4001/health
# API Medicamentos:  http://localhost:4002/health
```

## Desarrollo local (sin Docker)

### Prerrequisitos
- Node 20+
- MySQL 8 corriendo en localhost

### ms-historias
```bash
cd ms-historias
cp .env.example .env   # ajustar credenciales si es necesario
npm install
node config/seed.js    # crear usuarios con hash real
npm run dev            # http://localhost:4001
```

### ms-medicamentos
```bash
cd ms-medicamentos
cp .env.example .env
npm install
node config/seed.js
npm run dev            # http://localhost:4002
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Endpoints principales

### ms-historias (4001)
| Método | Ruta                         | Perfil         |
|--------|------------------------------|----------------|
| POST   | /api/auth/login              | Todos          |
| GET    | /api/pacientes               | Todos          |
| POST   | /api/pacientes               | médico / admin |
| GET    | /api/historias?paciente_id=X | Todos          |
| POST   | /api/historias               | médico         |

### ms-medicamentos (4002)
| Método | Ruta                            | Perfil              |
|--------|---------------------------------|---------------------|
| POST   | /api/auth/login                 | Todos               |
| GET    | /api/medicamentos               | Todos               |
| POST   | /api/medicamentos               | admin / farmacéutico|
| PATCH  | /api/medicamentos/:id/stock     | admin / farmacéutico|
| GET    | /api/medicamentos/:id/movimientos | Todos             |

## Próximos módulos
- Recetas electrónicas con QR
- Alertas de stock mínimo por email
- Reportes en PDF
- Módulo de agenda médica
- 2FA para médicos
