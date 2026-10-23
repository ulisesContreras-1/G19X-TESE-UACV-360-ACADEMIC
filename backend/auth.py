"""
Módulo de Autenticación y Autorización NovaLex
- Hashing y verificación de contraseñas con bcrypt (rounds=12)
- Emisión y validación de tokens JWT (HS256) con expiración
- Dependencias de FastAPI para protección de rutas y control estricto de roles
"""

import os
from pathlib import Path
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from dotenv import load_dotenv
    # Cargar variables desde .env en /app o directorio actual si existe
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

from db import query_one

# Configuración de variables de entorno para JWT
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET.strip()) < 16:
    raise RuntimeError(
        "ERROR CRÍTICO DE SEGURIDAD: La variable de entorno 'JWT_SECRET' no está configurada, "
        "está vacía o tiene menos de 16 caracteres. Debe definirse una clave criptográfica segura en .env o entorno."
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "8"))

# Esquema Bearer para FastAPI
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Genera hash seguro con bcrypt usando un salt de 12 rondas."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña en texto plano contra su hash bcrypt."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT firmado criptográficamente con tiempo de expiración."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "novalex-contract-engine"
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decodifica y valida la firma y expiración de un token JWT."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub", "rol"]}
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def authenticate_user(username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Busca al usuario en PostgreSQL por username o email, verifica el hash bcrypt
    y comprueba que la cuenta esté activa.
    """
    cleaned_identifier = username_or_email.strip().lower()
    user = query_one(
        """
        SELECT id, username, nombre, email, password_hash, rol, cargo, activo
        FROM usuarios
        WHERE LOWER(username) = %s OR LOWER(email) = %s;
        """,
        (cleaned_identifier, cleaned_identifier)
    )
    if not user:
        return None

    if not user.get("activo", True):
        # Cuenta deshabilitada
        return {"error": "ACCOUNT_DISABLED"}

    if not verify_password(password, user["password_hash"]):
        return None

    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Dependencia de FastAPI: extrae y valida el token Bearer JWT.
    Retorna los datos del usuario autenticado si es válido.
    Lanza HTTP 401 si no hay token, si está expirado o si el usuario no existe.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Se requiere un token de sesión válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Por favor inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = query_one(
        """
        SELECT id, username, nombre, email, rol, cargo, activo
        FROM usuarios
        WHERE id = %s;
        """,
        (user_id,)
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado en la base de datos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("activo", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario ha sido deshabilitada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(allowed_roles: List[str]):
    """
    Decorador / Dependencia de FastAPI: valida que el rol del usuario autenticado
    esté dentro de la lista de roles permitidos.
    Lanza HTTP 403 Forbidden si el rol no tiene permisos.
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("rol")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: el rol '{user_role}' no tiene permisos para realizar esta operación."
            )
        return current_user
    return role_checker
