# Motor Inteligente de Generación Automática de Contratos
### **NovaLex Tecnología Contractual S.A. de C.V. · Soluciones Digitales**

Sistema integral de generación automatizada de contratos de **Prestación de Servicios Profesionales** bajo la legislación mercantil y civil mexicana. Incorpora redacción asistida por inteligencia artificial local (**Llama 3.1 8B vía Ollama**), compilación y exportación de documentos PDF de alta fidelidad (**WeasyPrint**), persistencia relacional en **PostgreSQL 15** con control de secuencias atómicas y flujo de trabajo RBAC con control de estados para tres roles: **Generador, Editor y Aprobador**.

---

## 1. Arquitectura y Tecnologías del Sistema

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS (Puerto `3000`).
- **Backend API**: FastAPI (Python 3.11), Pydantic v2, WeasyPrint (Puerto `8000`).
- **Base de Datos Relacional**: PostgreSQL 15 Alpine con autenticación SCRAM-SHA-256 y red interna Docker aislada (Puerto `5432` enlazado exclusivamente a `127.0.0.1`).
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
| **Backend** | `plurione-backend` | `8000` | `8000` | API REST FastAPI y documentación OpenAPI/Swagger |
| **PostgreSQL** | `plurione-postgres` | `127.0.0.1:5432` | `5432` | Base de datos relacional `contratos_db` protegida |
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
Por directiva de seguridad, el backend valida en tiempo de arranque que `JWT_SECRET` esté definido con una clave criptográfica de al menos 16 caracteres (recomendado 256 bits / 64 caracteres hexadecimales). Para generarla de forma segura:

```bash
# Opción 1: OpenSSL (Linux / macOS / Git Bash)
openssl rand -hex 32

# Opción 2: Python (Cualquier plataforma)
python -c "import secrets; print(secrets.token_hex(32))"
```

Coloca el valor resultante en tu archivo `.env`:

```env
# Conexión PostgreSQL (Red interna Docker con SCRAM-SHA-256)
POSTGRES_USER=plurione
POSTGRES_PASSWORD=TU_CONTRASENA_SEGURA_AQUI
POSTGRES_DB=contratos_db
DATABASE_URL=postgresql://plurione:TU_CONTRASENA_SEGURA_AQUI@postgres:5432/contratos_db

# Servicio de Inferencia Local Ollama
OLLAMA_HOST=http://ollama:11434
MODEL_NAME=llama3.1:8b
OLLAMA_TIMEOUT=480

# Seguridad y Autenticación JWT (HS256)
JWT_SECRET=TU_JWT_SECRET_ALEATORIO_AQUI_MINIMO_32_CARACTERES
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=8

# Configuración de CORS y Frontend
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

Una vez descargado, los pesos del modelo quedan almacenados permanentemente en el volumen persistente `ollama_data`.

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

> [!NOTE]
> **Identificadores de Acceso y Compatibilidad de Perfiles**:
> En el esquema semilla original de la aplicación, la cuenta con rol `GENERADOR` mantuvo el identificador técnico de usuario `uacontreras`. Como parte de la transición a la identidad corporativa ficticia NovaLex, dicho perfil fue asignado a la ingeniera **Valeria Ramos Peña** (`valeria.ramos@example.com`).
> El endpoint de autenticación (`POST /api/v1/auth/login`) permite iniciar sesión indistintamente utilizando el nombre de usuario (`uacontreras`) o la dirección de correo institucional (`valeria.ramos@example.com`), manteniendo compatibilidad total tanto con las pruebas automáticas como con el inicio de sesión desde la interfaz de usuario.

---

## 6. Ejecución de la Suite de Pruebas de Integración

El proyecto incluye una suite de pruebas automatizadas que valida autenticación JWT, RBAC, máquina de estados, persistencia en PostgreSQL, folios atómicos, mitigación de SSRF/LFI en WeasyPrint, generación con Ollama y exportación PDF:

```bash
# Ejecutar dentro del contenedor backend:
docker exec -it plurione-backend python3 test_integration.py
```

---

## 7. Ejecución Local (Sin Docker)

Si deseas ejecutar el backend, frontend y base de datos directamente en tu máquina local sin contenedores:

### Requisitos Previos:
- **Node.js**: Versión >= 18.x
- **Python**: Versión >= 3.11
- **PostgreSQL**: Versión 15 instalada y en ejecución local
- **Ollama**: Instalado localmente con el modelo `llama3.1:8b`

---

### Paso 1: Configurar PostgreSQL Local

1. Inicia sesión en PostgreSQL con tu cliente preferido (`psql` o pgAdmin) y crea la base de datos y usuario:
   ```sql
   CREATE USER plurione WITH PASSWORD 'novalex_secure_pg_2026';
   CREATE DATABASE contratos_db OWNER plurione;
   GRANT ALL PRIVILEGES ON DATABASE contratos_db TO plurione;
   ```

2. Ejecuta el script de inicialización del esquema y datos semilla:
   ```bash
   # En Windows (PowerShell):
   psql -U plurione -d contratos_db -f backend/init_db.sql

   # En Linux / macOS:
   psql -U plurione -d contratos_db -f backend/init_db.sql
   ```

> [!IMPORTANT]
> **Cadena de Conexión en Windows / Local**:
> Cuando ejecutes el backend fuera de Docker, la variable `DATABASE_URL` debe apuntar al host local `localhost` (o `127.0.0.1`), **NO** al host interno `postgres` (que es el DNS interno del puente Docker):
> ```env
> DATABASE_URL=postgresql://plurione:novalex_secure_pg_2026@localhost:5432/contratos_db
> ```

---

### Paso 2: Configurar Ollama Local

1. Descarga e instala Ollama desde [ollama.com](https://ollama.com).
2. Descarga el modelo Llama 3.1 8B en tu terminal:
   ```bash
   ollama run llama3.1:8b
   ```
3. Verifica que el servicio esté respondiendo en `http://localhost:11434`.
4. En tu `.env` local, configura:
   ```env
   OLLAMA_HOST=http://localhost:11434
   MODEL_NAME=llama3.1:8b
   ```

---

### Paso 3: Iniciar el Backend FastAPI

1. Navega al directorio `backend/` y crea un entorno virtual:
   ```bash
   cd backend
   python -m venv venv

   # En Linux / macOS:
   source venv/bin/activate

   # En Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   ```

2. Instala las dependencias:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

   > [!NOTE]
   > **Dependencias Nativas de WeasyPrint en Windows**:
   > WeasyPrint requiere librerías compartidas del sistema (Cairo, Pango y GDK-Pixbuf). En Windows, si no están instaladas a nivel de sistema operativo, se recomienda instalar el paquete binario de GTK3 para Windows o ejecutar el backend dentro del contenedor Docker donde todas las librerías nativas vienen preinstaladas y compiladas.

3. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

### Paso 4: Iniciar el Frontend React

En una terminal separada, en la raíz del proyecto:

```bash
# Instalar dependencias de Node
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

La aplicación estará accesible en [http://localhost:3000](http://localhost:3000).

---

## 8. Persistencia, Secuencias Atómicas y Migraciones en PostgreSQL

### 8.1 Volumen Persistente
- Los datos relacionales residen en el volumen Docker `pgdata`. Nunca se destruyen los datos ni los volúmenes con comandos estándar como `docker compose down`.

### 8.2 Secuencia Atómica para Folios (`contratos_folio_seq`)
- Para evitar colisiones y condiciones de carrera bajo solicitudes concurrentes de generación de contratos, el sistema utiliza una secuencia nativa de PostgreSQL (`contratos_folio_seq`).
- Al iniciar la aplicación (`lifespan`), el backend sincroniza automáticamente el valor de la secuencia con el folio numérico más alto registrado en la base de datos (`NOVA-PSP-2026-XXX`), garantizando unicidad absoluta en cada llamada a `SELECT nextval('contratos_folio_seq')`.

### 8.3 Scripts de Migración Transaccional

#### `backend/migrate_auth.py`
- **Propósito**: Migra esquemas legados de bases de datos preexistentes hacia el sistema de autenticación moderno con contraseñas encriptadas con `bcrypt`.
- **Acciones**:
  1. Añade las columnas `username` (`VARCHAR(50) UNIQUE`) y `activo` (`BOOLEAN DEFAULT TRUE`) a la tabla `usuarios` si no existieran.
  2. Genera hashes seguros con `bcrypt` (12 rondas de salt) para las cuentas de demostración con contraseña `inicio2026`.
  3. Inserta la cuenta de prueba inactiva `usr-inactivo-04`.
- **Cuándo ejecutarlo**: Solo es necesario si se conecta la aplicación a una base de datos histórica creada antes del módulo de autenticación. Las bases de datos creadas con `init_db.sql` ya contienen este esquema de forma nativa.
- **Ejecución**:
  ```bash
  docker exec -it plurione-backend python3 migrate_auth.py
  ```

#### `backend/migrate_identity.py`
- **Propósito**: Actualiza transaccionalmente la identidad de clientes y prestador hacia la marca ficticia NovaLex en bases de datos que contenían datos de prueba anteriores, preservando claves primarias y relaciones foráneas.
- **Ejecución**:
  ```bash
  docker exec -it plurione-backend python3 migrate_identity.py
  ```

---

## 9. Consideraciones del Modelo Llama 3.1 8B, CPU y Ventana de Contexto

- **Ventana de Contexto (`num_ctx: 8192`)**:
  Para contratos que incorporan las 10 cláusulas estándar completas, el proemio, las declaraciones y las variables sustituidas, el prompt enviado a Ollama contiene aproximadamente **2,332 tokens**. Con la configuración de `num_ctx: 8192`, el modelo dispone de un margen holgado de más de 5,800 tokens para generar el clausulado íntegro sin riesgo de truncamiento.
- **Inferencia en CPU y Timeout (`OLLAMA_TIMEOUT: 480`)**:
  En procesadores convencionales sin aceleración por tarjeta gráfica, la evaluación del prompt de 2,300 tokens toma aproximadamente 90 segundos, y la generación de 1,000 a 1,200 tokens se realiza a un ritmo de ~5 tokens/segundo (200-240 segundos adicionales). Por ello, el backend configura un timeout de **480 segundos** (8 minutos) por solicitud.
- **Detección de Truncamiento**:
  El backend valida la bandera `done_reason == "length"` en la respuesta de Ollama. Si la respuesta supera el límite de tokens sin haber completado el documento formal, el backend aborta la transacción y **no almacena contratos truncados**, notificando con un error explícito.
- **Aceleración GPU opcional**:
  En equipos con tarjeta gráfica NVIDIA compatible con CUDA, se puede descomentar la sección `deploy.resources.reservations.devices` en `docker-compose.yml` para reducir el tiempo de respuesta a 15-25 segundos.

---

## 10. Deslinde de Responsabilidad y Declaración Técnica

> [!IMPORTANT]
> **Declaración de Transparencia sobre Asistencia de Inteligencia Artificial en el Desarrollo**:
> Durante las fases de ingeniería de software, refactorización de seguridad, optimización de consultas y elaboración de suites de pruebas de este proyecto se utilizaron herramientas de desarrollo asistido por IA (específicamente Google Antigravity / Gemini) en modalidad de programación por pares (*pair programming*). Dichas herramientas fueron empleadas para acelerar la redacción de pruebas unitarias y de integración, esqueletos de código y formateo de documentación técnica.
> Toda la arquitectura final, las políticas de seguridad criptográfica (SCRAM-SHA-256 en PostgreSQL, contraseñas hasheadas con bcrypt a 12 rondas, prevención estricta de SSRF/LFI en WeasyPrint mediante fetchers restringidos, secuencias atómicas de base de datos), la lógica de negocio conforme a la legislación mercantil y civil mexicana y la verificación empírica en tiempo de ejecución fueron diseñadas, auditadas, ejecutadas y comprobadas directamente por el equipo de ingeniería responsable del proyecto.

> [!NOTE]
> **Carácter de Demostración Legal**:
> El contenido contractual, los datos de la empresa prestadora (**NovaLex Tecnología Contractual S.A. de C.V.**), los clientes y los números de RFC (como `NTC260101AB1`) son ficticios y tienen un propósito exclusivamente académico y de demostración de software. El texto generado está **pendiente de revisión jurídica formal** y no constituye asesoramiento legal profesional.

> [!NOTE]
> **Nota sobre Identidad PluriOne vs NovaLex**:
> El producto ha sido renovado institucionalmente bajo la identidad **NovaLex Tecnología Contractual S.A. de C.V.** Los nombres de contenedores (`plurione-backend`, `plurione-postgres`), usuarios de base de datos (`plurione`) y variables de compatibilidad transitoria (`EMPRESA_PLURIONE`) se conservan exclusivamente con fines de compatibilidad en la infraestructura Docker y estabilidad de volúmenes preexistentes.
