"""
Módulo de Cláusulas Estándar Iniciales - NovaLex Tecnología Contractual S.A. de C.V.
NOTA IMPORTANTE:
El contenido de estas cláusulas corresponde a plantillas ilustrativas de demostración
para el prototipo y está PENDIENTE DE REVISIÓN JURÍDICA FORMAL. No constituye asesoría legal definitiva.
La identidad corporativa es ficticia con fines de demostración de software.
"""

CLAUSULAS_ESTANDAR_DEMO = [
    {
        "id": "clausula-std-1",
        "numero": 1,
        "nombre": "Objeto del Contrato",
        "tipo": "ESTANDAR",
        "categoria": "Esencial",
        "requerida": True,
        "orden": 1,
        "texto_base": (
            "PRIMERA. OBJETO DEL CONTRATO.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "\"EL PRESTADOR\" (NovaLex Tecnología Contractual S.A. de C.V.) se obliga a prestar a favor de \"EL CLIENTE\" ({{cliente_razon_social}}), "
            "y éste se compromete a recibir a su entera satisfacción, los servicios profesionales consistentes en:\n\n"
            "{{objeto}}\n\n"
            "Dichos servicios se ejecutarán con la debida diligencia, aplicando los estándares técnicos, metodológicos "
            "y profesionales propios de la industria de consultoría y tecnologías de la información."
        )
    },
    {
        "id": "clausula-std-2",
        "numero": 2,
        "nombre": "Vigencia",
        "tipo": "ESTANDAR",
        "categoria": "Temporalidad",
        "requerida": True,
        "orden": 2,
        "texto_base": (
            "SEGUNDA. VIGENCIA.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Las partes acuerdan que la vigencia del presente Contrato surtirá plenos efectos a partir del {{vigencia_inicio}} "
            "y concluirá el {{vigencia_fin}}.\n\n"
            "Lo anterior, sin perjuicio de que las partes puedan prorrogar o renovar el plazo pactado mediante la suscripción "
            "del convenio modificatorio por escrito correspondiente, celebrado con al menos 15 (quince) días naturales de antelación."
        )
    },
    {
        "id": "clausula-std-3",
        "numero": 3,
        "nombre": "Monto y Forma de Pago",
        "tipo": "ESTANDAR",
        "categoria": "Financiera",
        "requerida": True,
        "orden": 3,
        "texto_base": (
            "TERCERA. MONTO Y FORMA DE PAGO.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "\"EL CLIENTE\" pagará a \"EL PRESTADOR\" por concepto de honorarios profesionales la cantidad total neta pactada de:\n\n"
            "$ {{monto_formateado}} M.N. ({{monto_letra}}), más el Impuesto al Valor Agregado (IVA) correspondiente al 16%.\n\n"
            "La contraprestación será liquidada bajo el esquema: {{forma_pago}}, previa emisión y validación del Comprobante Fiscal "
            "Digital por Internet (CFDI) emitido por \"EL PRESTADOR\" mediante transferencia electrónica vía SPEI."
        )
    },
    {
        "id": "clausula-std-4",
        "numero": 4,
        "nombre": "Obligaciones del Prestador de Servicios",
        "tipo": "ESTANDAR",
        "categoria": "Operativa",
        "requerida": True,
        "orden": 4,
        "texto_base": (
            "CUARTA. OBLIGACIONES DEL PRESTADOR.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "\"EL PRESTADOR\" se compromete a:\n"
            "a) Prestar los servicios objeto del contrato con sujeción a la debida pericia técnica y ética profesional.\n"
            "b) Asignar personal con las calificaciones requeridas para el debido cumplimiento.\n"
            "c) Mantener informado a \"EL CLIENTE\" sobre el estatus, avances y entregables del servicio mediante reportes periódicos.\n"
            "d) Custodiar debidamente cualquier bien, activo documental o credencial técnica puesta a su disposición."
        )
    },
    {
        "id": "clausula-std-5",
        "numero": 5,
        "nombre": "Obligaciones del Cliente",
        "tipo": "ESTANDAR",
        "categoria": "Operativa",
        "requerida": True,
        "orden": 5,
        "texto_base": (
            "QUINTA. OBLIGACIONES DEL CLIENTE.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "\"EL CLIENTE\" se compromete expresamente a:\n"
            "a) Liquidar en tiempo y forma los honorarios devengados conforme a los plazos previstos en la Cláusula Tercera.\n"
            "b) Suministrar oportunamente a \"EL PRESTADOR\" la información, insumos y accesos indispensables para el desarrollo de los trabajos.\n"
            "c) Designar a un enlace de coordinación técnica para la oportuna revisión y validación de los entregables."
        )
    },
    {
        "id": "clausula-std-6",
        "numero": 6,
        "nombre": "Confidencialidad",
        "tipo": "ESTANDAR",
        "categoria": "Protección Legal",
        "requerida": True,
        "orden": 6,
        "texto_base": (
            "SEXTA. CONFIDENCIALIDAD.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Las partes reconocen que con motivo de los servicios podrán tener acceso a información técnica, financiera, comercial "
            "y operativa de carácter reservado. Ambas partes convienen en mantener absoluta confidencialidad respecto de dicha "
            "información, obligándose a no divulgarla a terceros sin consentimiento previo por escrito.\n\n"
            "Esta obligación subsistirá durante la vigencia del contrato y por un periodo de 5 (cinco) años posteriores a su conclusión."
        )
    },
    {
        "id": "clausula-std-7",
        "numero": 7,
        "nombre": "Propiedad Intelectual",
        "tipo": "ESTANDAR",
        "categoria": "Protección Legal",
        "requerida": True,
        "orden": 7,
        "texto_base": (
            "SÉPTIMA. PROPIEDAD INTELECTUAL.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Las partes pactan que los derechos patrimoniales sobre los informes y entregables finales producidos exprofeso "
            "bajo el presente encargo corresponderán a \"EL CLIENTE\", una vez satisfecho íntegramente el pago de los honorarios estipulados.\n\n"
            "\"EL PRESTADOR\" conservará la titularidad sobre sus herramientas previas, librerías preexistentes y conocimientos "
            "técnicos generales propios de su actividad consultora."
        )
    },
    {
        "id": "clausula-std-8",
        "numero": 8,
        "nombre": "Terminación Anticipada",
        "tipo": "ESTANDAR",
        "categoria": "Resolución Contractual",
        "requerida": True,
        "orden": 8,
        "texto_base": (
            "OCTAVA. TERMINACIÓN ANTICIPADA Y PENALIZACIÓN.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Cualquiera de las partes podrá dar por terminado anticipadamente el presente Contrato mediante notificación por escrito "
            "con por lo menos 30 (treinta) días naturales de anticipación. \"EL CLIENTE\" cubrirá el importe proporcional de los "
            "servicios efectivamente prestados hasta la fecha efectiva de cese.\n\n"
            "En caso de incumplimiento imputable a las obligaciones convenidas o retraso injustificado, operará la siguiente "
            "sanción pecuniaria: {{penalizacion}}."
        )
    },
    {
        "id": "clausula-std-9",
        "numero": 9,
        "nombre": "Caso Fortuito y Fuerza Mayor",
        "tipo": "ESTANDAR",
        "categoria": "Excluyente de Responsabilidad",
        "requerida": True,
        "orden": 9,
        "texto_base": (
            "NOVENA. CASO FORTUITO O FUERZA MAYOR.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Ninguna de las partes incurrirá en responsabilidad civil ni contractual por demoras o incumplimientos provocados "
            "por circunstancias de caso fortuito o de fuerza mayor insuperables (fenómenos naturales extraordinarios, actos de autoridad "
            "o fallas mayores en infraestructura pública), debiendo dar aviso formal en un lapso no mayor a 5 días hábiles."
        )
    },
    {
        "id": "clausula-std-10",
        "numero": 10,
        "nombre": "Jurisdicción y Ley Aplicable",
        "tipo": "ESTANDAR",
        "categoria": "Marco Legal",
        "requerida": True,
        "orden": 10,
        "texto_base": (
            "DÉCIMA. JURISDICCIÓN Y LEY APLICABLE.- [Contenido de demostración - Pendiente de revisión jurídica formal] "
            "Para la interpretación, ejecución y cumplimiento del presente Contrato, las partes se someten a la legislación aplicable "
            "de los Estados Unidos Mexicanos y a la jurisdicción de los Tribunales Competentes de la Ciudad de México, renunciando "
            "al fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros."
        )
    }
]


def inicializar_clausulas_estandar(conn) -> int:
    """
    Inserta de forma idempotente las 10 cláusulas estándar de demostración.
    Usa 'ON CONFLICT (id) DO NOTHING' para no duplicar ni sobrescribir
    cláusulas modificadas o personalizadas por el usuario.
    Devuelve la cantidad de cláusulas insertadas.
    """
    insertadas = 0
    with conn.cursor() as cur:
        for c in CLAUSULAS_ESTANDAR_DEMO:
            cur.execute(
                """
                INSERT INTO clausulas (id, nombre, texto_base, tipo, categoria, requerida, orden)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (
                    c["id"],
                    c["nombre"],
                    c["texto_base"],
                    c["tipo"],
                    c["categoria"],
                    c["requerida"],
                    c["orden"]
                )
            )
            if cur.rowcount > 0:
                insertadas += 1
        conn.commit()
    return insertadas
