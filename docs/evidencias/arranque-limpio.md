# Evidencia 1: Arranque Limpio y Reproducibilidad del Sistema
**Proyecto:** Motor Generador de Contratos — NovaLex Tecnología Contractual S.A. de C.V.  
**Fecha de Auditoría:** 8 de noviembre de 2026  
**Entorno:** Docker Compose / Microservicios Locales & Opción Local sin Docker  

---

## 1. Resumen Ejecutivo
Se verificó el proceso de arranque y la reproducibilidad integral del sistema sin comprometer los volúmenes existentes ni destruir los datos históricos almacenados en PostgreSQL (`pgdata`) y Ollama (`ollama_data`). Se comprobó la orquestación mediante Docker Compose y se documentó detalladamente el procedimiento para ejecución manual local sin Docker.

---

## 2. Orquestación y Estados de Microservicios

El comando `docker compose ps` confirma que todos los servicios inician con dependencias controladas (`depends_on` con condición `service_healthy` para la base de datos):

```
NAME                IMAGE                               COMMAND                  SERVICE             STATUS                      PORTS
plurione-backend    motorgeneradordecontratos-backend   "uvicorn main:app --…"   backend             running                     0.0.0.0:8000->8000/tcp
plurione-ollama     ollama/ollama:latest                "/bin/ollama serve"      ollama              running                     0.0.0.0:11434->11434/tcp
plurione-postgres   postgres:15-alpine                  "docker-entrypoint.s…"   postgres            running (healthy)           127.0.0.1:5432->5432/tcp
```

### Comprobaciones Realizadas:
1. **Healthcheck de PostgreSQL:** El contenedor de base de datos reporta estado `healthy` mediante la sonda periódica `pg_isready -U plurione -d contratos_db`.
2. **Arranque del Backend:** El backend FastAPI espera la salud de PostgreSQL antes de inicializar (`depends_on.condition: service_healthy`).
3. **Persistencia de Volúmenes:** Los volúmenes `pgdata` y `ollama_data` preservan intactos los datos de demostración (3 clientes, 10 cláusulas estándar, contratos históricos y 4 usuarios).

---

## 3. Verificación de Salud del API (`/health`)

Petición HTTP a `http://localhost:8000/health`:
```json
{
  "status": "healthy",
  "database_conectada": true,
  "ollama_conectado": true,
  "servicios": {
    "fastapi": "OK",
    "postgresql": "OK",
    "ollama": "OK"
  },
  "detalles_ia": {
    "host": "http://ollama:11434",
    "modelo_configurado": "llama3.1:8b",
    "modelo_disponible": true,
    "modelos_en_ollama": [
      "llama3.1:8b"
    ]
  },
  "timestamp": "2026-11-09T04:10:32.345120+00:00"
}
```

---

## 4. Validación de la Opción de Arranque Local (Sin Docker)

Se añadió la Sección 7 al `README.md` con los pasos exactos y comandos para reproducir el sistema de forma nativa:
- **Node.js**: `npm install` y `npm run dev` para la interfaz React.
- **Python**: Entorno virtual `venv`, instalación de `requirements.txt` y ejecución con `uvicorn`.
- **PostgreSQL**: Creación de usuario `plurione`, base `contratos_db` y carga del script `backend/init_db.sql`.
- **Diferenciación de Host**: Se clarificó que fuera de Docker, `DATABASE_URL` debe usar `localhost:5432` y `OLLAMA_HOST` debe apuntar a `http://localhost:11434`.
