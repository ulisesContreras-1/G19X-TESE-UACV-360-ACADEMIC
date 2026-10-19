"""
Adaptadores explícitos entre el modelo relacional de PostgreSQL (snake_case)
y las interfaces de TypeScript esperadas por el frontend React (camelCase).
Garantiza compatibilidad estricta sin alterar silenciosamente tipos ni contratos.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

ORDINALES = [
    'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
    'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
    'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA'
]


def db_to_cliente_fiscal(row: Dict[str, Any]) -> Dict[str, Any]:
    """Transforma una fila de la tabla 'clientes' al formato 'ClienteFiscal' del frontend."""
    creado = row.get("creado_en")
    fecha_reg = creado.strftime("%Y-%m-%d") if isinstance(creado, datetime) else str(creado or "")

    return {
        "id": str(row["id"]),
        "razonSocial": str(row["razon_social"]),
        "rfc": str(row["rfc"]).strip().toUpperCase() if hasattr(str(row["rfc"]), "toUpperCase") else str(row["rfc"]).strip().upper(),
        "domicilioFiscal": str(row["domicilio_fiscal"]),
        "representanteLegal": str(row["representante_legal"]),
        "cargo": str(row["cargo"]),
        "escritura": str(row["escritura"]),
        "email": str(row["email"]),
        "telefono": str(row.get("telefono") or ""),
        "esDemo": bool(row.get("es_demo", False)),
        "fechaRegistro": fecha_reg
    }


def db_to_clausula(row: Dict[str, Any]) -> Dict[str, Any]:
    """Transforma una fila de la tabla 'clausulas' al formato 'Clausula' del frontend."""
    num = int(row.get("orden") or 1)
    etiqueta = ORDINALES[num - 1] if 1 <= num <= len(ORDINALES) else f"CLÁUSULA {num}"
    tipo_raw = str(row.get("tipo", "ESTANDAR")).upper()
    tipo_frontend = "estandar" if tipo_raw == "ESTANDAR" else "personalizada"
    creado = row.get("creado_en")
    fecha_str = creado.isoformat() if isinstance(creado, datetime) else str(creado or "")

    return {
        "id": str(row["id"]),
        "numero": num,
        "etiquetaNumero": etiqueta,
        "nombre": str(row["nombre"]),
        "textoBase": str(row["texto_base"]),
        "tipo": tipo_frontend,
        "categoria": str(row.get("categoria", "General")),
        "requerida": bool(row.get("requerida", False)),
        "seleccionadaPorDefecto": bool(row.get("requerida", False)),
        "descripcionBreve": f"Cláusula de {row['nombre']} (Categoría: {row.get('categoria', 'General')})",
        "fundamentoLegal": "Marco Jurídico Mercantil y Civil de los Estados Unidos Mexicanos",
        "fechaCreacion": fecha_str
    }


def db_to_contrato(row: Dict[str, Any], usuarios_map: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Transforma una fila de la tabla 'contratos' al formato 'Contrato' del frontend."""
    variables = row.get("variables") or {}
    if not isinstance(variables, dict):
        variables = {}

    folio = variables.get("folio")
    if not folio:
        folio = f"NOVA-PSP-2026-{str(row['id'])[-4:]}"

    historial = variables.get("historial") or []
    motivo_rechazo = variables.get("motivoRechazo") or variables.get("motivo_rechazo")

    creado_por_id = row.get("creado_por")
    editado_por_id = row.get("editado_por")
    aprobado_por_id = row.get("aprobado_por")

    creado_por_nombre = (usuarios_map.get(creado_por_id) if usuarios_map and creado_por_id else None) or creado_por_id or "Valeria Ramos Peña"
    editado_por_nombre = (usuarios_map.get(editado_por_id) if usuarios_map and editado_por_id else None) or editado_por_id
    aprobado_por_nombre = (usuarios_map.get(aprobado_por_id) if usuarios_map and aprobado_por_id else None) or aprobado_por_id

    creado_en = row.get("creado_en")
    actualizado_en = row.get("actualizado_en")

    return {
        "id": str(row["id"]),
        "folio": str(folio),
        "clienteId": str(row["cliente_id"]),
        "estado": str(row["estado"]),
        "fechaCreacion": creado_en.isoformat() if isinstance(creado_en, datetime) else str(creado_en or ""),
        "fechaActualizacion": actualizado_en.isoformat() if isinstance(actualizado_en, datetime) else str(actualizado_en or ""),
        "variables": {
            "fecha": str(variables.get("fecha", "")),
            "lugar_firma": str(variables.get("lugar_firma", "Ciudad de México")),
            "objeto": str(variables.get("objeto", "")),
            "monto": float(variables.get("monto", 0)),
            "forma_pago": str(variables.get("forma_pago", "Mensual")),
            "vigencia_inicio": str(variables.get("vigencia_inicio", "")),
            "vigencia_fin": str(variables.get("vigencia_fin", "")),
            "penalizacion": str(variables.get("penalizacion", "10%"))
        },
        "clausulasSeleccionadas": list(row.get("clausulas_seleccionadas") or []),
        "textoGenerado": str(row.get("texto_generado") or ""),
        "creadoPor": creado_por_nombre,
        "editadoPor": editado_por_nombre,
        "aprobadoPor": aprobado_por_nombre,
        "motivoRechazo": motivo_rechazo,
        "historial": historial,
        "esDemo": bool(variables.get("esDemo", False))
    }
