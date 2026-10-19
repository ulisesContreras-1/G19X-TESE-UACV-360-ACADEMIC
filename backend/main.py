import os
import re
import json
import time
import requests
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Response, Request, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from weasyprint import HTML

from db import get_db_connection, query_all, query_one, execute_command
from adapters import db_to_cliente_fiscal, db_to_clausula, db_to_contrato
from initial_clauses import inicializar_clausulas_estandar
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    require_roles,
    JWT_EXPIRATION_HOURS
)

# Variables de entorno
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.1:8b")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://plurione@postgres:5432/contratos_db")

# Datos ficticios de demostración de NovaLex Tecnología Contractual S.A. de C.V.
# NOTA: Identidad corporativa ficticia con fines ilustrativos y de demostración de software.
# El RFC no representa un registro fiscal real ante el SAT.
EMPRESA_NOVALEX = {
    "razonSocial": "NovaLex Tecnología Contractual S.A. de C.V.",
    "nombreComercial": "Soluciones Digitales",
    "rfc": "NTC260101AB1",
    "domicilioFiscal": "Av. Insurgentes Sur 1602 Piso 4, Col. Crédito Constructor, Benito Juárez, C.P. 03940, Ciudad de México (Demostración)",
    "representanteLegal": "Lic. Claudia Sandoval Ortega",
    "cargoRepresentante": "Apoderada Legal y Directora General",
    "escrituraPublica": "Póliza Mercantil No. 12,345 ante Correduría Pública No. 80 de la Ciudad de México (Ficticia / Demostración)",
    "telefono": "55 5555 0199",
    "email": "contacto@novalex.example.com",
    "esDemostracion": True
}
EMPRESA_PLURIONE = EMPRESA_NOVALEX  # Alias de compatibilidad transitoria


def validar_rfc_mexicano(rfc_raw: str) -> bool:
    """Valida formato de RFC oficial del SAT para personas físicas (13) o morales (12)."""
    rfc = rfc_raw.strip().upper()
    regex_moral = r"^[A-Z&Ñ]{3}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$"
    regex_fisica = r"^[A-Z&Ñ]{4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$"
    return bool(re.match(regex_moral, rfc) or re.match(regex_fisica, rfc))


def obtener_mapa_usuarios() -> Dict[str, str]:
    """Carga mapa de usuarios {id: nombre} para asociar nombres a IDs."""
    try:
        rows = query_all("SELECT id, nombre FROM usuarios;")
        return {r["id"]: r["nombre"] for r in rows}
    except Exception:
        return {
            "usr-gen-01": "Valeria Ramos Peña",
            "usr-edit-02": "Eduardo Lozano Mora",
            "usr-aprob-03": "Javier Morales Hinojosa"
        }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización de la aplicación: asegura cláusulas estándar y datos de demostración."""
    try:
        with get_db_connection() as conn:
            # 1. Cargar catálogo de 10 cláusulas estándar de forma idempotente
            insertadas = inicializar_clausulas_estandar(conn)
            print(f"[Startup] Inicialización de cláusulas completada. Nuevas insertadas: {insertadas}")
    except Exception as e:
        print(f"[Startup Error] Error al inicializar cláusulas en DB: {e}")
    yield


app = FastAPI(
    title="Motor de Contratos NovaLex",
    version="1.0.0",
    description="API REST para generación legal asistida con Ollama (Llama 3.1 8B), persistencia en PostgreSQL y exportación PDF con WeasyPrint.",
    lifespan=lifespan
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Modelos Pydantic para Validación de Entradas
# ==============================================================================

class SolicitudLogin(BaseModel):
    username: str = Field(..., min_length=2, description="Usuario o correo electrónico")
    password: str = Field(..., min_length=1, description="Contraseña de acceso")


class RespuestaLogin(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class ClienteCrear(BaseModel):
    id: Optional[str] = None
    razonSocial: str = Field(..., min_length=2)
    rfc: str = Field(..., min_length=12, max_length=13)
    domicilioFiscal: str = Field(..., min_length=5)
    representanteLegal: str = Field(..., min_length=3)
    cargo: str = Field(..., min_length=2)
    escritura: str = Field(..., min_length=3)
    email: str = Field(..., min_length=5)
    telefono: Optional[str] = ""
    esDemo: Optional[bool] = False


class ClausulaCrear(BaseModel):
    id: Optional[str] = None
    nombre: str = Field(..., min_length=3)
    textoBase: str = Field(..., min_length=10)
    categoria: Optional[str] = "Personalizada"
    requerida: Optional[bool] = False


class VariablesContratoIn(BaseModel):
    fecha: str
    lugar_firma: Optional[str] = "Ciudad de México"
    objeto: str = Field(..., min_length=5)
    monto: float = Field(..., gt=0)
    forma_pago: str = Field(..., min_length=2)
    vigencia_inicio: str = Field(..., min_length=8)
    vigencia_fin: str = Field(..., min_length=8)
    penalizacion: Optional[str] = "1% diario por retraso injustificado"


class SolicitudGeneracionContrato(BaseModel):
    cliente_id: str
    variables: VariablesContratoIn
    clausulas_ids: Optional[List[str]] = []
    creado_por: Optional[str] = "usr-gen-01"


class ActualizarTextoContrato(BaseModel):
    textoGenerado: str


class ActualizarEstadoContrato(BaseModel):
    nuevoEstado: str = Field(..., pattern="^(BORRADOR|EN_REVISION|APROBADO|RECHAZADO)$")
    usuarioId: str
    usuarioNombre: str
    rol: str = Field(..., pattern="^(GENERADOR|EDITOR|APROBADOR)$")
    detalles: Optional[str] = None
    motivoRechazo: Optional[str] = None


class SolicitudPDF(BaseModel):
    titulo: str
    contenido_html: str


# ==============================================================================
# Endpoints Generales y Healthcheck
# ==============================================================================

@app.get("/")
def raiz():
    return {
        "sistema": "Motor Inteligente de Generación Automática de Contratos",
        "empresa": "NovaLex Tecnología Contractual S.A. de C.V. (Demostración)",
        "estado": "Operativo",
        "persistencia": "PostgreSQL Activo",
        "ia_local": f"Ollama ({MODEL_NAME})"
    }


@app.get("/health")
def salud():
    """Verifica estado de salud de PostgreSQL y Ollama."""
    db_ok = False
    try:
        r = query_one("SELECT 1 as test;")
        db_ok = bool(r and r.get("test") == 1)
    except Exception:
        db_ok = False

    ollama_ok = False
    modelos_disponibles = []
    try:
        res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        if res.status_code == 200:
            ollama_ok = True
            modelos_disponibles = [m.get("name") for m in res.json().get("models", [])]
    except Exception:
        ollama_ok = False

    return {
        "status": "healthy" if (db_ok and ollama_ok) else "degraded",
        "database_conectada": db_ok,
        "ollama_conectado": ollama_ok,
        "ollama_host": OLLAMA_HOST,
        "modelo_objetivo": MODEL_NAME,
        "modelos_locales": modelos_disponibles
    }


# ==============================================================================
# Endpoints de Autenticación y Sesión Real (JWT + Bcrypt)
# ==============================================================================

@app.post("/api/v1/auth/login", response_model=RespuestaLogin)
def iniciar_sesion(payload: SolicitudLogin):
    """
    Autenticación real de usuarios de NovaLex:
    1. Recibe usuario o correo y contraseña.
    2. Consulta el usuario en PostgreSQL.
    3. Verifica la contraseña contra su hash bcrypt.
    4. Comprueba que la cuenta esté habilitada.
    5. Devuelve sesión autenticada mediante JWT firmado con expiración.
    6. Devuelve únicamente los datos necesarios (id, username, nombre, email, rol, cargo).
    7. Devuelve HTTP 401 sin revelar si el usuario existe.
    """
    usuario = authenticate_user(payload.username, payload.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifica tu usuario y contraseña.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if usuario.get("error") == "ACCOUNT_DISABLED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario se encuentra deshabilitada. Contacta al administrador.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token_payload = {
        "sub": usuario["id"],
        "username": usuario["username"],
        "nombre": usuario["nombre"],
        "email": usuario["email"],
        "rol": usuario["rol"]
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRATION_HOURS * 3600,
        "user": {
            "id": usuario["id"],
            "username": usuario["username"],
            "nombre": usuario["nombre"],
            "email": usuario["email"],
            "rol": usuario["rol"],
            "cargo": usuario.get("cargo", "")
        }
    }


@app.get("/api/v1/auth/me")
def obtener_usuario_actual(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retorna el perfil del usuario autenticado a partir del token JWT."""
    return {
        "id": current_user["id"],
        "username": current_user.get("username"),
        "nombre": current_user["nombre"],
        "email": current_user["email"],
        "rol": current_user["rol"],
        "cargo": current_user.get("cargo", "")
    }


@app.post("/api/v1/auth/logout")
def cerrar_sesion(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Cierre de sesión: el token JWT es destruido por el cliente.
    Este endpoint valida que la sesión era legítima y confirma la terminación.
    """
    return {
        "mensaje": "Sesión cerrada correctamente.",
        "usuario": current_user.get("username")
    }


# ==============================================================================
# Endpoints de Clientes (PostgreSQL)
# ==============================================================================

@app.get("/api/v1/clientes")
def listar_clientes(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta todos los clientes registrados en PostgreSQL con formato ClienteFiscal."""
    try:
        rows = query_all(
            """
            SELECT id, razon_social, rfc, domicilio_fiscal, representante_legal,
                   cargo, escritura, email, telefono, es_demo, creado_en
            FROM clientes
            ORDER BY creado_en DESC;
            """
        )
        return [db_to_cliente_fiscal(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando clientes en DB: {str(e)}")


@app.get("/api/v1/clientes/{cliente_id}")
def obtener_cliente(cliente_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta un cliente específico por ID."""
    row = query_one(
        """
        SELECT id, razon_social, rfc, domicilio_fiscal, representante_legal,
               cargo, escritura, email, telefono, es_demo, creado_en
        FROM clientes
        WHERE id = %s;
        """,
        (cliente_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Cliente '{cliente_id}' no encontrado.")
    return db_to_cliente_fiscal(row)


@app.post("/api/v1/clientes", status_code=201)
def registrar_cliente(
    payload: ClienteCrear,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Registra un nuevo cliente en PostgreSQL con validación de RFC."""
    rfc = payload.rfc.strip().upper()
    if not validar_rfc_mexicano(rfc):
        raise HTTPException(
            status_code=400,
            detail=f"El RFC '{rfc}' no cumple con la estructura oficial del SAT (12 caracteres persona moral o 13 física)."
        )

    cliente_id = payload.id or f"cli-{int(time.time() * 1000)}"

    try:
        execute_command(
            """
            INSERT INTO clientes (
                id, razon_social, rfc, domicilio_fiscal, representante_legal,
                cargo, escritura, email, telefono, es_demo, creado_en
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                razon_social = EXCLUDED.razon_social,
                rfc = EXCLUDED.rfc,
                domicilio_fiscal = EXCLUDED.domicilio_fiscal,
                representante_legal = EXCLUDED.representante_legal,
                cargo = EXCLUDED.cargo,
                escritura = EXCLUDED.escritura,
                email = EXCLUDED.email,
                telefono = EXCLUDED.telefono;
            """,
            (
                cliente_id,
                payload.razonSocial.strip(),
                rfc,
                payload.domicilioFiscal.strip(),
                payload.representanteLegal.strip(),
                payload.cargo.strip(),
                payload.escritura.strip(),
                payload.email.strip(),
                payload.telefono.strip() if payload.telefono else "",
                payload.esDemo or False
            )
        )
        return obtener_cliente(cliente_id, current_user=current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando cliente en PostgreSQL: {str(e)}")


# ==============================================================================
# Endpoints de Cláusulas (PostgreSQL)
# ==============================================================================

@app.get("/api/v1/clausulas")
def listar_clausulas(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta el catálogo de cláusulas desde PostgreSQL."""
    try:
        rows = query_all(
            """
            SELECT id, nombre, texto_base, tipo, categoria, requerida, orden, creado_en
            FROM clausulas
            ORDER BY orden ASC, creado_en ASC;
            """
        )
        # Si la tabla estuviese vacía por alguna razón, se inicializa al vuelo
        if not rows:
            with get_db_connection() as conn:
                inicializar_clausulas_estandar(conn)
            rows = query_all(
                """
                SELECT id, nombre, texto_base, tipo, categoria, requerida, orden, creado_en
                FROM clausulas
                ORDER BY orden ASC, creado_en ASC;
                """
            )
        return [db_to_clausula(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando cláusulas en DB: {str(e)}")


@app.post("/api/v1/clausulas", status_code=201)
def registrar_clausula(
    payload: ClausulaCrear,
    current_user: Dict[str, Any] = Depends(require_roles(["EDITOR", "APROBADOR"]))
):
    """Registra una nueva cláusula personalizada en PostgreSQL."""
    clausula_id = payload.id or f"clausula-custom-{int(time.time() * 1000)}"

    # Obtener el siguiente número de orden
    max_orden_row = query_one("SELECT COALESCE(MAX(orden), 0) + 1 as siguiente FROM clausulas;")
    siguiente_orden = max_orden_row["siguiente"] if max_orden_row else 11

    try:
        execute_command(
            """
            INSERT INTO clausulas (
                id, nombre, texto_base, tipo, categoria, requerida, orden, creado_en
            ) VALUES (%s, %s, %s, 'PERSONALIZADA', %s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                texto_base = EXCLUDED.texto_base,
                categoria = EXCLUDED.categoria,
                requerida = EXCLUDED.requerida;
            """,
            (
                clausula_id,
                payload.nombre.strip(),
                payload.textoBase.strip(),
                payload.categoria or "Personalizada",
                payload.requerida or False,
                siguiente_orden
            )
        )
        row = query_one("SELECT * FROM clausulas WHERE id = %s;", (clausula_id,))
        return db_to_clausula(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando cláusula en PostgreSQL: {str(e)}")


@app.post("/api/v1/clausulas/inicializar-estandar")
def recargar_clausulas_estandar(
    current_user: Dict[str, Any] = Depends(require_roles(["EDITOR", "APROBADOR"]))
):
    """Ejecuta de forma explícita la inserción idempotente de las 10 cláusulas estándar de demo."""
    try:
        with get_db_connection() as conn:
            insertadas = inicializar_clausulas_estandar(conn)
        return {
            "mensaje": "Inicialización idempotente ejecutada correctamente.",
            "clausulas_insertadas": insertadas,
            "total_actual": query_one("SELECT COUNT(*) as c FROM clausulas;")["c"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al inicializar cláusulas: {str(e)}")


# ==============================================================================
# Endpoints de Contratos: Generación con Ollama y Persistencia
# ==============================================================================

@app.get("/api/v1/contratos")
def listar_contratos(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta la lista de contratos registrados en PostgreSQL."""
    try:
        usuarios_map = obtener_mapa_usuarios()
        rows = query_all(
            """
            SELECT id, cliente_id, tipo_contrato, estado, variables,
                   clausulas_seleccionadas, texto_generado, creado_por,
                   editado_por, aprobado_por, creado_en, actualizado_en
            FROM contratos
            ORDER BY actualizado_en DESC;
            """
        )
        return [db_to_contrato(r, usuarios_map) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar contratos de DB: {str(e)}")


@app.get("/api/v1/contratos/{contrato_id}")
def obtener_contrato(contrato_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta el detalle de un contrato específico."""
    usuarios_map = obtener_mapa_usuarios()
    row = query_one(
        """
        SELECT id, cliente_id, tipo_contrato, estado, variables,
               clausulas_seleccionadas, texto_generado, creado_por,
               editado_por, aprobado_por, creado_en, actualizado_en
        FROM contratos
        WHERE id = %s;
        """,
        (contrato_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Contrato con ID '{contrato_id}' no encontrado.")
    return db_to_contrato(row, usuarios_map)


@app.post("/api/v1/contratos/generar", status_code=201)
def generar_contrato_con_persistencia(
    payload: SolicitudGeneracionContrato,
    current_user: Dict[str, Any] = Depends(require_roles(["GENERADOR"])),
    x_ollama_host: Optional[str] = Header(None)
):
    """
    Objetivo 1 del PRD:
    1. Valida los datos recibidos.
    2. Verifica que el cliente exista en PostgreSQL.
    3. Genera el texto mediante Ollama (Llama 3.1 8B).
    4. Guarda el contrato con ID único, estado BORRADOR, variables, cláusulas, texto y timestamps.
    5. Devuelve el ID del contrato y el texto generado.
    6. Si Ollama falla, devuelve un error claro sin guardar datos parciales ni devolver falsos éxitos.
    """
    ollama_service_host = x_ollama_host or OLLAMA_HOST
    # 1. Validación de variables del contrato
    v = payload.variables
    if not v.objeto.strip():
        raise HTTPException(status_code=400, detail="El objeto del contrato es obligatorio.")
    if v.monto <= 0:
        raise HTTPException(status_code=400, detail="El monto del contrato debe ser mayor a 0.")
    if not v.vigencia_inicio or not v.vigencia_fin:
        raise HTTPException(status_code=400, detail="Las fechas de vigencia son obligatorias.")

    # 2. Verificación de existencia del cliente en PostgreSQL
    cliente = query_one(
        """
        SELECT id, razon_social, rfc, domicilio_fiscal, representante_legal, cargo, escritura, email
        FROM clientes
        WHERE id = %s;
        """,
        (payload.cliente_id,)
    )
    if not cliente:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el cliente con ID '{payload.cliente_id}' en la base de datos PostgreSQL."
        )

    # 3. Consulta de cláusulas seleccionadas para enriquecer el prompt
    clausulas_ids = payload.clausulas_ids or []
    texto_clausulas_resumen = ""
    if clausulas_ids:
        clausulas_rows = query_all(
            "SELECT id, nombre, orden FROM clausulas WHERE id = ANY(%s) ORDER BY orden ASC;",
            (clausulas_ids,)
        )
        texto_clausulas_resumen = ", ".join([f"{c['orden']}. {c['nombre']}" for c in clausulas_rows])

    # 4. Construcción del Prompt Estructurado para Llama 3.1 8B
    prompt_ia = f"""Escribe una plantilla ilustrativa de acuerdo de prestación de servicios para la empresa {EMPRESA_NOVALEX['razonSocial']} y el cliente {cliente['razon_social']}, con declaraciones y cláusulas simuladas con fines de demostración académica y desarrollo de software:
- Objeto del servicio: {v.objeto}
- Monto total: $ {v.monto:,.2f} M.N. más 16% de IVA
- Esquema de pago: {v.forma_pago}
- Vigencia del acuerdo: Del {v.vigencia_inicio} al {v.vigencia_fin}
- Penalización: {v.penalizacion}
- Lugar y fecha: {v.lugar_firma}, {v.fecha}
- Cláusulas requeridas: {texto_clausulas_resumen if texto_clausulas_resumen else 'Declaraciones, Objeto, Contraprestación, Vigencia, Confidencialidad, Jurisdicción'}

Redacta el texto formal completo con proemio, declaraciones, cláusulas numeradas y bloque de firmas para demostración."""

    # 5. Generación del texto con Ollama local (/api/chat con system role para evitar negativas)
    texto_generado = ""
    try:
        res = requests.post(
            f"{ollama_service_host}/api/chat",
            json={
                "model": MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": "Eres un generador de plantillas de texto de ejemplo para pruebas de software. Tu tarea es completar el siguiente formato de texto simulado de demostración empresarial."
                    },
                    {
                        "role": "user",
                        "content": prompt_ia
                    }
                ],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9,
                    "num_predict": 350
                }
            },
            timeout=180
        )
        if res.status_code == 200:
            data = res.json()
            texto_generado = data.get("message", {}).get("content", "").strip()
            if not texto_generado:
                raise HTTPException(
                    status_code=502,
                    detail="Ollama devolvió una respuesta vacía al generar el contrato."
                )
        else:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama reportó error HTTP {res.status_code}: {res.text}"
            )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail=f"Tiempo de espera agotado al comunicar con Ollama ({ollama_service_host}). El modelo {MODEL_NAME} no respondió en 180 segundos."
        )
    except requests.exceptions.RequestException as e:
        # NO guardamos contrato incompleto ante falla de Ollama
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo conectar al servicio local de Ollama en {ollama_service_host}. Verifica que el contenedor esté corriendo. Detalle: {str(e)}"
        )

    # 6. Persistencia del Contrato Generado en PostgreSQL
    nuevo_id = f"cnt-{int(time.time() * 1000)}"
    conteo_contratos = query_one("SELECT COUNT(*) as c FROM contratos;")["c"] + 1
    folio = f"NOVA-PSP-2026-{String_folio(conteo_contratos)}"

    variables_dict = {
        "fecha": v.fecha,
        "lugar_firma": v.lugar_firma or "Ciudad de México",
        "objeto": v.objeto,
        "monto": v.monto,
        "forma_pago": v.forma_pago,
        "vigencia_inicio": v.vigencia_inicio,
        "vigencia_fin": v.vigencia_fin,
        "penalizacion": v.penalizacion,
        "folio": folio,
        "esDemo": True,
        "historial": [
            {
                "id": f"hist-{int(time.time() * 1000)}",
                "timestamp": datetime_iso_now(),
                "usuario": current_user["nombre"],
                "rol": current_user["rol"],
                "accion": "Generación automatizada de contrato con Ollama (Llama 3.1 8B)",
                "detalles": f"Contrato generado con {len(clausulas_ids)} cláusulas seleccionadas e importe de $ {v.monto:,.2f} MXN."
            }
        ]
    }

    # Asignar creador directamente desde el usuario autenticado
    creador_id = current_user["id"]

    try:
        execute_command(
            """
            INSERT INTO contratos (
                id, cliente_id, tipo_contrato, estado, variables,
                clausulas_seleccionadas, texto_generado, creado_por,
                creado_en, actualizado_en
            ) VALUES (
                %s, %s, 'PRESTACION_SERVICIOS', 'BORRADOR', %s,
                %s, %s, %s, NOW(), NOW()
            );
            """,
            (
                nuevo_id,
                payload.cliente_id,
                json.dumps(variables_dict),
                clausulas_ids,
                texto_generado,
                creador_id
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error persistiendo el contrato en PostgreSQL: {str(e)}"
        )

    return {
        "id": nuevo_id,
        "folio": folio,
        "cliente_id": payload.cliente_id,
        "estado": "BORRADOR",
        "texto_generado": texto_generado,
        "modelo": MODEL_NAME,
        "creado_en": datetime_iso_now()
    }


def String_folio(numero: int) -> str:
    return str(numero).zfill(3)


def datetime_iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


@app.put("/api/v1/contratos/{contrato_id}")
def actualizar_texto_contrato(
    contrato_id: str,
    payload: ActualizarTextoContrato,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Actualiza el texto generado del contrato en PostgreSQL según permisos de rol."""
    contrato = query_one("SELECT * FROM contratos WHERE id = %s;", (contrato_id,))
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado.")

    estado_actual = contrato["estado"]
    rol = current_user["rol"]

    if estado_actual == "APROBADO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se puede modificar el texto de un contrato que ya ha sido aprobado."
        )

    if rol == "GENERADOR" and estado_actual != "BORRADOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rol Generador únicamente puede editar contratos en estado BORRADOR."
        )

    editado_por = current_user["id"] if rol in ["EDITOR", "APROBADOR"] else contrato["editado_por"]

    execute_command(
        """
        UPDATE contratos
        SET texto_generado = %s,
            editado_por = %s,
            actualizado_en = NOW()
        WHERE id = %s;
        """,
        (payload.textoGenerado, editado_por, contrato_id)
    )
    return obtener_contrato(contrato_id, current_user=current_user)


@app.put("/api/v1/contratos/{contrato_id}/estado")
def actualizar_estado_contrato(
    contrato_id: str,
    payload: ActualizarEstadoContrato,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Actualiza el estado del contrato con validación estricta de roles desde el token JWT:
    - GENERADOR: Puede mover BORRADOR -> EN_REVISION.
                 Intentar aprobar o rechazar -> HTTP 403.
    - EDITOR:    Puede revisar y editar texto en EN_REVISION.
                 Intentar aprobar directamente -> HTTP 403 (la aprobación definitiva está reservada al Aprobador).
                 Intentar rechazar formalmente -> HTTP 403 (reservado al Aprobador).
    - APROBADOR: Puede aprobar definitivamente (EN_REVISION -> APROBADO) o rechazar (EN_REVISION -> BORRADOR con motivo).
    """
    rol_solicitante = current_user["rol"]
    usuario_id = current_user["id"]
    usuario_nombre = current_user["nombre"]

    contrato = query_one("SELECT * FROM contratos WHERE id = %s;", (contrato_id,))
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado.")

    estado_actual = contrato["estado"]
    nuevo_estado = payload.nuevoEstado

    # Validación de permisos y transiciones
    if nuevo_estado == "EN_REVISION":
        if rol_solicitante not in ["GENERADOR"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: el rol '{rol_solicitante}' no tiene permiso para enviar contratos a revisión."
            )
        if estado_actual != "BORRADOR":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transición inválida: solo se pueden enviar a revisión contratos en estado BORRADOR (estado actual: {estado_actual})."
            )
    elif nuevo_estado == "APROBADO":
        if rol_solicitante != "APROBADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: el rol '{rol_solicitante}' no tiene facultad para aprobar contratos. La aprobación está reservada al Aprobador."
            )
        if estado_actual != "EN_REVISION":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transición inválida: solo se pueden aprobar contratos en estado EN_REVISION (estado actual: {estado_actual})."
            )
    elif nuevo_estado == "BORRADOR" and payload.motivoRechazo:
        if rol_solicitante != "APROBADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: el rol '{rol_solicitante}' no tiene facultad para rechazar contratos. El rechazo formal con observaciones está reservado al Aprobador."
            )
        if estado_actual != "EN_REVISION":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transición inválida: solo se pueden rechazar contratos en estado EN_REVISION (estado actual: {estado_actual})."
            )
    else:
        if rol_solicitante != "APROBADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: el rol '{rol_solicitante}' no tiene permisos para realizar esta transición de estado."
            )

    variables = contrato["variables"] or {}
    historial = variables.get("historial") or []

    accion_descripcion = (
        "Envío formal a revisión jurídica" if nuevo_estado == "EN_REVISION"
        else "Aprobación definitiva de contrato" if nuevo_estado == "APROBADO"
        else "Rechazo de contrato con solicitud de correcciones" if payload.motivoRechazo
        else f"Cambio de estado a {nuevo_estado}"
    )

    nuevo_evento_historial = {
        "id": f"hist-{int(time.time() * 1000)}",
        "timestamp": datetime_iso_now(),
        "usuario": usuario_nombre,
        "rol": rol_solicitante,
        "accion": accion_descripcion,
        "estadoAnterior": estado_actual,
        "estadoNuevo": nuevo_estado,
        "detalles": f"Motivo: {payload.motivoRechazo}" if payload.motivoRechazo else payload.detalles
    }
    historial.push(nuevo_evento_historial) if hasattr(historial, "push") else historial.append(nuevo_evento_historial)

    variables["historial"] = historial
    if payload.motivoRechazo:
        variables["motivoRechazo"] = payload.motivoRechazo
    elif nuevo_estado in ["EN_REVISION", "APROBADO"]:
        variables.pop("motivoRechazo", None)

    # Actualizar responsable según acción
    editado_por_update = contrato["editado_por"]
    aprobado_por_update = contrato["aprobado_por"]

    if rol_solicitante == "EDITOR":
        editado_por_update = usuario_id
    if nuevo_estado == "APROBADO":
        aprobado_por_update = usuario_id

    execute_command(
        """
        UPDATE contratos
        SET estado = %s,
            variables = %s,
            editado_por = %s,
            aprobado_por = %s,
            actualizado_en = NOW()
        WHERE id = %s;
        """,
        (
            nuevo_estado,
            json.dumps(variables),
            editado_por_update,
            aprobado_por_update,
            contrato_id
        )
    )

    return obtener_contrato(contrato_id, current_user=current_user)


# ==============================================================================
# Endpoints de Exportación PDF con WeasyPrint
# ==============================================================================

@app.post("/api/v1/contratos/exportar-pdf")
def exportar_contrato_pdf(
    payload: SolicitudPDF,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Convierte HTML/CSS a un documento PDF formal con WeasyPrint."""
    try:
        estilos_impresion = """
        <style>
            @page {
                size: letter;
                margin: 2.5cm 2cm 2.5cm 2cm;
                @bottom-right {
                    content: "Página " counter(page) " de " counter(pages);
                    font-size: 9pt;
                    color: #64748b;
                    font-family: Arial, sans-serif;
                }
                @bottom-left {
                    content: "NovaLex Tecnología Contractual S.A. de C.V. — Confidencial (Demostración)";
                    font-size: 8pt;
                    color: #94a3b8;
                    font-family: Arial, sans-serif;
                }
            }
            body {
                font-family: "Georgia", "Times New Roman", serif;
                font-size: 11pt;
                line-height: 1.6;
                color: #0f172a;
            }
            h1 {
                text-align: center;
                font-size: 15pt;
                text-transform: uppercase;
                margin-bottom: 20pt;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 6pt;
            }
            p {
                text-align: justify;
                margin-bottom: 10pt;
                white-space: pre-wrap;
            }
            .firmas-container {
                page-break-inside: avoid;
                margin-top: 40pt;
                display: flex;
                justify-content: space-between;
            }
            .bloque-firma {
                width: 45%;
                text-align: center;
                border-top: 1px solid #000;
                padding-top: 6pt;
                font-size: 10pt;
            }
        </style>
        """
        html_completo = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{payload.titulo}</title>
            {estilos_impresion}
        </head>
        <body>
            {payload.contenido_html}
        </body>
        </html>
        """
        pdf_bytes = HTML(string=html_completo).write_pdf()

        nombre_archivo = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', payload.titulo)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_archivo}.pdf"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar PDF con WeasyPrint: {str(e)}"
        )


@app.get("/api/v1/contratos/{contrato_id}/pdf")
def descargar_pdf_contrato(
    contrato_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Genera y descarga directamente el PDF de un contrato guardado en base de datos."""
    contrato = obtener_contrato(contrato_id, current_user=current_user)
    cliente = obtener_cliente(contrato["clienteId"], current_user=current_user)

    cuerpo_html = f"""
    <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>
    <div style="font-size: 10pt; color: #475569; margin-bottom: 20pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 8pt;">
        <strong>FOLIO:</strong> {contrato['folio']} &nbsp;|&nbsp;
        <strong>ESTADO:</strong> {contrato['estado']} &nbsp;|&nbsp;
        <strong>CLIENTE:</strong> {cliente['razonSocial']} (RFC: {cliente['rfc']})
    </div>
    <div style="white-space: pre-wrap; font-size: 10.5pt; line-height: 1.55; text-align: justify;">
{contrato['textoGenerado']}
    </div>
    """
    solicitud = SolicitudPDF(titulo=f"{contrato['folio']}_CONTRATO_NOVALEX", contenido_html=cuerpo_html)
    return exportar_contrato_pdf(solicitud, current_user=current_user)
