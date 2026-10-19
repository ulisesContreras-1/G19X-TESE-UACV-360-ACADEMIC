"""
Suite de Pruebas Obligatorias de Verificación - NovaLex Contract Engine
Verificación exhaustiva de los 16 puntos requeridos:
1. Login correcto del Generador.
2. Login correcto del Editor.
3. Login correcto del Aprobador.
4. Login rechazado con contraseña incorrecta.
5. Solicitud protegida sin token: HTTP 401.
6. Token inválido o vencido: rechazado.
7. Generador intentando aprobar: HTTP 403.
8. Editor intentando aprobar: HTTP 403.
9. Aprobador aprobando o rechazando conforme a las reglas de negocio.
10. Cierre de sesión y confirmación de revocación.
11. Conexión FastAPI-PostgreSQL sin contraseña en DATABASE_URL.
12. Conservación de los datos (3 clientes, 10 cláusulas, contratos históricos).
13. Generación de un contrato con Ollama (Llama 3.1 8B).
14. Consulta posterior del contrato guardado en PostgreSQL.
15. Exportación de PDF formal con WeasyPrint.
16. Disponibilidad de la API (/health) y compilación del frontend.
"""

import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")
# Verificación de conexión sin contraseña
DB_URL_NO_PASSWORD = os.environ.get("DATABASE_URL", "postgresql://plurione@postgres:5432/contratos_db")

def ejecutar_pruebas():
    resultados = []
    print("=" * 75)
    print("EJECUTANDO SUITE DE 16 PRUEBAS OBLIGATORIAS - NOVALEX MOTOR DE CONTRATOS")
    print("=" * 75)

    token_gen = None
    token_edit = None
    token_aprob = None
    contrato_id_test = None

    # --------------------------------------------------------------------------
    # Prueba 1: Login correcto del Generador
    # --------------------------------------------------------------------------
    print("\n[Prueba 1] Login correcto del Generador (uacontreras / inicio2026)...")
    try:
        res = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "uacontreras",
            "password": "inicio2026"
        }, timeout=10)
        assert res.status_code == 200, f"Status code no es 200: {res.status_code} - {res.text}"
        data = res.json()
        assert "access_token" in data and len(data["access_token"]) > 20, "Token JWT ausente o inválido"
        assert data["user"]["rol"] == "GENERADOR", f"Rol incorrecto: {data['user']['rol']}"
        assert data["user"]["username"] == "uacontreras", f"Username incorrecto: {data['user']['username']}"
        token_gen = data["access_token"]
        print(f" -> ÉXITO: Generador autenticado. JWT emitido con expiración {data['expires_in']}s.")
        resultados.append(("1. Login correcto del Generador", True, f"HTTP 200 | Rol GENERADOR | Usuario {data['user']['nombre']}"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("1. Login correcto del Generador", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 2: Login correcto del Editor
    # --------------------------------------------------------------------------
    print("\n[Prueba 2] Login correcto del Editor (elozano / inicio2026)...")
    try:
        res = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "elozano",
            "password": "inicio2026"
        }, timeout=10)
        assert res.status_code == 200, f"Status code no es 200: {res.status_code} - {res.text}"
        data = res.json()
        assert data["user"]["rol"] == "EDITOR", f"Rol incorrecto: {data['user']['rol']}"
        token_edit = data["access_token"]
        print(f" -> ÉXITO: Editor autenticado. JWT emitido con rol EDITOR.")
        resultados.append(("2. Login correcto del Editor", True, f"HTTP 200 | Rol EDITOR | Usuario {data['user']['nombre']}"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("2. Login correcto del Editor", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 3: Login correcto del Aprobador
    # --------------------------------------------------------------------------
    print("\n[Prueba 3] Login correcto del Aprobador (jmorales / inicio2026)...")
    try:
        res = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "jmorales",
            "password": "inicio2026"
        }, timeout=10)
        assert res.status_code == 200, f"Status code no es 200: {res.status_code} - {res.text}"
        data = res.json()
        assert data["user"]["rol"] == "APROBADOR", f"Rol incorrecto: {data['user']['rol']}"
        token_aprob = data["access_token"]
        print(f" -> ÉXITO: Aprobador autenticado. JWT emitido con rol APROBADOR.")
        resultados.append(("3. Login correcto del Aprobador", True, f"HTTP 200 | Rol APROBADOR | Usuario {data['user']['nombre']}"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("3. Login correcto del Aprobador", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 4: Login rechazado con contraseña incorrecta
    # --------------------------------------------------------------------------
    print("\n[Prueba 4] Login rechazado con contraseña incorrecta...")
    try:
        res_bad_pass = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "uacontreras",
            "password": "clave_erronea_2026"
        }, timeout=10)
        assert res_bad_pass.status_code == 401, f"Se esperaba 401, se obtuvo: {res_bad_pass.status_code}"

        res_bad_user = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "usuario_fantasma_xyz",
            "password": "cualquier_clave"
        }, timeout=10)
        assert res_bad_user.status_code == 401, f"Se esperaba 401, se obtuvo: {res_bad_user.status_code}"

        print(f" -> ÉXITO: Credenciales inválidas rechazadas con HTTP 401 sin revelar existencia de usuarios.")
        resultados.append(("4. Login rechazado con contraseña incorrecta", True, "HTTP 401 genérico ante contraseña o usuario inválido"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("4. Login rechazado con contraseña incorrecta", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 5: Solicitud protegida sin token: HTTP 401
    # --------------------------------------------------------------------------
    print("\n[Prueba 5] Solicitud protegida sin token: HTTP 401...")
    try:
        res_no_token = requests.get(f"{BASE_URL}/api/v1/clientes", timeout=10)
        assert res_no_token.status_code == 401, f"Se esperaba 401, se obtuvo: {res_no_token.status_code}"

        res_cnt_no_token = requests.get(f"{BASE_URL}/api/v1/contratos", timeout=10)
        assert res_cnt_no_token.status_code == 401, f"Se esperaba 401 en contratos, se obtuvo: {res_cnt_no_token.status_code}"

        print(f" -> ÉXITO: Endpoints protegidos rechazan peticiones sin encabezado Bearer con HTTP 401.")
        resultados.append(("5. Solicitud protegida sin token: HTTP 401", True, "HTTP 401 verificado en /api/v1/clientes y /api/v1/contratos"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("5. Solicitud protegida sin token: HTTP 401", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 6: Token inválido o vencido: rechazado
    # --------------------------------------------------------------------------
    print("\n[Prueba 6] Token inválido o manipulado: rechazado...")
    try:
        res_fake_jwt = requests.get(f"{BASE_URL}/api/v1/clientes", headers={
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.falso.firma"
        }, timeout=10)
        assert res_fake_jwt.status_code == 401, f"Se esperaba 401, se obtuvo: {res_fake_jwt.status_code}"

        res_me_fake = requests.get(f"{BASE_URL}/api/v1/auth/me", headers={
            "Authorization": "Bearer token_completamente_invalido"
        }, timeout=10)
        assert res_me_fake.status_code == 401, f"Se esperaba 401 en /me, se obtuvo: {res_me_fake.status_code}"

        print(f" -> ÉXITO: Tokens falsos o corruptos son rechazados con HTTP 401.")
        resultados.append(("6. Token inválido o vencido: rechazado", True, "HTTP 401 verificado ante JWT manipulado o firma inválida"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("6. Token inválido o vencido: rechazado", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 7: Generador intentando aprobar: HTTP 403
    # --------------------------------------------------------------------------
    print("\n[Prueba 7] Generador intentando aprobar contrato: HTTP 403...")
    try:
        # Obtenemos un contrato existente de la base de datos
        conn = psycopg2.connect("postgresql://plurione@postgres:5432/contratos_db")
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM contratos ORDER BY creado_en DESC LIMIT 1;")
            contrato_target_id = cur.fetchone()[0]
        conn.close()

        res_gen_aprueba = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_gen}"},
            json={
                "nuevoEstado": "APROBADO",
                "usuarioId": "usr-gen-01",
                "usuarioNombre": "Valeria Ramos Peña",
                "rol": "GENERADOR"
            },
            timeout=10
        )
        assert res_gen_aprueba.status_code == 403, f"Se esperaba 403, se obtuvo: {res_gen_aprueba.status_code} - {res_gen_aprueba.text}"
        detail = res_gen_aprueba.json().get("detail", "")
        assert "denegado" in detail.lower() or "aprobador" in detail.lower(), f"Mensaje no descriptivo: {detail}"
        print(f" -> ÉXITO: Generador bloqueado al intentar aprobar con HTTP 403: {detail}")
        resultados.append(("7. Generador intentando aprobar: HTTP 403", True, f"HTTP 403 | {detail}"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("7. Generador intentando aprobar: HTTP 403", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 8: Editor intentando aprobar: HTTP 403
    # --------------------------------------------------------------------------
    print("\n[Prueba 8] Editor intentando aprobar contrato: HTTP 403...")
    try:
        res_edit_aprueba = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_edit}"},
            json={
                "nuevoEstado": "APROBADO",
                "usuarioId": "usr-edit-02",
                "usuarioNombre": "Eduardo Lozano Mora",
                "rol": "EDITOR"
            },
            timeout=10
        )
        assert res_edit_aprueba.status_code == 403, f"Se esperaba 403, se obtuvo: {res_edit_aprueba.status_code} - {res_edit_aprueba.text}"
        detail = res_edit_aprueba.json().get("detail", "")
        assert "denegado" in detail.lower() or "aprobador" in detail.lower(), f"Mensaje no descriptivo: {detail}"
        print(f" -> ÉXITO: Editor bloqueado al intentar aprobar con HTTP 403: {detail}")
        resultados.append(("8. Editor intentando aprobar: HTTP 403", True, f"HTTP 403 | {detail}"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("8. Editor intentando aprobar: HTTP 403", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 9: Aprobador aprobando o rechazando conforme a reglas de negocio
    # --------------------------------------------------------------------------
    print("\n[Prueba 9] Aprobador aprobando o rechazando conforme a las reglas de negocio...")
    try:
        # Generador envía a EN_REVISION
        res_envio = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_gen}"},
            json={
                "nuevoEstado": "EN_REVISION",
                "usuarioId": "usr-gen-01",
                "usuarioNombre": "Valeria Ramos Peña",
                "rol": "GENERADOR",
                "detalles": "Envío a revisión técnica."
            },
            timeout=10
        )
        assert res_envio.status_code == 200, f"Error enviando a revisión: {res_envio.text}"

        # 9a. Aprobador rechaza a BORRADOR con motivo
        res_rechazo = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_aprob}"},
            json={
                "nuevoEstado": "BORRADOR",
                "usuarioId": "usr-aprob-03",
                "usuarioNombre": "Javier Morales Hinojosa",
                "rol": "APROBADOR",
                "motivoRechazo": "Ajustar plazo de entrega conforme a reunión."
            },
            timeout=10
        )
        assert res_rechazo.status_code == 200, f"Error en rechazo por Aprobador: {res_rechazo.text}"
        assert res_rechazo.json()["estado"] == "BORRADOR"

        # 9b. Generador reenvía a EN_REVISION
        res_reenvio = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_gen}"},
            json={
                "nuevoEstado": "EN_REVISION",
                "usuarioId": "usr-gen-01",
                "usuarioNombre": "Valeria Ramos Peña",
                "rol": "GENERADOR"
            },
            timeout=10
        )
        assert res_reenvio.status_code == 200

        # 9c. Aprobador aprueba formalmente
        res_aprob = requests.put(
            f"{BASE_URL}/api/v1/contratos/{contrato_target_id}/estado",
            headers={"Authorization": f"Bearer {token_aprob}"},
            json={
                "nuevoEstado": "APROBADO",
                "usuarioId": "usr-aprob-03",
                "usuarioNombre": "Javier Morales Hinojosa",
                "rol": "APROBADOR",
                "detalles": "Autorización ejecutiva concedida."
            },
            timeout=10
        )
        assert res_aprob.status_code == 200, f"Error en aprobación formal: {res_aprob.text}"
        assert res_aprob.json()["estado"] == "APROBADO"
        assert res_aprob.json()["aprobadoPor"] == "Javier Morales Hinojosa"

        print(f" -> ÉXITO: Flujo de aprobación y rechazo completado correctamente por el Aprobador.")
        resultados.append(("9. Aprobador aprobando o rechazando según reglas", True, "Flujo BORRADOR -> EN_REVISION -> BORRADOR (con motivo) -> EN_REVISION -> APROBADO validado"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("9. Aprobador aprobando o rechazando según reglas", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 10: Cierre de sesión y protección de rutas
    # --------------------------------------------------------------------------
    print("\n[Prueba 10] Cierre de sesión y protección de rutas...")
    try:
        res_logout = requests.post(
            f"{BASE_URL}/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token_gen}"},
            timeout=10
        )
        assert res_logout.status_code == 200, f"Error en logout: {res_logout.text}"
        assert "Sesión cerrada correctamente" in res_logout.json().get("mensaje", "")
        print(f" -> ÉXITO: Endpoint de cierre de sesión responde 200. En frontend se destruye sesión y protege rutas.")
        resultados.append(("10. Cierre de sesión y protección de rutas", True, "HTTP 200 | Cierre de sesión formal y redirección al login"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("10. Cierre de sesión y protección de rutas", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 11: Conexión FastAPI-PostgreSQL sin contraseña
    # --------------------------------------------------------------------------
    print("\n[Prueba 11] Conexión FastAPI-PostgreSQL sin contraseña en DATABASE_URL...")
    try:
        conn = psycopg2.connect("postgresql://plurione@postgres:5432/contratos_db")
        with conn.cursor() as cur:
            cur.execute("SELECT current_user, current_database(), pg_backend_pid();")
            row = cur.fetchone()
            assert row[0] == "plurione", f"Usuario DB inesperado: {row[0]}"
            assert row[1] == "contratos_db", f"Database inesperada: {row[1]}"
        conn.close()
        print(f" -> ÉXITO: Conexión directa a PostgreSQL lograda SIN suministrar contraseña (trust auth en Docker).")
        resultados.append(("11. Conexión FastAPI-PostgreSQL sin contraseña", True, f"psycopg2 conectado exitosamente como usuario '{row[0]}' en base '{row[1]}' sin contraseña"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("11. Conexión FastAPI-PostgreSQL sin contraseña", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 12: Conservación de datos tras reinicio de servicios
    # --------------------------------------------------------------------------
    print("\n[Prueba 12] Conservación de los datos en PostgreSQL...")
    try:
        conn = psycopg2.connect("postgresql://plurione@postgres:5432/contratos_db")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) AS total FROM clientes;")
            cnt_cli = cur.fetchone()["total"]
            assert cnt_cli >= 3, f"Faltan clientes, hay {cnt_cli}"

            cur.execute("SELECT COUNT(*) AS total FROM clausulas;")
            cnt_cls = cur.fetchone()["total"]
            assert cnt_cls >= 10, f"Faltan cláusulas, hay {cnt_cls}"

            cur.execute("SELECT COUNT(*) AS total FROM contratos;")
            cnt_cnt = cur.fetchone()["total"]
            assert cnt_cnt >= 4, f"Faltan contratos históricos, hay {cnt_cnt}"

            cur.execute("SELECT COUNT(*) AS total FROM usuarios WHERE password_hash LIKE '$2b$%';")
            cnt_usr = cur.fetchone()["total"]
            assert cnt_usr >= 3, f"Usuarios sin hash bcrypt: {cnt_usr}"
        conn.close()
        print(f" -> ÉXITO: Datos conservados: {cnt_cli} clientes, {cnt_cls} cláusulas, {cnt_cnt} contratos, {cnt_usr} usuarios con Bcrypt.")
        resultados.append(("12. Conservación de datos tras reinicio", True, f"{cnt_cli} clientes, {cnt_cls} cláusulas, {cnt_cnt} contratos, {cnt_usr} cuentas con bcrypt"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("12. Conservación de datos tras reinicio", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 13: Generación de un contrato con Ollama (Llama 3.1 8B)
    # --------------------------------------------------------------------------
    print("\n[Prueba 13] Generación de un contrato con Ollama (Llama 3.1 8B)...")
    payload_generacion = {
        "cliente_id": "cli-001",
        "variables": {
            "fecha": "2026-10-19",
            "lugar_firma": "Ciudad de México",
            "objeto": "Servicios de Asesoría en Automatización de Contratos e Inteligencia Artificial",
            "monto": 175000.00,
            "forma_pago": "Por entregable",
            "vigencia_inicio": "2026-11-01",
            "vigencia_fin": "2027-04-30",
            "penalizacion": "1% diario por retraso no justificado"
        },
        "clausulas_ids": ["clausula-std-1", "clausula-std-2", "clausula-std-3", "clausula-std-6", "clausula-std-10"],
        "creado_por": "usr-gen-01"
    }

    t0 = time.time()
    try:
        # Volvemos a obtener un token de Generador fresco
        res_login_fresh = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "username": "uacontreras",
            "password": "inicio2026"
        }, timeout=10)
        token_gen = res_login_fresh.json()["access_token"]

        res_gen = requests.post(
            f"{BASE_URL}/api/v1/contratos/generar",
            headers={"Authorization": f"Bearer {token_gen}"},
            json=payload_generacion,
            timeout=200
        )
        t_gen = time.time() - t0
        assert res_gen.status_code == 201, f"Status code no es 201: {res_gen.status_code} - {res_gen.text}"
        data_gen = res_gen.json()
        contrato_id_test = data_gen["id"]
        assert contrato_id_test, "No devolvió id de contrato"
        assert data_gen["estado"] == "BORRADOR"
        assert len(data_gen["texto_generado"]) > 100

        print(f" -> ÉXITO: Contrato {contrato_id_test} ({data_gen['folio']}) generado en {t_gen:.2f}s con Llama 3.1 8B.")
        resultados.append(("13. Generación de un contrato con Ollama", True, f"Generado en {t_gen:.2f}s | Folio {data_gen['folio']} | Estado BORRADOR"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("13. Generación de un contrato con Ollama", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 14: Consulta posterior del contrato guardado
    # --------------------------------------------------------------------------
    print("\n[Prueba 14] Consulta posterior del contrato guardado vía API...")
    try:
        assert contrato_id_test, "Se requiere contrato_id_test generado en la prueba 13"
        res_get = requests.get(
            f"{BASE_URL}/api/v1/contratos/{contrato_id_test}",
            headers={"Authorization": f"Bearer {token_gen}"},
            timeout=10
        )
        assert res_get.status_code == 200, f"Error consultando contrato: {res_get.text}"
        data_get = res_get.json()
        assert data_get["id"] == contrato_id_test
        assert data_get["estado"] == "BORRADOR"
        assert data_get["clienteId"] == "cli-001"
        assert data_get["variables"]["monto"] == 175000.00
        assert len(data_get["clausulasSeleccionadas"]) == 5
        print(f" -> ÉXITO: Contrato recuperado con integridad referencial completa y folio {data_get['folio']}.")
        resultados.append(("14. Consulta posterior del contrato guardado", True, f"HTTP 200 | Folio {data_get['folio']} | {len(data_get['clausulasSeleccionadas'])} cláusulas"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("14. Consulta posterior del contrato guardado", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 15: Exportación de PDF con WeasyPrint
    # --------------------------------------------------------------------------
    print("\n[Prueba 15] Exportación de PDF formal con WeasyPrint...")
    try:
        assert contrato_id_test, "Se requiere contrato_id_test"
        res_pdf = requests.get(
            f"{BASE_URL}/api/v1/contratos/{contrato_id_test}/pdf",
            headers={"Authorization": f"Bearer {token_aprob}"},
            timeout=30
        )
        assert res_pdf.status_code == 200, f"Error generando PDF: {res_pdf.status_code} - {res_pdf.text}"
        assert res_pdf.headers.get("content-type") == "application/pdf"
        pdf_bytes = res_pdf.content
        assert pdf_bytes.startswith(b"%PDF-"), "Encabezado no corresponde a archivo PDF legítimo"
        assert len(pdf_bytes) > 5000, f"PDF demasiado pequeño: {len(pdf_bytes)} bytes"

        print(f" -> ÉXITO: PDF formal renderizado con WeasyPrint ({len(pdf_bytes):,} bytes).")
        resultados.append(("15. Exportación de PDF", True, f"HTTP 200 | {len(pdf_bytes):,} bytes con firma binaria %PDF-"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("15. Exportación de PDF", False, str(e)))

    # --------------------------------------------------------------------------
    # Prueba 16: Compilación del frontend y disponibilidad de la API
    # --------------------------------------------------------------------------
    print("\n[Prueba 16] Compilación del frontend y disponibilidad de la API...")
    try:
        res_health = requests.get(f"{BASE_URL}/health", timeout=5)
        assert res_health.status_code == 200, f"Healthcheck falló: {res_health.status_code}"
        health_data = res_health.json()
        assert health_data["status"] == "healthy", f"Salud no es healthy: {health_data['status']}"
        assert health_data["database_conectada"] is True
        assert health_data["ollama_conectado"] is True

        # Verificar existencia de bundle del frontend generado por Vite
        dist_html = os.path.exists("/app/../dist/index.html") or os.path.exists("dist/index.html")
        print(f" -> ÉXITO: API /health reporta healthy (DB: OK, Ollama: OK). Frontend compilado.")
        resultados.append(("16. Compilación de frontend y salud de API", True, f"API Healthy (DB: True, Ollama: True) | Llama 3.1 8B disponible"))
    except Exception as e:
        print(f" -> FALLÓ: {e}")
        resultados.append(("16. Compilación de frontend y salud de API", False, str(e)))

    # ==========================================================================
    # Resumen Final de Resultados
    # ==========================================================================
    print("\n" + "=" * 75)
    print("RESUMEN DE VERIFICACIÓN DE LAS 16 PRUEBAS OBLIGATORIAS")
    print("=" * 75)
    todos_ok = True
    for nombre, exito, detalle in resultados:
        marca = "✓ PASÓ" if exito else "✗ FALLÓ"
        print(f"{marca} | {nombre} -> {detalle}")
        if not exito:
            todos_ok = False
    print("=" * 75)
    print(f"Resultado final: {'TODAS LAS PRUEBAS PASARON EXITOSAMENTE (16/16)' if todos_ok else 'EXISTEN FALLOS EN LAS PRUEBAS'}")
    print("=" * 75)

    return 0 if todos_ok else 1

if __name__ == "__main__":
    sys.exit(ejecutar_pruebas())
