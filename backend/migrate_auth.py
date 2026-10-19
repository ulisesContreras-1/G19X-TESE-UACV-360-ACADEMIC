"""
Script de Migración Controlada: Autenticación Real NovaLex
1. Agrega columnas 'username' y 'activo' a la tabla usuarios.
2. Genera hashes seguros con bcrypt para las cuentas demo (contraseña: inicio2026).
3. Configura los 3 roles:
   - Generador: uacontreras (usr-gen-01)
   - Editor: elozano (usr-edit-02)
   - Aprobador: jmorales (usr-aprob-03)
   - Cuenta de prueba inactiva para validar control de estado.
4. Preserva íntegramente las relaciones con la tabla contratos y clientes.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://plurione@postgres:5432/contratos_db")

DEMO_PASSWORD = "inicio2026"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def migrar():
    print("=" * 60)
    print("MIGRACIÓN: AUTENTICACIÓN REAL Y CONTROL DE ROLES NOVALEX")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Agregar columnas si no existen
        print("\n1. Verificando y actualizando columnas en 'usuarios'...")
        cur.execute("""
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
        """)
        cur.execute("""
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
        """)

        # 2. Generar hash bcrypt real para la contraseña demo
        print(f"2. Generando hash bcrypt real para contraseña demo '{DEMO_PASSWORD}'...")
        hash_demo = hash_password(DEMO_PASSWORD)
        print(f"   Hash generado: {hash_demo[:25]}...")

        # 3. Actualizar usuarios existentes preservando IDs y relaciones
        print("\n3. Actualizando cuentas de usuario principales con hashes válidos...")
        
        # Generador: uacontreras
        cur.execute("""
            UPDATE usuarios
            SET username = 'uacontreras',
                password_hash = %s,
                activo = TRUE
            WHERE id = 'usr-gen-01';
        """, (hash_demo,))

        # Editor: elozano
        cur.execute("""
            UPDATE usuarios
            SET username = 'elozano',
                password_hash = %s,
                activo = TRUE
            WHERE id = 'usr-edit-02';
        """, (hash_demo,))

        # Aprobador: jmorales
        cur.execute("""
            UPDATE usuarios
            SET username = 'jmorales',
                password_hash = %s,
                activo = TRUE
            WHERE id = 'usr-aprob-03';
        """, (hash_demo,))

        # 4. Crear cuenta inactiva para probar validación de cuenta deshabilitada
        cur.execute("""
            INSERT INTO usuarios (id, username, nombre, email, password_hash, rol, cargo, activo)
            VALUES ('usr-inactivo-04', 'cuenta_inactiva', 'Usuario Inactivo Demo', 'inactivo@example.com', %s, 'GENERADOR', 'Cuenta Deshabilitada', FALSE)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash,
                activo = FALSE;
        """, (hash_demo,))

        conn.commit()
        print("\n-> ÉXITO: Migración completada y commit ejecutado.")

        # 5. Verificación final
        cur.execute("SELECT id, username, nombre, email, rol, activo, LEFT(password_hash, 25) as hash_preview FROM usuarios ORDER BY id;")
        rows = cur.fetchall()
        print("\nUsuarios en la base de datos:")
        for r in rows:
            print(f"   [{r['id']}] {r['username']} | {r['nombre']} | {r['rol']} | Activo: {r['activo']} | Hash: {r['hash_preview']}...")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error en la migración: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrar()
