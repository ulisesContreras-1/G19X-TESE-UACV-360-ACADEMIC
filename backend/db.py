"""
Módulo de Gestión de Conexiones a PostgreSQL
Consultas 100% parametrizadas para evitar inyección SQL.
Manejo de transacciones y cierre seguro de conexiones.
"""

import os
from pathlib import Path
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Any, List, Optional, Dict

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True)
except ImportError:
    pass


def obtener_database_url() -> str:
    """
    Obtiene o construye dinámicamente la cadena de conexión a PostgreSQL desde variables de entorno.
    Valida estrictamente que contenga credenciales de autenticación completas (usuario y contraseña),
    evitando que la aplicación intente conexiones silenciosas sin contraseña bajo autenticación SCRAM-SHA-256.
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.strip():
        url_limpia = db_url.strip()
        parsed = urlparse(url_limpia)
        if parsed.scheme in ["postgresql", "postgres"]:
            if not parsed.password:
                raise RuntimeError(
                    "ERROR CRÍTICO DE CONFIGURACIÓN: 'DATABASE_URL' no contiene contraseña de autenticación. "
                    "El servidor PostgreSQL requiere autenticación segura SCRAM-SHA-256. "
                    "Formato requerido: postgresql://<usuario>:<contraseña>@<host>:<puerto>/<base_datos>"
                )
        return url_limpia

    # Construcción dinámica a partir de componentes individuales
    user = os.getenv("POSTGRES_USER", "plurione")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "contratos_db")

    if not password or not password.strip():
        raise RuntimeError(
            "ERROR CRÍTICO DE CONFIGURACIÓN: La variable 'POSTGRES_PASSWORD' no está definida o está vacía. "
            "No se permiten conexiones silenciosas sin contraseña cuando el servidor exige autenticación SCRAM-SHA-256. "
            "Define 'POSTGRES_PASSWORD' o 'DATABASE_URL' con credenciales completas en tu archivo .env."
        )

    return f"postgresql://{user}:{password.strip()}@{host}:{port}/{db}"


DATABASE_URL = obtener_database_url()


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Provee una conexión a la base de datos con manejo automático de commit y rollback."""
    conn = psycopg2.connect(obtener_database_url())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_all(sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """Ejecuta una consulta SELECT parametrizada y devuelve todos los registros como diccionarios."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def query_one(sql: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    """Ejecuta una consulta SELECT parametrizada y devuelve un único registro como diccionario."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            return dict(row) if row else None


def execute_command(sql: str, params: Optional[tuple] = None) -> int:
    """Ejecuta una instrucción INSERT, UPDATE o DELETE parametrizada y devuelve las filas afectadas."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount
