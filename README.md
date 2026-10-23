# Motor Inteligente de Generación Automática de Contratos
### **NovaLex Tecnología Contractual S.A. de C.V. · Soluciones Digitales**

Sistema integral de generación automatizada de contratos de **Prestación de Servicios Profesionales** bajo la legislación mercantil y civil mexicana. Incorpora redacción asistida por inteligencia artificial local (**Llama 3.1 8B vía Ollama**), compilación y exportación de documentos PDF de alta fidelidad (**WeasyPrint**), persistencia relacional en **PostgreSQL 15** y flujo de trabajo RBAC con control de estados para tres roles: **Generador, Editor y Aprobador**.

---

## 1. Arquitectura y Tecnologías del Sistema

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS (Puerto `3000`).
- **Backend API**: FastAPI (Python 3.11), Pydantic v2, WeasyPrint (Puerto `8000`).
- **Base de Datos Relacional**: PostgreSQL 15 Alpine con autenticación SCRAM y red interna Docker (Puerto `5432`).
- **Motor de Inteligencia Artificial**: Ollama con el modelo open-source `llama3.1:8b` (Puerto `11434`), con ejecución 100% local, privada y sin costo de consumo por tokens.

```mermaid
graph LR
    User[Usuario Web] --> Frontend[Frontend React :3000]
    Frontend -->|JWT Bearer / REST| Backend[FastAPI Backend :8000]
    Backend -->|SQL / psycopg2| Postgres[(PostgreSQL 15 :5432)]
    Backend -->|HTTP /api/chat| Ollama[Ollama Llama 3.1 8B :11434]
    Backend -->|HTML to PDF| WeasyPrint[WeasyPrint Engine]
```

---

## 2. Puertos de Servicios y Mapeo de Red

| Servicio | Contenedor Docker | Puerto Host | Puerto Contenedor | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `plurione-frontend` | `3000` | `3000` | Interfaz React interactiva y responsive |
| **Backend** | `plurione-backend` | `8000` | `8000` | API REST FastAPI y documentación Swagger |
| **PostgreSQL** | `plurione-postgres` | `5432` | `5432` | Base de datos relacional `contratos_db` |
| **Ollama** | `plurione-ollama` | `11434` | `11434` | Motor de inferencia local Llama 3.1 8B |

---

## 3. Configuración de Variables de Entorno (`.env`)

Copia la plantilla de ejemplo `.env.example` en la raíz del proyecto para crear tu archivo `.env`:

```bash
# En Linux / macOS:
cp .env.example .env

# En Windows (PowerShell):
Copy-Item .env.example .env
```

### Generación Obligatoria de `JWT_SECRET`
Por seguridad, el backend valida que `JWT_SECRET` esté definido con una clave criptográfica de al menos 16 caracteres (recomendado 256 bits / 64 caracteres hexadecimales). Para generarla:

```bash
# Opción 1: OpenSSL (Linux / macOS / Git Bash)
openssl rand -hex 32

# Opción 2: Python (Cualquier plataforma)
python -c "import secrets; print(secrets.token_hex(32))"
```

Coloca el valor resultante en tu archivo `.env`:

```env
DATABASE_URL=postgresql://plurione:novalex_secure_pg_2026@postgres:5432/contratos_db
POSTGRES_USER=plurione
POSTGRES_PASSWORD=novalex_secure_pg_2026
POSTGRES_DB=contratos_db

OLLAMA_HOST=http://ollama:11434
MODEL_NAME=llama3.1:8b

JWT_SECRET=4f9c8d2e7a1b3c5e8d9a0f2b4c6e8a1d3f5b7c9e0a2d4f6a8b0c2e4d6f8a0b2c
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=8

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
VITE_API_BASE_URL=http://localhost:8000
```

---

## 4. Despliegue con Docker Compose (Recomendado)

### Paso 1: Iniciar los contenedores
En la raíz del proyecto ejecuta:

```bash
docker compose up -d --build
```

### Paso 2: Descargar el modelo de IA en Ollama
La primera vez que se inicia el contenedor de Ollama, descarga el modelo Llama 3.1 8B:

```bash
docker exec -it plurione-ollama ollama run llama3.1:8b
```

Una vez descargado, el modelo quedará almacenado de forma persistente en el volumen `ollama_data`.

### Paso 3: Acceso al sistema
- **Interfaz Web (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **Documentación Interactiva Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Healthcheck del Sistema**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 5. Cuentas y Credenciales de Demostración

El sistema implementa autenticación real mediante contraseñas cifradas con `bcrypt` (12 rondas) y tokens JWT (HS256).

| Rol | Usuario (`username`) | Correo de Acceso | Contraseña | Nombre y Cargo | Permisos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Generador** | `uacontreras` | `valeria.ramos@example.com` | `inicio2026` | Valeria Ramos Peña<br>*(Ing. Soluciones)* | Crear clientes, generar contratos vía IA, enviar borradores a revisión. |
| **Editor** | `elozano` | `eduardo.lozano@example.com` | `inicio2026` | Eduardo Lozano Mora<br>*(Revisor Jurídico)* | Editar cláusulas y texto legal de contratos en revisión o rechazados. |
| **Aprobador** | `jmorales` | `javier.morales@example.com` | `inicio2026` | Javier Morales Hinojosa<br>*(Director Legal)* | Aprobar formalmente o rechazar contratos con observaciones obligatorias. |

---

## 6. Ejecución de la Suite de Pruebas de Integración

El proyecto incluye una suite de pruebas automatizadas que valida autenticación JWT, RBAC, máquina de estados, persistencia en PostgreSQL, generación con Ollama y exportación PDF:

```bash
# Ejecutar dentro del contenedor backend:
docker exec -it plurione-backend python3 test_integration.py
```

---

## 7. Ejecución Local (Sin Docker)

Si deseas ejecutar el backend y frontend directamente en tu máquina local:

### Requisitos:
- Node.js >= 18
- Python >= 3.11
- PostgreSQL 15 en ejecución local con una base `contratos_db`
- Ollama instalado localmente con `ollama run llama3.1:8b`

### 1. Iniciar Base de Datos y Dependencias de Python:
```bash
cd backend
python -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Iniciar el Frontend React:
```bash
# En la raíz del proyecto:
npm install
npm run dev
```

---

## 8. Persistencia y Manejo de Migraciones en PostgreSQL

- Los datos relacionales residen en el volumen persistente `pgdata`. Nunca se destruyen los datos ni los volúmenes con `docker compose down`.
- Si se requiere actualizar identidades en registros históricos sin reiniciar la base de datos ni romper claves foráneas, se utiliza la migración transaccional controlada:
  ```bash
  docker exec -it plurione-backend python3 migrate_identity.py
  ```
- La inicialización de cláusulas estándar de demostración es idempotente (`ON CONFLICT (id) DO NOTHING`), garantizando que no se dupliquen registros ni se sobreescriban modificaciones del usuario.

---

## 9. Consideraciones del Modelo Llama 3.1 8B y CPU

- **Inferencia en CPU**: El modelo Llama 3.1 8B genera aproximadamente entre 5 y 8 tokens/segundo en CPUs estándar. Un contrato completo (aprox. 800 a 1,200 tokens) toma entre 80 y 150 segundos. El backend configura un `timeout` de 240 segundos para garantizar que la generación concluya sin interrupciones.
- **Aceleración GPU opcional**: En equipos con GPU NVIDIA y soporte CUDA, se puede descomentar la sección `deploy.resources.reservations.devices` en `docker-compose.yml` para habilitar aceleración por hardware.
- **Detección de Truncamiento**: El backend detecta la bandera `done_reason == "length"` en la respuesta de Ollama. Si la respuesta supera el límite de tokens sin haber concluido, el backend aborta la transacción y **no guarda contratos truncados**, notificando con un error claro.

---

## 10. Deslinde de Responsabilidad y Declaración Técnica

> [!IMPORTANT]
> **Aclaración sobre Google Antigravity y Modelos de Lenguaje**:
> Esta plataforma fue desarrollada para operar de forma 100% autónoma y privada mediante microservicios locales orquestados con Docker. Utiliza **Ollama** con modelos de código abierto (**Llama 3.1 8B**) y no depende de APIs de pago en la nube ni de servicios de Google AI Studio. Las referencias al entorno corresponden al IDE y herramientas de desarrollo asistido por agentes.

> [!NOTE]
> **Carácter de Demostración Legal**:
> El contenido contractual, los datos de la empresa prestadora (**NovaLex Tecnología Contractual S.A. de C.V.**), los clientes y los números de RFC (como `NTC260101AB1`) son ficticios y tienen un propósito exclusivamente académico y de demostración de software. El texto generado está **pendiente de revisión jurídica formal** y no constituye asesoramiento legal profesional.

> [!NOTE]
> **Nota sobre Identidad PluriOne vs NovaLex**:
> El producto ha sido renovado institucionalmente bajo la identidad **NovaLex Tecnología Contractual S.A. de C.V.** Los nombres de contenedores (`plurione-backend`, `plurione-postgres`), usuarios de base de datos (`plurione`) y variables de compatibilidad transitoria (`EMPRESA_PLURIONE`) se conservan exclusivamente con fines de compatibilidad en la infraestructura Docker y estabilidad de volúmenes preexistentes.
