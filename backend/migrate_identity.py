"""
Migración controlada de Identidad y Datos Demo en PostgreSQL
Actualiza registros existentes a la nueva identidad ficticia 'NovaLex Tecnología Contractual S.A. de C.V.'
sin destruir tablas, volúmenes ni romper claves foráneas de contratos existentes.
"""

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DB_URL = os.getenv("DATABASE_URL", "postgresql://plurione@postgres:5432/contratos_db")

def ejecutar_migracion():
    print("Iniciando migración controlada de datos en PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Actualizar Usuarios Ficticios (conservando IDs usr-gen-01, usr-edit-02, usr-aprob-03)
            print("1. Actualizando usuarios en tabla 'usuarios'...")
            cur.execute("""
                UPDATE usuarios SET
                    nombre = 'Valeria Ramos Peña',
                    email = 'valeria.ramos@example.com',
                    cargo = 'Ingeniera de Soluciones Contractuales'
                WHERE id = 'usr-gen-01';
            """)
            cur.execute("""
                UPDATE usuarios SET
                    nombre = 'Eduardo Lozano Mora',
                    email = 'eduardo.lozano@example.com',
                    cargo = 'Revisor Jurídico de Contratos'
                WHERE id = 'usr-edit-02';
            """)
            cur.execute("""
                UPDATE usuarios SET
                    nombre = 'Javier Morales Hinojosa',
                    email = 'javier.morales@example.com',
                    cargo = 'Director de Operaciones Legales'
                WHERE id = 'usr-aprob-03';
            """)

            # 2. Actualizar Clientes Demo Ficticios (conservando IDs cli-001, cli-002 e insertando cli-003)
            print("2. Actualizando clientes en tabla 'clientes'...")
            cur.execute("""
                UPDATE clientes SET
                    razon_social = 'Logística Integral Quantum S.A. de C.V.',
                    rfc = 'LIQ180425AB1',
                    domicilio_fiscal = 'Av. Insurgentes Sur 1200 Piso 5, Col. Del Valle, Benito Juárez, Ciudad de México, C.P. 03100 (Demostración)',
                    representante_legal = 'Ing. Fernando Barrientos Ochoa',
                    cargo = 'Director General y Apoderado Legal',
                    escritura = 'Escritura Pública No. 24,190, Notaría Pública No. 34 de la Ciudad de México (Ficticia)',
                    email = 'contacto@logistica-quantum.example.com',
                    telefono = '55 5555 0120',
                    es_demo = TRUE
                WHERE id = 'cli-001';
            """)

            cur.execute("""
                UPDATE clientes SET
                    razon_social = 'Distribuidora Nexus Farma S.A.P.I. de C.V.',
                    rfc = 'DNF140912CD2',
                    domicilio_fiscal = 'Calzada de Tlalpan 2148, Col. Campestre Churubusco, Coyoacán, Ciudad de México, C.P. 04200 (Demostración)',
                    representante_legal = 'Lic. Mariana Soto Castro',
                    cargo = 'Representante Legal y Directora de Operaciones',
                    escritura = 'Póliza Mercantil No. 8,921 ante Correduría Pública No. 51 de la Ciudad de México (Ficticia)',
                    email = 'contacto@nexusfarma.example.com',
                    telefono = '55 5555 0140',
                    es_demo = TRUE
                WHERE id = 'cli-002';
            """)

            cur.execute("""
                INSERT INTO clientes (
                    id, razon_social, rfc, domicilio_fiscal, representante_legal,
                    cargo, escritura, email, telefono, es_demo
                ) VALUES (
                    'cli-003',
                    'Roberto Garza Salinas',
                    'GASR820514U82',
                    'Av. Paseo de la Reforma 450 Piso 8, Cuauhtémoc, Ciudad de México, C.P. 06600 (Demostración)',
                    'Roberto Garza Salinas',
                    'Persona Física con Actividad Empresarial (Demostración)',
                    'Constancia de Situación Fiscal y Poder Notarial No. 12,300 de la CDMX (Ficticia)',
                    'roberto.garza@rgs-tech.example.com',
                    '55 5555 0180',
                    TRUE
                ) ON CONFLICT (id) DO UPDATE SET
                    razon_social = EXCLUDED.razon_social,
                    rfc = EXCLUDED.rfc,
                    domicilio_fiscal = EXCLUDED.domicilio_fiscal,
                    representante_legal = EXCLUDED.representante_legal,
                    cargo = EXCLUDED.cargo,
                    escritura = EXCLUDED.escritura,
                    email = EXCLUDED.email,
                    telefono = EXCLUDED.telefono;
            """)

            # 3. Actualizar Cláusulas Estándar (reemplazar PluriOne por NovaLex en texto_base)
            print("3. Actualizando cláusula 1 en tabla 'clausulas'...")
            cur.execute("""
                UPDATE clausulas
                SET texto_base = REPLACE(texto_base, 'PluriOne S.A. de C.V.', 'NovaLex Tecnología Contractual S.A. de C.V.')
                WHERE texto_base LIKE '%PluriOne%';
            """)

            # 4. Actualizar Contratos Existentes de Forma Controlada
            print("4. Actualizando contratos existentes preservando integridad y trazabilidad...")
            cur.execute("SELECT id, variables, texto_generado FROM contratos;")
            contratos_existentes = cur.fetchall()

            for cnt in contratos_existentes:
                cid = cnt["id"]
                vars_dict = cnt["variables"] or {}
                
                # Actualizar folio de PLURI a NOVA en variables
                folio = vars_dict.get("folio", "")
                if folio.startswith("PLURI-"):
                    vars_dict["folio"] = folio.replace("PLURI-", "NOVA-")

                # Actualizar historial
                historial = vars_dict.get("historial") or []
                for h in historial:
                    if h.get("usuario") == "Ulises Contreras Valdez":
                        h["usuario"] = "Valeria Ramos Peña"
                    if h.get("usuario") == "Edgar Loheffelmman":
                        h["usuario"] = "Eduardo Lozano Mora"
                    if h.get("usuario") == "Juan Méndez Herrera":
                        h["usuario"] = "Javier Morales Hinojosa"
                    if "PluriOne" in h.get("detalles", ""):
                        h["detalles"] = h["detalles"].replace("PluriOne S.A. de C.V.", "NovaLex Tecnología Contractual S.A. de C.V.")

                vars_dict["historial"] = historial
                vars_dict["esDemo"] = True

                # Actualizar texto generado
                txt = cnt["texto_generado"] or ""
                txt = txt.replace("PluriOne S.A. de C.V.", "NovaLex Tecnología Contractual S.A. de C.V.")
                txt = txt.replace("PLURIONE S.A. DE C.V.", "NOVALEX TECNOLOGÍA CONTRACTUAL S.A. DE C.V.")
                txt = txt.replace("PLU060407HC9", "NTC260101AB1")
                txt = txt.replace("Puebla 46, Colonia Roma Norte, Alcaldía Cuauhtémoc, C.P. 06700, Ciudad de México", "Av. Insurgentes Sur 1602 Piso 4, Col. Crédito Constructor, Benito Juárez, C.P. 03940, Ciudad de México")
                txt = txt.replace("Xochicuahuitl Gleason Juárez", "Lic. Claudia Sandoval Ortega")
                txt = txt.replace("XOCHICUAHUITL GLEASON JUÁREZ", "LIC. CLAUDIA SANDOVAL ORTEGA")
                txt = txt.replace("Soluciones Logísticas Bajío S.A. de C.V.", "Logística Integral Quantum S.A. de C.V.")
                txt = txt.replace("SOLUCIONES LOGÍSTICAS BAJÍO S.A. DE C.V.", "LOGÍSTICA INTEGRAL QUANTUM S.A. DE C.V.")
                txt = txt.replace("SLB180425KP7", "LIQ180425AB1")
                txt = txt.replace("Ulises Contreras Valdez", "Valeria Ramos Peña")
                txt = txt.replace("ULISES CONTRERAS VALDEZ", "VALERIA RAMOS PEÑA")

                cur.execute("""
                    UPDATE contratos
                    SET variables = %s,
                        texto_generado = %s
                    WHERE id = %s;
                """, (json.dumps(vars_dict), txt, cid))

        conn.commit()
        print("Migración completada con éxito.")
    except Exception as e:
        conn.rollback()
        print(f"Error en migración: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    ejecutar_migracion()
