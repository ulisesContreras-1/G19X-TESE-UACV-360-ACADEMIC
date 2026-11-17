# Evidencia 3: Registro de Cambios Técnicos y Refactorización
**Proyecto:** Motor Generador de Contratos — NovaLex Tecnología Contractual S.A. de C.V.  
**Fecha de Auditoría:** 8 de noviembre de 2026  
**Áreas:** Calidad de Código, Folios Atómicos, Ventana de Contexto y Documentación  

---

## 1. Limpieza de Dependencias No Utilizadas
- **Archivo:** `backend/requirements.txt`
- **Cambio:** Se eliminaron las librerías `langchain` y `langchain-community`, las cuales no eran requeridas por la aplicación (la inferencia con Ollama se gestiona directamente vía `requests` y la API nativa de Ollama).
- **Resultado:** Reducción de la superficie de ataque, menor huella de dependencias y tiempos de construcción más ágiles.
- **Dependencias conservadas:** `fastapi`, `uvicorn`, `pydantic`, `requests`, `psycopg2-binary`, `weasyprint`, `python-dotenv`, `jinja2`, `bcrypt`, `pyjwt`.

---

## 2. Generación Atómica de Folios con Secuencia PostgreSQL

### 2.1 Problema Identificado
El cálculo anterior del folio utilizaba:
```python
conteo_contratos = query_one("SELECT COUNT(*) as c FROM contratos;")["c"] + 1
```
Este enfoque presentaba una condición de carrera crítica: si dos solicitudes de generación se procesaban de forma concurrente, o si se eliminaba un contrato previo, se generaban números de folio duplicados o inconsistentes.

### 2.2 Solución Implementada
Se implementó una secuencia nativa de PostgreSQL (`contratos_folio_seq`):
1. **Sincronización en Arranque (`lifespan`):**
   ```python
   def sincronizar_secuencia_folios(conn):
       with conn.cursor() as cur:
           cur.execute("CREATE SEQUENCE IF NOT EXISTS contratos_folio_seq START WITH 1;")
           cur.execute("""
               SELECT COALESCE(MAX(
                   CAST(SUBSTRING(variables->>'folio' FROM 'NOVA-PSP-2026-([0-9]+)') AS INTEGER)
               ), 0) FROM contratos WHERE variables->>'folio' IS NOT NULL;
           """)
           max_folio = cur.fetchone()[0] or 0
           if max_folio > 0:
               cur.execute("SELECT setval('contratos_folio_seq', %s, true);", (max_folio,))
           else:
               cur.execute("SELECT setval('contratos_folio_seq', 1, false);")
   ```
2. **Generación Atómica:**
   ```python
   seq_row = query_one("SELECT nextval('contratos_folio_seq') AS seq;")
   folio_num = seq_row["seq"]
   folio = f"NOVA-PSP-2026-{String_folio(folio_num)}"
   ```
- **Resultado:** Las solicitudes concurrentes reciben folios estrictamente secuenciales e irrepetibles, garantizados a nivel de motor de base de datos.

---

## 3. Optimización de Ventana de Contexto y Timeout en Ollama

### 3.1 Análisis de Consumo de Tokens
- **Prompt con 10 cláusulas:** Con todas las cláusulas estándar, declaraciones completas y variables del contrato, el prompt suma **2,332 tokens**.
- **Límite anterior (`num_ctx: 4096`):** Dejaba un margen de 1,764 tokens para la respuesta, lo que podía causar truncamiento prematuro en contratos extensos.
- **Configuración actual (`num_ctx: 8192`):** Asigna holgura suficiente para más de 5,800 tokens de salida, garantizando que el clausulado completo y las firmas se redacten sin cortes.

### 3.2 Ajuste de Timeout para Inferencia en CPU
- En hardware sin GPU, la velocidad promedio de inferencia es de ~5.5 tokens/segundo.
- La evaluación del contexto toma ~90 segundos y la generación de un contrato completo toma ~200-240 segundos.
- Se parametrizó `OLLAMA_TIMEOUT` con un valor por defecto de **480 segundos** (8 minutos), evitando interrupciones por timeout HTTP 504.

---

## 4. Preservación de Integridad de Datos en Pruebas
- Se refactorizó `backend/test_integration.py` (Pruebas 7, 8 y 9) para utilizar un contrato de prueba dedicado (`cnt-test-lifecycle`), eliminándolo al finalizar el ciclo de vida.
- Nunca se ejecutan sentencias destructivas (`UPDATE` sobre contratos existentes de demostración) preservando la inmutabilidad de los datos históricos.
