"""
Módulo de Gestión de Conexiones a PostgreSQL
Consultas 100% parametrizadas para evitar inyección SQL.
Manejo de transacciones y cierre seguro de conexiones.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Any, List, Optional, Dict

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://plurione@postgres:5432/contratos_db")


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Provee una conexión a la base de datos con manejo automático de commit y rollback."""
    conn = psycopg2.connect(DATABASE_URL)
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
