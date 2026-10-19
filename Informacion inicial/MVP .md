# MVP — Motor Inteligente de Generación Automática de Contratos
**PluriOne S.A. de C.V. · Develop Talent & Technology**
**Alumno:** Ulises Contreras Valdez | **Entrega:** 2 de octubre de 2026
 
---
 
## 1. Resumen Ejecutivo
 
Sistema web local que permite generar automáticamente contratos de **Prestación de Servicios Profesionales** a partir de un catálogo de cláusulas estándar bajo la legislación mexicana, datos de clientes registrados manualmente e inteligencia artificial local (**Llama 3.1 8B vía Ollama**) para redacción y ensamblado. El documento final se exporta en formato **PDF**. Todo el procesamiento ocurre en el servidor local, sin depender de un servicio de IA externo ni generar costo por uso.
 
---
 
## 2. Alcance del MVP
 
### 2.1 Incluido
- Registro manual de clientes con datos fiscales mexicanos
- Catálogo de cláusulas estándar (legislación mexicana) + módulo para crear cláusulas personalizadas
- Generación automática del contrato asistida por IA local (Llama 3.1 8B vía Ollama)
- Exportación del contrato en PDF
- Flujo de aprobación con 3 roles de usuario
- Control de estado del contrato (Borrador → En revisión → Aprobado)
- Despliegue local
### 2.2 Excluido del MVP
- Firma electrónica
- Historial de versiones
- Múltiples tipos de contrato (se expanden en V2)
- Despliegue en nube
- SSO / integración con Active Directory
- Notificaciones por correo electrónico
---
 
## 3. Stack Tecnológico
 
| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Backend | Python 3.11 + FastAPI | Rápido de desarrollar; excelente soporte LangChain |
| Frontend | React.js | SPA liviana; fácil conexión con FastAPI via REST |
| IA | Llama 3.1 8B (Ollama, local) + LangChain | Costo $0; requiere ≥8 GB RAM; datos nunca salen del servidor |
| Generación PDF | WeasyPrint | Convierte HTML/CSS a PDF sin dependencias de Office |
| Base de datos | PostgreSQL | Relacional; soporta JSONB para cláusulas flexibles |
| Contenedores | Docker + Docker Compose | Despliegue local reproducible en un solo comando |
| Control de código | GitHub | Trazabilidad y respaldo |
 
---
 
## 4. Módulos del Sistema
 
### 4.1 Módulo de Clientes
Registro manual con los siguientes campos:
 
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Razón Social | Texto | ✅ |
| RFC | Texto (13 chars) | ✅ |
| Domicilio Fiscal | Texto largo | ✅ |
| Representante Legal | Texto | ✅ |
| Cargo del Representante | Texto | ✅ |
| Número de Escritura / Poder Notarial | Texto | ✅ |
| Correo de Contacto | Email | ✅ |
| Teléfono | Texto | Opcional |
 
---
 
### 4.2 Módulo de Cláusulas
Dos fuentes de cláusulas:
 
**A) Cláusulas Estándar (precargadas)**
 
Basadas en el Código Civil Federal, Ley Federal del Trabajo y prácticas mercantiles en México:
 
1. Objeto del Contrato
2. Vigencia
3. Monto y Forma de Pago
4. Obligaciones del Prestador de Servicios
5. Obligaciones del Cliente
6. Confidencialidad
7. Propiedad Intelectual
8. Terminación Anticipada
9. Caso Fortuito y Fuerza Mayor
10. Jurisdicción y Ley Aplicable
**B) Cláusulas Personalizadas**
 
El administrador puede crear nuevas cláusulas con:
- Nombre de la cláusula
- Texto base (con variables entre llaves, ej. `{{monto}}`)
- Tipo: Opcional / Requerida
- Categoría libre
---
 
### 4.3 Módulo de Contratos
 
**Variables del contrato (captura manual al generar):**
 
| Variable | Descripción |
|----------|-------------|
| `{{fecha}}` | Fecha de firma del contrato |
| `{{objeto}}` | Descripción del servicio a prestar |
| `{{monto}}` | Monto total en pesos mexicanos |
| `{{forma_pago}}` | Mensual / Por entregable / Única exhibición |
| `{{vigencia_inicio}}` | Fecha de inicio del servicio |
| `{{vigencia_fin}}` | Fecha de término del servicio |
| `{{penalizacion}}` | % o monto por incumplimiento |
 
**Proceso de generación:**
1. Seleccionar cliente del catálogo
2. Seleccionar / deseleccionar cláusulas (estándar o personalizadas)
3. Capturar las variables específicas del contrato
4. Llama (vía Ollama) ensambla y redacta el texto completo
5. Previsualización en pantalla
6. Exportar a PDF
---
 
### 4.4 Flujo de Estados
 
```
[Borrador] ──genera──> [En revisión] ──aprueba──> [Aprobado]
                              │
                          rechaza
                              │
                              └──────────────> [Borrador]
```
 
| Estado | Quién actúa | Acciones disponibles |
|--------|-------------|----------------------|
| Borrador | Generador | Crear, editar, enviar a revisión |
| En revisión | Editor | Editar texto, aprobar, rechazar |
| Aprobado | Aprobador | Descargar PDF, archivar |
 
---
 
### 4.5 Módulo de Roles y Acceso
 
| Rol | Permisos |
|-----|----------|
| **Generador** | Registrar clientes, seleccionar cláusulas, capturar variables, generar contrato, enviar a revisión |
| **Editor** | Ver contratos en revisión, editar texto generado, aprobar o rechazar |
| **Aprobador** | Ver contratos aprobados pendientes, aprobación final, descarga del PDF |
 
Login con usuario y contraseña. Sin integración SSO en MVP.
 
---
 
## 5. Modelo de Datos (Simplificado)
 
```
clientes
  id, razon_social, rfc, domicilio_fiscal,
  representante_legal, cargo, escritura, email, telefono
 
clausulas
  id, nombre, texto_base, tipo (estandar/personalizada),
  categoria, requerida (bool)
 
contratos
  id, cliente_id, estado, fecha_creacion,
  variables (JSONB), clausulas_seleccionadas (array),
  texto_generado (text), creado_por, editado_por, aprobado_por
 
usuarios
  id, nombre, email, password_hash, rol (generador/editor/aprobador)
```
 
---
 
## 6. Arquitectura Local
 
```
┌───────────────────────────────────────────────┐
│                 Docker Compose                 │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐ │
│  │  React   │──▶│ FastAPI  │──▶│   Ollama   │ │
│  │ :3000    │   │  :8000   │   │  :11434    │ │
│  └──────────┘   └────┬─────┘   │ Llama 3.1  │ │
│                      │         │     8B     │ │
│                 ┌────▼─────┐   └────────────┘ │
│                 │PostgreSQL│                   │
│                 │  :5432   │                   │
│                 └──────────┘                   │
└───────────────────────────────────────────────┘
```
 
Todos los servicios corren en contenedores locales — no hay llamadas a APIs externas. Levantamiento con un solo comando:
```bash
docker-compose up --build
```
 
---
 
## 7. Cronograma
 
| Semana | Fechas | Actividades | Entregables |
|--------|--------|-------------|-------------|
| **1** | 14–19 Sep | Modelo de datos · Setup Docker · CRUD Clientes · Catálogo de cláusulas · Login y roles | Repo funcional · BD creada · Clientes y cláusulas operativos |
| **2** | 21–26 Sep | Setup Ollama + integración LangChain · Ensamblado contrato · Generación PDF · Flujo de estados · Pantallas por rol | Motor IA local funcionando · PDF descargable · Flujo completo |
| **3** | 28 Sep–2 Oct | Pruebas QA · Correcciones · Documentación técnica y de usuario · Demo interna · **Entrega final** | Reporte QA · Manuales · MVP entregado |
 
---
 
## 8. Criterios de Aceptación del MVP
 
- [ ] Se puede registrar un cliente con todos sus datos fiscales
- [ ] El catálogo muestra las 10 cláusulas estándar y permite crear nuevas
- [ ] Al generar, Llama produce el texto del contrato en un tiempo razonable (objetivo: <30s con GPU, <90s en CPU)
- [ ] El PDF se genera correctamente con todos los datos del cliente y cláusulas
- [ ] El flujo Borrador → En revisión → Aprobado funciona sin errores
- [ ] Los 3 roles solo pueden realizar las acciones que les corresponden
- [ ] El sistema levanta localmente con `docker-compose up`, sin conexión a internet
---
 
## 9. Riesgos y Mitigación
 
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| RAM/hardware insuficiente para Llama 3.1 8B | Media | Alto | Usar Mistral 7B (más ligero) o modo Jinja2 sin IA como respaldo |
| Tiempo insuficiente para el frontend | Alta | Medio | Usar componentes de MUI o Tailwind listos; no diseño custom |
| Calidad del texto generado por IA | Media | Medio | Prompt engineering + revisión manual del editor (está en el flujo) |
| PDF con formato incorrecto | Baja | Bajo | WeasyPrint con plantilla HTML fija; validar desde semana 2 |
 
---
 
## 10. Entregables Finales
 
1. Código fuente en repositorio GitHub
2. `docker-compose.yml` funcional para despliegue local
3. Manual técnico (instalación y configuración)
4. Manual de usuario (por rol)
5. Reporte de pruebas QA
6. Presentación ejecutiva del sistema
---
 
*Documento generado el 15 de septiembre de 2026*
*PluriOne S.A. de C.V. — Estadía Profesional*
 