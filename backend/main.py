import os
import re
import json
import time
import logging
import requests
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Response, Request, Depends, status
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

# Configuración de Logging del Sistema
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("novalex.backend")

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


def numero_a_letras_pesos(monto: float) -> str:
    """Convierte un importe numérico a formato extendido formal en pesos mexicanos."""
    if not monto or monto <= 0:
        return "CERO PESOS 00/100 M.N."

    entero = int(monto)
    centavos = int(round((monto - entero) * 100))
    centavos_str = f"{centavos:02d}"

    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"]
    decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    def convertir_bloque(n: int) -> str:
        if n == 0:
            return ""
        if n == 100:
            return "CIEN"
        res = []
        c = n // 100
        d = (n % 100) // 10
        u = n % 10
        if c > 0:
            res.append(centenas[c])
        if d == 1:
            res.append(especiales[u])
        elif d == 2:
            if u == 0:
                res.append("VEINTE")
            else:
                res.append(f"VEINTI{unidades[u]}")
        elif d > 2:
            if u > 0:
                res.append(f"{decenas[d]} Y {unidades[u]}")
            else:
                res.append(decenas[d])
        elif d == 0 and u > 0:
            res.append(unidades[u])
        return " ".join(res)

    millones = entero // 1_000_000
    miles = (entero % 1_000_000) // 1000
    resto = entero % 1000

    partes = []
    if millones > 0:
        if millones == 1:
            partes.append("UN MILLÓN")
        else:
            partes.append(f"{convertir_bloque(millones)} MILLONES")
    if miles > 0:
        if miles == 1:
            partes.append("MIL")
        else:
            partes.append(f"{convertir_bloque(miles)} MIL")
    if resto > 0 or entero == 0:
        partes.append(convertir_bloque(resto))

    texto_entero = " ".join([p for p in partes if p]).strip()
    sufijo = "PESO" if entero == 1 else "PESOS"
    return f"{texto_entero} {sufijo} {centavos_str}/100 M.N."


def formatear_moneda_mxn(monto: float) -> str:
    """Formatea importe en pesos mexicanos $ X,XXX.XX MXN."""
    return f"$ {monto:,.2f} MXN"


def formatear_fecha_larga(fecha_str: str) -> str:
    """Convierte fecha YYYY-MM-DD a formato extendido en español."""
    if not fecha_str:
        return ""
    meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
    try:
        partes = fecha_str.split("-")
        if len(partes) == 3:
            anio = partes[0]
            mes_idx = int(partes[1]) - 1
            dia = int(partes[2])
            nombre_mes = meses[mes_idx] if 0 <= mes_idx < 12 else partes[1]
            return f"{dia} de {nombre_mes} de {anio}"
    except Exception:
        pass
    return fecha_str


def sustituir_variables_clausula(texto_base: str, variables_map: Dict[str, str]) -> str:
    """Sustituye marcadores {{clave}} en el texto base de una cláusula."""
    texto = texto_base
    for k, v in variables_map.items():
        placeholder = f"{{{{{k}}}}}"
        texto = texto.replace(placeholder, str(v))
    return texto


def obtener_mapa_usuarios() -> Dict[str, str]:
    """Carga mapa de usuarios {id: nombre} para asociar nombres a IDs."""
    try:
        rows = query_all("SELECT id, nombre FROM usuarios;")
        return {r["id"]: r["nombre"] for r in rows}
    except Exception as e:
        logger.warning("No se pudo cargar mapa de usuarios desde DB: %s", e)
        return {
            "usr-gen-01": "Valeria Ramos Peña",
            "usr-edit-02": "Eduardo Lozano Mora",
            "usr-aprob-03": "Javier Morales Hinojosa"
        }


def String_folio(numero: int) -> str:
    return str(numero).zfill(3)


def datetime_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización de la aplicación: asegura cláusulas estándar y datos de demostración."""
    try:
        with get_db_connection() as conn:
            insertadas = inicializar_clausulas_estandar(conn)
            logger.info("Inicialización de cláusulas completada. Nuevas insertadas: %d", insertadas)
    except Exception as e:
        logger.error("Error al inicializar cláusulas en DB: %s", e, exc_info=True)
    yield


app = FastAPI(
    title="Motor de Contratos NovaLex",
    version="1.0.0",
    description="API REST para generación legal asistida con Ollama (Llama 3.1 8B), persistencia en PostgreSQL y exportación PDF con WeasyPrint.",
    lifespan=lifespan
)

# Configuración de CORS segura con orígenes explícitos
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    except Exception as e:
        logger.error("Fallo al verificar salud de DB: %s", e)
        db_ok = False

    ollama_ok = False
    modelos_disponibles = []
    try:
        res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        if res.status_code == 200:
            ollama_ok = True
            modelos_disponibles = [m.get("name") for m in res.json().get("models", [])]
    except Exception as e:
        logger.warning("Fallo al conectar con Ollama en healthcheck: %s", e)
        ollama_ok = False

    status_code = status.HTTP_200_OK if (db_ok and ollama_ok) else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        content=json.dumps({
            "status": "healthy" if (db_ok and ollama_ok) else "degraded",
            "database_conectada": db_ok,
            "ollama_conectado": ollama_ok,
            "servicios": {
                "fastapi": "OK",
                "postgresql": "OK" if db_ok else "ERROR_CONEXION",
                "ollama": "OK" if ollama_ok else "ERROR_CONEXION"
            },
            "detalles_ia": {
                "host": OLLAMA_HOST,
                "modelo_configurado": MODEL_NAME,
                "modelo_disponible": MODEL_NAME in modelos_disponibles,
                "modelos_en_ollama": modelos_disponibles
            },
            "timestamp": datetime_iso_now()
        }),
        status_code=status_code,
        media_type="application/json"
    )


# ==============================================================================
# Endpoints de Autenticación y Sesión
# ==============================================================================

@app.post("/api/v1/auth/login", response_model=RespuestaLogin)
def iniciar_sesion(payload: SolicitudLogin):
    """
    Autentica al usuario contra PostgreSQL con bcrypt.
    Emite token JWT Bearer si las credenciales son válidas y la cuenta está activa.
    """
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifica tu usuario/correo y contraseña.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if isinstance(user, dict) and user.get("error") == "ACCOUNT_DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta de usuario ha sido deshabilitada. Contacta al administrador."
        )

    token_data = {
        "sub": user["id"],
        "username": user["username"],
        "rol": user["rol"],
        "nombre": user["nombre"],
        "email": user["email"]
    }
    access_token = create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRATION_HOURS * 3600,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "nombre": user["nombre"],
            "email": user["email"],
            "rol": user["rol"],
            "cargo": user.get("cargo", "")
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
    """Cierre de sesión: valida que la sesión era legítima y confirma la terminación."""
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
        logger.error("Error consultando clientes en DB: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al consultar clientes.")


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
        logger.error("Error guardando cliente en PostgreSQL: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al registrar cliente.")


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
        logger.error("Error consultando cláusulas en DB: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al consultar cláusulas.")


@app.post("/api/v1/clausulas", status_code=201)
def registrar_clausula(
    payload: ClausulaCrear,
    current_user: Dict[str, Any] = Depends(require_roles(["EDITOR", "APROBADOR"]))
):
    """Registra una nueva cláusula personalizada en PostgreSQL."""
    clausula_id = payload.id or f"clausula-custom-{int(time.time() * 1000)}"

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
        logger.error("Error guardando cláusula en PostgreSQL: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al registrar cláusula.")


@app.post("/api/v1/clausulas/inicializar-estandar")
def recargar_clausulas_estandar(
    current_user: Dict[str, Any] = Depends(require_roles(["EDITOR", "APROBADOR"]))
):
    """Ejecuta de forma explícita la inserción idempotente de las 10 cláusulas estándar de demo."""
    try:
        with get_db_connection() as conn:
            insertadas = inicializar_clausulas_estandar(conn)
        total_actual = query_one("SELECT COUNT(*) as c FROM clausulas;")["c"]
        return {
            "mensaje": "Inicialización idempotente ejecutada correctamente.",
            "clausulas_insertadas": insertadas,
            "total_actual": total_actual
        }
    except Exception as e:
        logger.error("Error al inicializar cláusulas: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al inicializar cláusulas.")


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
        logger.error("Error al listar contratos de DB: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al consultar contratos.")


@app.get("/api/v1/contratos/{contrato_id}")
def obtener_contrato(contrato_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Consulta el detalle de un contrato específico en PostgreSQL."""
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
    current_user: Dict[str, Any] = Depends(require_roles(["GENERADOR"]))
):
    """
    Generación de contratos con Ollama (Llama 3.1 8B) y persistencia en PostgreSQL:
    1. Valida los datos recibidos (objeto, monto > 0, vigencia, forma de pago).
    2. Verifica que el cliente exista en PostgreSQL.
    3. Consulta y valida que TODAS las cláusulas seleccionadas existan en la base de datos.
    4. Recupera el texto_base de cada cláusula y sustituye formalmente las variables.
    5. Envía a Ollama el contexto completo estructurado (proemio, declaraciones, cláusulas sustituidas, firmas).
    6. Valida la respuesta de Ollama: errores HTTP, respuesta vacía, rechazo del modelo y truncamiento por tokens.
    7. Guarda el contrato completo en PostgreSQL en estado BORRADOR con timestamps y trazabilidad.
    8. En caso de error, no persiste contratos parciales ni devuelve falsos éxitos.
    """
    # 1. Validación de variables del contrato
    v = payload.variables
    if not v.objeto.strip():
        raise HTTPException(status_code=400, detail="El objeto del contrato es obligatorio.")
    if v.monto <= 0:
        raise HTTPException(status_code=400, detail="El monto del contrato debe ser mayor a 0.")
    if not v.vigencia_inicio.strip() or not v.vigencia_fin.strip():
        raise HTTPException(status_code=400, detail="Las fechas de vigencia son obligatorias.")
    if not v.forma_pago.strip():
        raise HTTPException(status_code=400, detail="El esquema o forma de pago es obligatorio.")
    if not (v.penalizacion or "").strip():
        raise HTTPException(status_code=400, detail="La estipulación de penalización es obligatoria.")

    # 2. Verificación de existencia del cliente en PostgreSQL
    cliente = query_one(
        """
        SELECT id, razon_social, rfc, domicilio_fiscal, representante_legal, cargo, escritura, email, telefono
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

    # 3. Consulta y validación de existencia de cláusulas seleccionadas
    clausulas_ids = payload.clausulas_ids or []
    if not clausulas_ids:
        raise HTTPException(
            status_code=400,
            detail="Debe seleccionar al menos una cláusula para generar el contrato."
        )

    clausulas_rows = query_all(
        """
        SELECT id, nombre, texto_base, orden, categoria, requerida
        FROM clausulas
        WHERE id = ANY(%s)
        ORDER BY orden ASC;
        """,
        (clausulas_ids,)
    )

    ids_encontrados = {c["id"] for c in clausulas_rows}
    ids_faltantes = set(clausulas_ids) - ids_encontrados
    if ids_faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Las siguientes cláusulas seleccionadas no existen en la base de datos: {sorted(list(ids_faltantes))}"
        )

    # Ordenar las cláusulas respetando su orden relacional
    clausulas_ordenadas = sorted(clausulas_rows, key=lambda c: c["orden"])

    # 4. Formatear variables auxiliares y sustituir en cláusulas
    monto_fmt = formatear_moneda_mxn(v.monto)
    monto_let = numero_a_letras_pesos(v.monto)
    fecha_larga = formatear_fecha_larga(v.fecha)
    vig_ini_larga = formatear_fecha_larga(v.vigencia_inicio)
    vig_fin_larga = formatear_fecha_larga(v.vigencia_fin)
    lugar_firma = (v.lugar_firma or "Ciudad de México").strip()

    dict_reemplazos = {
        "cliente_razon_social": cliente["razon_social"],
        "cliente_rfc": cliente["rfc"],
        "cliente_domicilio": cliente["domicilio_fiscal"],
        "cliente_representante": cliente["representante_legal"],
        "cliente_cargo": cliente["cargo"],
        "cliente_escritura": cliente["escritura"],
        "cliente_email": cliente["email"],
        "objeto": v.objeto.strip(),
        "monto": str(v.monto),
        "monto_formateado": monto_fmt,
        "monto_letra": monto_let,
        "forma_pago": v.forma_pago.strip(),
        "vigencia_inicio": vig_ini_larga,
        "vigencia_fin": vig_fin_larga,
        "penalizacion": (v.penalizacion or "10%").strip(),
        "fecha": fecha_larga,
        "lugar_firma": lugar_firma,
        "empresa_razon_social": EMPRESA_NOVALEX["razonSocial"],
        "empresa_rfc": EMPRESA_NOVALEX["rfc"],
        "empresa_domicilio": EMPRESA_NOVALEX["domicilioFiscal"],
        "empresa_representante": EMPRESA_NOVALEX["representanteLegal"],
        "empresa_cargo": EMPRESA_NOVALEX["cargoRepresentante"]
    }

    clausulas_con_texto = []
    for c in clausulas_ordenadas:
        texto_sustituido = sustituir_variables_clausula(c["texto_base"], dict_reemplazos)
        clausulas_con_texto.append(f"CLÁUSULA ({c['nombre'].upper()}):\n{texto_sustituido}")

    texto_clausulas_completo = "\n\n".join(clausulas_con_texto)

    # 5. Construcción del Prompt Estructurado para Llama 3.1 8B
    prompt_ia = f"""Escribe una plantilla ilustrativa de acuerdo de prestación de servicios para la empresa {EMPRESA_NOVALEX['razonSocial']} y el cliente {cliente['razon_social']} con fines de demostración académica y desarrollo de software:

DATOS DEL PRESTADOR:
- Razón Social: {EMPRESA_NOVALEX['razonSocial']} ({EMPRESA_NOVALEX['nombreComercial']})
- RFC: {EMPRESA_NOVALEX['rfc']}
- Domicilio: {EMPRESA_NOVALEX['domicilioFiscal']}
- Representante Legal: {EMPRESA_NOVALEX['representanteLegal']} ({EMPRESA_NOVALEX['cargoRepresentante']})
- Instrumento Notarial: {EMPRESA_NOVALEX['escrituraPublica']}

DATOS DEL CLIENTE:
- Razón Social: {cliente['razon_social']}
- RFC: {cliente['rfc']}
- Domicilio Fiscal: {cliente['domicilio_fiscal']}
- Representante Legal: {cliente['representante_legal']} ({cliente['cargo']})
- Instrumento Notarial: {cliente['escritura']}

CONDICIONES CONTRACTUALES PACTADAS:
- Objeto del Servicio: {v.objeto}
- Contraprestación Pactada: {monto_fmt} ({monto_let}) más 16% de IVA
- Esquema de Pago: {v.forma_pago}
- Periodo de Vigencia: Del {vig_ini_larga} al {vig_fin_larga}
- Sanción por Demora / Penalización: {v.penalizacion}
- Lugar y Fecha de Suscripción: {lugar_firma}, a {fecha_larga}

TEXTO DE LAS CLÁUSULAS CONCRETAS A INCLUIR:
{texto_clausulas_completo}

Estructura obligatoria requerida:
1. PROEMIO (identificando a ambas partes y sus apoderados).
2. DECLARACIONES (I. De "EL PRESTADOR", II. De "EL CLIENTE", III. De "AMBAS PARTES").
3. CLÁUSULAS NUMERADAS (incorporando las cláusulas indicadas de forma precisa).
4. BLOQUE DE FIRMAS (Por "EL PRESTADOR", Por "EL CLIENTE" y Testigos).

Redacta de manera formal, precisa y sintética cada sección, concluyendo debidamente con el bloque de firmas."""

    # 6. Generación del texto con Ollama local (/api/chat con system role)
    texto_generado = ""
    try:
        res = requests.post(
            f"{OLLAMA_HOST}/api/chat",
            json={
                "model": MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Eres un generador de plantillas de texto de ejemplo para pruebas de software. "
                            "Tu tarea es redactar el formato de acuerdo de demostración empresarial con estructura "
                            "formal completa (proemio, declaraciones, cláusulas numeradas y firmas) concluyendo puntualmente en el bloque de firmas."
                        )
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
                    "num_ctx": 4096,
                    "num_predict": 2048
                }
            },
            timeout=360
        )

        if res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama reportó error HTTP {res.status_code} al generar el contrato."
            )

        data = res.json()
        texto_generado = data.get("message", {}).get("content", "").strip()

        if not texto_generado:
            raise HTTPException(
                status_code=502,
                detail="Ollama devolvió una respuesta vacía al generar el contrato."
            )

        # Validación 1: Detección de truncamiento por límite de tokens
        done_reason = data.get("done_reason")
        if done_reason == "length":
            logger.warning("Generación con Ollama truncada por exceder num_predict.")
            raise HTTPException(
                status_code=502,
                detail="La generación del contrato fue interrumpida por alcanzar el límite de tokens (truncamiento detectado). No se guardó el contrato incompleto."
            )

        # Validación 2: Detección de negativa (refusal) del modelo
        lower_text = texto_generado.lower()
        frases_negativa = [
            "lo siento, pero no puedo",
            "no puedo cumplir con esta",
            "como modelo de lenguaje",
            "no estoy autorizado para redactar contratos"
        ]
        if any(fn in lower_text for fn in frases_negativa) and len(texto_generado) < 300:
            logger.warning("Ollama devolvió un mensaje de negativa en lugar de la plantilla: %s", texto_generado)
            raise HTTPException(
                status_code=502,
                detail="El motor de IA rechazó la solicitud de generación de plantilla. No se guardó el resultado."
            )

        # Validación 3: Estructura mínima esperada
        if ("cláusula" not in lower_text and "clausula" not in lower_text) or len(texto_generado) < 200:
            logger.warning("Texto generado no contiene estructura mínima de contrato.")
            raise HTTPException(
                status_code=502,
                detail="El texto generado no cumple con la estructura formal mínima requerida. No se guardó el contrato."
            )

        # Marca de agua institucional de demostración
        aviso_demo = (
            "[CONTENIDO DE DEMOSTRACIÓN - PENDIENTE DE REVISIÓN JURÍDICA FORMAL]\n"
            "[NovaLex Tecnología Contractual S.A. de C.V. - Prototipo de Software]\n\n"
        )
        if not texto_generado.startswith("[CONTENIDO DE DEMOSTRACIÓN"):
            texto_generado = aviso_demo + texto_generado

    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail=f"Tiempo de espera agotado al comunicar con Ollama ({OLLAMA_HOST}). El modelo {MODEL_NAME} no respondió en 360 segundos."
        )
    except requests.exceptions.RequestException as e:
        logger.error("No se pudo conectar al servicio local de Ollama: %s", e)
        raise HTTPException(
            status_code=503,
            detail="No se pudo conectar al servicio local de Ollama. Verifica que el contenedor plurione-ollama esté en ejecución."
        )

    # 7. Persistencia del Contrato Generado en PostgreSQL
    nuevo_id = f"cnt-{int(time.time() * 1000)}"
    conteo_contratos = query_one("SELECT COUNT(*) as c FROM contratos;")["c"] + 1
    folio = f"NOVA-PSP-2026-{String_folio(conteo_contratos)}"

    variables_dict = {
        "fecha": v.fecha,
        "lugar_firma": lugar_firma,
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
                "detalles": f"Contrato generado con {len(clausulas_ids)} cláusulas seleccionadas e importe de {monto_fmt}."
            }
        ]
    }

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
        logger.error("Error persistiendo el contrato en PostgreSQL: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al persistir el contrato en la base de datos."
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
            detail="El contrato ya ha sido APROBADO definitivamente y está bloqueado contra modificaciones."
        )

    if estado_actual == "EN_REVISION" and rol != "EDITOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El contrato se encuentra 'EN_REVISION'. Solo el rol 'Editor' puede realizar correcciones legales."
        )

    if estado_actual == "BORRADOR" and rol not in ["GENERADOR", "EDITOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El rol '{rol}' no tiene permisos para editar borradores de contratos."
        )

    variables = contrato["variables"] or {}
    historial = variables.get("historial") or []

    historial.append({
        "id": f"hist-{int(time.time() * 1000)}",
        "timestamp": datetime_iso_now(),
        "usuario": current_user["nombre"],
        "rol": rol,
        "accion": "Edición y ajuste del texto legal",
        "detalles": f"Actualización de contenido por {rol}."
    })
    variables["historial"] = historial

    execute_command(
        """
        UPDATE contratos
        SET texto_generado = %s,
            variables = %s,
            editado_por = %s,
            actualizado_en = NOW()
        WHERE id = %s;
        """,
        (
            payload.textoGenerado,
            json.dumps(variables),
            current_user["id"],
            contrato_id
        )
    )

    return obtener_contrato(contrato_id, current_user=current_user)


@app.patch("/api/v1/contratos/{contrato_id}/estado")
@app.put("/api/v1/contratos/{contrato_id}/estado")
def actualizar_estado_contrato(
    contrato_id: str,
    payload: ActualizarEstadoContrato,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Control de Máquina de Estados RBAC (PRD Sección 7.2):
    - BORRADOR -> EN_REVISION (Generador o Editor)
    - EN_REVISION -> APROBADO (Únicamente Aprobador)
    - EN_REVISION -> RECHAZADO (Únicamente Aprobador, requiere motivo)
    - RECHAZADO -> EN_REVISION (Editor para corregir)
    """
    contrato = query_one("SELECT * FROM contratos WHERE id = %s;", (contrato_id,))
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado.")

    estado_actual = contrato["estado"]
    nuevo_estado = payload.nuevoEstado
    rol_solicitante = current_user["rol"]
    usuario_nombre = current_user["nombre"]
    usuario_id = current_user["id"]

    # Matriz de Transiciones de Estado
    if nuevo_estado == "EN_REVISION":
        if estado_actual not in ["BORRADOR", "RECHAZADO"]:
            raise HTTPException(
                status_code=400,
                detail=f"Transición inválida: No se puede enviar a revisión un contrato en estado '{estado_actual}'."
            )
        if estado_actual == "BORRADOR" and rol_solicitante not in ["GENERADOR", "EDITOR"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El rol '{rol_solicitante}' no puede enviar borradores a revisión."
            )
        if estado_actual == "RECHAZADO" and rol_solicitante != "EDITOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Solo el rol 'Editor' puede reenviar a revisión un contrato rechazado tras subsanar observaciones."
            )

    elif nuevo_estado == "APROBADO":
        if rol_solicitante != "APROBADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado: Únicamente el rol 'Aprobador' puede aprobar contratos definitivamente."
            )
        if estado_actual != "EN_REVISION":
            raise HTTPException(
                status_code=400,
                detail=f"Transición inválida: Solo se pueden aprobar contratos en estado 'EN_REVISION' (actual: {estado_actual})."
            )

    elif nuevo_estado == "RECHAZADO" or (nuevo_estado == "BORRADOR" and payload.motivoRechazo):
        if rol_solicitante != "APROBADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado: Únicamente el rol 'Aprobador' puede rechazar contratos."
            )
        if estado_actual != "EN_REVISION":
            raise HTTPException(
                status_code=400,
                detail=f"Transición inválida: Solo se pueden rechazar contratos en estado 'EN_REVISION'."
            )
        if not payload.motivoRechazo or not payload.motivoRechazo.strip():
            raise HTTPException(
                status_code=400,
                detail="Para rechazar un contrato es obligatorio especificar el 'motivoRechazo' para el Editor."
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
    historial.append(nuevo_evento_historial)

    variables["historial"] = historial
    if payload.motivoRechazo:
        variables["motivoRechazo"] = payload.motivoRechazo
    elif nuevo_estado in ["EN_REVISION", "APROBADO"]:
        variables.pop("motivoRechazo", None)

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
        logger.error("Error al generar PDF con WeasyPrint: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al compilar el documento PDF."
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
