# Evidencia 2: Auditoría y Fortalecimiento de Seguridad
**Proyecto:** Motor Generador de Contratos — NovaLex Tecnología Contractual S.A. de C.V.  
**Fecha de Auditoría:** 16 de noviembre de 2026  
**Áreas:** Gestión de Secretos, PostgreSQL (SCRAM-SHA-256 Integral), WeasyPrint (SSRF / LFI) y Conexión de Base de Datos  

---

## 1. Gestión de Variables y Eliminación de Secretos Hardcodeados

### 1.1 Interpolación Obligatoria en `docker-compose.yml`
Se reemplazaron las claves predeterminadas en texto plano por sintaxis de interpolación requerida:
```yaml
# Antes (Inseguro - credencial por defecto en repositorio):
JWT_SECRET: ${JWT_SECRET:-4f9c8d2e7a1b3c5e8d9a0f2b4c6e8a1d3f5b7c9e0a2d4f6a8b0c2e4d6f8a0b2c}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-novalex_secure_pg_2026}

# Ahora (Seguro - exige definición explícita en .env):
JWT_SECRET: ${JWT_SECRET:?Define JWT_SECRET en .env}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en .env}
DATABASE_URL: postgresql://${POSTGRES_USER:-plurione}:${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD en .env}@postgres:5432/${POSTGRES_DB:-contratos_db}
```

**Prueba de fallo controlado:**
Al intentar ejecutar `docker compose config` sin las variables definidas en el entorno o archivo `.env`, Docker Compose aborta la ejecución de inmediato:
```
error while interpolating services.backend.environment.[]: required variable POSTGRES_PASSWORD is missing a value: Define POSTGRES_PASSWORD en .env
error while interpolating services.backend.environment.[]: required variable JWT_SECRET is missing a value: Define JWT_SECRET en .env
```

### 1.2 Plantilla `.env.example` Saneada y Codificación UTF-8
- Codificada explícitamente en UTF-8 con soporte verificado en Windows PowerShell y editores modernos.
- Todos los caracteres especiales y acentos (`Configuración`, `Autenticación`, `conexión`, `ejecución`, `criptográfica`, `Generación`, `orígenes`) se renderizan sin mojibake.
- Contiene marcadores claros (`CAMBIA_ESTA_CONTRASENA_AQUI`, `TU_JWT_SECRET_ALEATORIO_AQUI`) y documentación para generar secretos seguros de 256 bits mediante `secrets.token_hex(32)`.

---

## 2. Seguridad en PostgreSQL y Eliminación Total de Reglas `trust`

### 2.1 Configuración de `backend/pg_hba.conf`
Se eliminaron por completo las reglas `trust` tanto de la red interna Docker como del socket Unix local (`local all all`). Se forzó el método `scram-sha-256` para todos los puntos de conexión:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
local   replication     all                                     scram-sha-256
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
host    all             all             all                     scram-sha-256
```

### 2.2 Compatibilidad con Sondas de Salud Internas
Se comprobó que la sonda de salud `pg_isready -U plurione -d contratos_db` opera con código de retorno `0` (`accepting connections`), dado que `pg_isready` se conecta y desconecta a nivel de protocolo antes de la fase de autenticación completa. Los procesos internos y de monitoreo no se ven afectados por la eliminación de `trust`.

### 2.3 Restricción de Puerto en Host
En `docker-compose.yml`, la exposición del puerto 5432 fue restringida a la interfaz loopback (`127.0.0.1:5432:5432`), evitando que el puerto de base de datos sea accesible desde interfaces públicas o redes externas del host.

### 2.4 Verificación Empírica de Rechazo sin Contraseña
En `test_integration.py` (Prueba 11), se verificó que:
1. Una conexión con credenciales completas autentica satisfactoriamente con SCRAM.
2. Un intento de conexión sobre red TCP sin suministrar contraseña (`DB_URL_NO_PASSWORD`) es rechazado activamente por PostgreSQL:
   ```
   psycopg2.OperationalError: connection to server at "postgres" (172.18.0.3), port 5432 failed: fe_sendauth: no password supplied
   ```
3. Conexiones por socket local sin contraseña son igualmente rechazadas con `fe_sendauth: no password supplied`.

---

## 3. Prevención de Conexiones Silenciosas sin Contraseña en `backend/db.py`

Se implementó una validación estricta en `obtener_database_url()` utilizando `urllib.parse.urlparse`:
1. Si `DATABASE_URL` se especifica pero carece de contraseña (ej. `postgresql://plurione@localhost:5432/contratos_db`), la aplicación lanza inmediatamente un `RuntimeError` descriptivo.
2. Si `DATABASE_URL` no está definida y `POSTGRES_PASSWORD` está vacía o ausente, la aplicación aborta el arranque con `RuntimeError` en lugar de construir una URL sin contraseña.
3. Se garantiza consistencia total entre las variables de entorno de Docker Compose y la ejecución local fuera de contenedores.

---

## 4. Seguridad en WeasyPrint (Mitigación de SSRF y LFI)

### 4.1 Eliminación de Endpoint Vulnerable
El endpoint `POST /api/v1/contratos/exportar-pdf` permitía la recepción de fragmentos HTML arbitrarios por parte del cliente. Se confirmó que el frontend no utilizaba dicho endpoint (utiliza exclusivamente `GET /api/v1/contratos/{id}/pdf`) y se eliminó por completo de `backend/main.py`.

### 4.2 Saneamiento y Escape de Datos en Base de Datos
En el endpoint legítimo `GET /api/v1/contratos/{contrato_id}/pdf`:
- Se aplica `html.escape()` sobre `folio`, `estado`, `razonSocial`, `rfc` y el `textoGenerado` del contrato, neutralizando inyecciones de código HTML, `<script>`, `<iframe>` o `<style>`.

### 4.3 Fetcher Restringido (`safe_url_fetcher`)
Se implementó un `url_fetcher` customizado para WeasyPrint que intercepta cualquier resolución de URL:
```python
def safe_url_fetcher(url: str, timeout: int = 5, ssl_context=None):
    logger.warning("Intento de SSRF/LFI bloqueado en generación de PDF: %s", url)
    raise ValueError(f"Acceso a recursos externos y locales bloqueado por seguridad: {url}")
```
**Pruebas Automáticas Ejecutadas (Prueba 15):**
- Intento de resolución a metadatos de nube (`http://169.254.169.254/latest/meta-data/`): **Bloqueado con excepción `ValueError`.**
- Intento de inclusión de archivos locales (`file:///etc/passwd`): **Bloqueado con excepción `ValueError`.**
- El documento PDF formal se renderiza correctamente con firma binaria `%PDF-` sin consultar recursos externos.
