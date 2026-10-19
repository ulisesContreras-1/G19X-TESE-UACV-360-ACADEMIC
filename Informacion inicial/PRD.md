# PRD — Motor Inteligente de Generación Automática de Contratos
**Documento de Requerimientos de Producto (Product Requirements Document)**
 
| Campo | Detalle |
|-------|---------|
| Proyecto | Motor Inteligente de Generación Automática de Contratos |
| Empresa | PluriOne S.A. de C.V. (Develop Talent & Technology) |
| RFC | PLU060407HC9 |
| Alumno | Ulises Contreras Valdez |
| Asesor Empresarial / Externo | Juan Méndez Herrera |
| Líder de Proyecto / Evaluaciones | Edgar Loheffelmman |
| Representante Legal PluriOne | Xochicuahuitl Gleason Juárez |
| Fecha de entrega | 2 de octubre de 2026 |
| Versión del documento | 1.0 |
| Fecha de elaboración | 15 de septiembre de 2026 |
 
---
 
## 1. Resumen Ejecutivo
 
PluriOne S.A. de C.V., consultora especializada en servicios de consultoría, desarrollo de software y capacitación TI, requiere un motor inteligente que genere automáticamente contratos empresariales a partir de plantillas parametrizadas, reglas jurídicas y datos estructurados, reduciendo los tiempos de elaboración y estandarizando la documentación contractual.
 
Este documento define los requerimientos de producto para el MVP: una aplicación web de despliegue local que genera contratos de **Prestación de Servicios Profesionales**, con cláusulas estándar bajo legislación mexicana, redacción asistida por un modelo de lenguaje local (**Llama 3.1 8B vía Ollama**, sin costo de API) y un flujo de aprobación de 3 roles.
 
---
 
## 2. Objetivos
 
### 2.1 Objetivo General
Desarrollar un motor inteligente para la generación automática de contratos empresariales.
 
### 2.2 Objetivos Específicos
- Analizar los procesos actuales de elaboración contractual en PluriOne.
- Diseñar la arquitectura tecnológica del motor de generación.
- Implementar la generación automática y validación documental.
- Validar la calidad de los documentos generados por el motor.
- Elaborar documentación técnica y de usuario, con plan de soporte.
---
 
## 3. Justificación
 
| Dimensión | Impacto |
|-----------|---------|
| **Industria** | Reduce tiempos de elaboración contractual y estandariza la documentación |
| **PluriOne** | Amplía el portafolio LegalTech con inteligencia artificial aplicada a documentos jurídicos |
| **Desarrollo del alumno** | Fortalece competencias en IA generativa, automatización documental y arquitectura empresarial |
 
---
 
## 4. Alcance del Producto
 
### 4.1 Dentro de alcance (MVP)
- Registro manual de clientes con datos fiscales mexicanos (razón social, RFC, domicilio fiscal, representante legal)
- 1 tipo de contrato: **Prestación de Servicios Profesionales**
- Catálogo de 10 cláusulas estándar (legislación mexicana) + módulo de cláusulas personalizadas
- Generación de texto asistida por IA local (Llama 3.1 8B / Ollama)
- Exportación en PDF
- Flujo de aprobación de 3 roles: Generador, Editor, Aprobador
- Despliegue local vía Docker Compose
### 4.2 Fuera de alcance (V2 / futuro)
- Firma electrónica
- Historial de versiones de contratos
- Catálogo ampliado de tipos de contrato (Desarrollo de Software, Capacitación TI, Confidencialidad/NDA)
- Despliegue en nube
- SSO / Microsoft Entra ID
- Notificaciones automáticas por correo
> **Nota de desviación respecto a la propuesta original:** el documento de estadía contempla "trazabilidad y control de versiones" dentro de la delimitación del proyecto. Para el MVP (ventana de 3 semanas), esta funcionalidad se difiere a V2 a favor de completar el flujo generación → revisión → aprobación de extremo a extremo. Se documenta como decisión de alcance deliberada, no como omisión.
 
---
 
## 5. Usuarios y Roles
 
| Rol | Descripción | Permisos principales |
|-----|-------------|----------------------|
| **Generador** | Inicia el proceso de contratación | Registrar clientes, seleccionar cláusulas, capturar variables, generar borrador, enviar a revisión |
| **Editor** | Revisa y ajusta el contenido generado por la IA | Editar texto, aprobar o rechazar hacia el Generador |
| **Aprobador** | Autoriza la versión final del contrato | Aprobación final, descarga de PDF, archivo |
 
---
 
## 6. Requisitos Funcionales
 
| ID | Requisito | Módulo |
|----|-----------|--------|
| RF-01 | El sistema debe permitir registrar un cliente con razón social, RFC, domicilio fiscal, representante legal, cargo, número de escritura, correo y teléfono | Clientes |
| RF-02 | El sistema debe validar que el RFC tenga el formato correcto (13 caracteres para persona moral) | Clientes |
| RF-03 | El sistema debe mostrar un catálogo de 10 cláusulas estándar precargadas | Cláusulas |
| RF-04 | El sistema debe permitir crear cláusulas personalizadas con nombre, texto base, tipo (opcional/requerida) y categoría | Cláusulas |
| RF-05 | El sistema debe permitir seleccionar un cliente y las cláusulas aplicables para iniciar un contrato | Contratos |
| RF-06 | El sistema debe permitir capturar las variables del contrato (fecha, objeto, monto, forma de pago, vigencia, penalización) | Contratos |
| RF-07 | El sistema debe enviar la selección de cláusulas y variables al modelo Llama (vía Ollama) para ensamblar el texto del contrato | Contratos / IA |
| RF-08 | El sistema debe generar un PDF del contrato con el texto ensamblado | Contratos |
| RF-09 | El sistema debe mover el contrato por los estados Borrador → En revisión → Aprobado, con retorno a Borrador si se rechaza | Flujo |
| RF-10 | El sistema debe restringir las acciones disponibles según el rol del usuario autenticado | Roles / Acceso |
| RF-11 | El sistema debe requerir inicio de sesión con usuario y contraseña para cualquier operación | Roles / Acceso |
 
---
 
## 7. Historias de Usuario
 
- **Como Generador**, quiero registrar un cliente nuevo con sus datos fiscales, para poder asociarlo a un contrato.
- **Como Generador**, quiero seleccionar cláusulas estándar o crear una personalizada, para adaptar el contrato al caso específico.
- **Como Generador**, quiero que la IA redacte el contrato a partir de mi selección, para no escribirlo manualmente desde cero.
- **Como Editor**, quiero revisar y modificar el texto generado antes de aprobarlo, para asegurar que sea correcto y coherente.
- **Como Editor**, quiero poder rechazar un contrato y regresarlo a borrador, para que el Generador corrija lo necesario.
- **Como Aprobador**, quiero dar el visto bueno final y descargar el PDF, para formalizar el contrato con el cliente.
- **Como responsable del sistema**, quiero que todo corra en un servidor local sin conexión a internet, para no depender de servicios externos ni generar costos de API.
---
 
## 8. Requisitos No Funcionales
 
| Categoría | Requisito |
|-----------|-----------|
| **Rendimiento** | Generación del texto del contrato en menos de 30s (con GPU) o 90s (en CPU) |
| **Costo** | $0 de costo recurrente en el componente de IA (modelo local, sin API de pago) |
| **Privacidad** | Los datos de clientes y contratos no salen del servidor local |
| **Disponibilidad** | El sistema debe operar sin conexión a internet una vez desplegado |
| **Portabilidad** | Despliegue reproducible con un solo comando (`docker-compose up`) |
| **Usabilidad** | Interfaz web accesible desde navegador, sin instalación de cliente adicional |
| **Seguridad** | Autenticación obligatoria; contraseñas almacenadas con hash |
 
---
 
## 9. Stack Tecnológico
 
| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.11 + FastAPI |
| Frontend | React.js |
| IA | Llama 3.1 8B vía Ollama (local) + LangChain |
| Generación de PDF | WeasyPrint |
| Base de datos | PostgreSQL |
| Contenedores | Docker + Docker Compose |
| Control de versiones de código | GitHub |
 
> El stack se ajusta respecto a la propuesta original de estadía (que contemplaba Azure OpenAI, Azure AI Document Intelligence, GitHub Actions y Microsoft Entra ID). La decisión de usar un modelo local (Ollama/Llama) sustituye a Azure OpenAI para eliminar el costo de API y evitar el envío de datos contractuales a un proveedor externo.
 
---
 
## 10. Métricas de Éxito
 
- **Tiempo de elaboración:** reducción medible del tiempo para producir un contrato de Prestación de Servicios frente al proceso manual actual.
- **Cobertura funcional:** 100% de los criterios de aceptación del MVP cumplidos antes del 2 de octubre.
- **Calidad del texto generado:** el Editor aprueba el contrato sin reescritura mayor en la mayoría de los casos de prueba.
- **Autonomía operativa:** el sistema funciona de inicio a fin sin conexión a internet ni servicios de pago.
---
 
## 11. Supuestos y Restricciones
 
- El servidor local donde correrá Ollama cuenta con memoria suficiente para Llama 3.1 8B (≥8 GB RAM); de no ser así, se usa Mistral 7B como respaldo.
- El MVP cubre un solo tipo de contrato; el catálogo completo (4 tipos) es objetivo de una fase posterior.
- No se requiere firma electrónica ni integración con sistemas externos de PluriOne en esta fase.
- La fecha límite de entrega (2 de octubre de 2026) es fija y no negociable.
---
 
## 12. Cronograma de Alto Nivel
 
| Semana | Enfoque |
|--------|---------|
| 1 (14–19 Sep) | Modelo de datos, entorno Docker, registro de clientes, catálogo de cláusulas, login por rol |
| 2 (21–26 Sep) | Integración Ollama/Llama, ensamblado de contrato, generación de PDF, flujo de estados |
| 3 (28 Sep–2 Oct) | Pruebas QA, documentación técnica y de usuario, demo interna, entrega final |
 
*(Detalle día a día disponible en el documento de MVP técnico.)*
 
---
 
## 13. Stakeholders
 
| Nombre | Rol |
|--------|-----|
| Ulises Contreras Valdez | Alumno / Desarrollador |
| Juan Méndez Herrera | Asesor Empresarial / Externo, Responsable de Programas de Estadías |
| Edgar Loheffelmman | Líder de Proyecto / Evaluaciones |
| Xochicuahuitl Gleason Juárez | Representante Legal, PluriOne S.A. de C.V. |
 
---
 
## 14. Control de Versiones del Documento
 
| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 15 sep 2026 | Versión inicial del PRD, alineada al MVP acordado (1 tipo de contrato, IA local, PDF, 3 roles) |
 
---
 
*PluriOne S.A. de C.V. — Estadía Profesional · Documento generado el 15 de septiembre de 2026*