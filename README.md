<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Motor Inteligente de Generación Automática de Contratos
**NovaLex Tecnología Contractual S.A. de C.V. (Soluciones Digitales)**

Sistema web de generación automática de contratos de **Prestación de Servicios Profesionales** bajo legislación mexicana, con redacción asistida por IA local (**Llama 3.1 8B vía Ollama**), exportación a PDF de alta fidelidad (**WeasyPrint**) y flujo de aprobación de 3 roles (**Generador, Editor, Aprobador**).

---

## Despliegue con Docker Compose (Recomendado)

El sistema está completamente contenedorizado para ejecutarse de forma local y 100% offline sin costo de APIs externas.

### 1. Requisitos Previos
- Docker Desktop instalado y en ejecución.

### 2. Levantar la suite completa de servicios
En la raíz del proyecto, ejecuta:

```bash
docker compose up --build
```

Esto compilará y levantará los 4 servicios integrados:
1. **Frontend React + Vite**: [http://localhost:3000](http://localhost:3000)
2. **Backend FastAPI**: [http://localhost:8000](http://localhost:8000) (Docs: [http://localhost:8000/docs](http://localhost:8000/docs))
3. **PostgreSQL 15**: Puerto `5432` con base de datos `contratos_db` inicializada.
4. **Ollama (IA Local)**: Puerto `11434`.

### 3. Descargar el modelo de IA local (primera ejecución)
Una vez que el contenedor de Ollama esté en marcha, descarga el modelo Llama 3.1 8B:

```bash
docker exec -it plurione-ollama ollama run llama3.1:8b
```

---

## Ejecución Local (Sin Docker)

### Requisitos:
- Node.js >= 18
- Python >= 3.11

1. Instalar dependencias del frontend:
   ```bash
   npm install
   ```
2. Iniciar el frontend:
   ```bash
   npm run dev
   ```

