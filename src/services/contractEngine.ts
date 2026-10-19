import { ClienteFiscal, Clausula, EmpresaNovaLex, VariablesContrato } from '../types/contract';

/**
 * Validador de RFC según especificaciones del SAT (México)
 * Personas Morales: 12 caracteres (3 letras + 6 números + 3 homoclave)
 * Personas Físicas: 13 caracteres (4 letras + 6 números + 3 homoclave)
 */
export function validateMexicanRFC(rfcRaw: string): { isValid: boolean; tipo?: 'MORAL' | 'FISICA'; error?: string } {
  const rfc = rfcRaw.trim().toUpperCase();
  
  if (!rfc) {
    return { isValid: false, error: 'El RFC es obligatorio' };
  }

  // Regex estricta SAT
  const regexMoral = /^[A-Z&Ñ]{3}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;
  const regexFisica = /^[A-Z&Ñ]{4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;

  if (regexMoral.test(rfc)) {
    return { isValid: true, tipo: 'MORAL' };
  }

  if (regexFisica.test(rfc)) {
    return { isValid: true, tipo: 'FISICA' };
  }

  if (rfc.length !== 12 && rfc.length !== 13) {
    return { isValid: false, error: `Longitud inválida (${rfc.length} caracteres). Debe contener 12 (moral) o 13 (física)` };
  }

  return { isValid: false, error: 'Formato de RFC inválido según la estructura oficial del SAT (letras, fecha AAMMDD y homoclave)' };
}

/**
 * Convierte un importe numérico a texto legal en pesos mexicanos (formato legal SAT/notarial)
 * Ej: 348000 -> "TRESCIENTOS CUARENTA Y OCHO MIL PESOS 00/100 M.N."
 */
export function numeroALetrasPesos(monto: number): string {
  if (isNaN(monto) || monto === 0) return 'CERO PESOS 00/100 M.N.';

  const partes = monto.toFixed(2).split('.');
  const entero = parseInt(partes[0], 10);
  const centavos = partes[1] || '00';

  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertirBloque(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let resultado = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      resultado += centenas[c] + ' ';
    }

    if (d === 1) {
      resultado += especiales[u] + ' ';
    } else if (d === 2) {
      if (u === 0) resultado += 'VEINTE ';
      else resultado += 'VEINTI' + unidades[u] + ' ';
    } else if (d > 2) {
      resultado += decenas[d] + (u > 0 ? ' Y ' + unidades[u] + ' ' : ' ');
    } else if (d === 0 && u > 0) {
      resultado += unidades[u] + ' ';
    }

    return resultado.trim();
  }

  let textoEntero = '';
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const unidadesResto = entero % 1000;

  if (millones > 0) {
    if (millones === 1) {
      textoEntero += 'UN MILLÓN ';
    } else {
      textoEntero += convertirBloque(millones) + ' MILLONES ';
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      textoEntero += 'MIL ';
    } else {
      textoEntero += convertirBloque(miles) + ' MIL ';
    }
  }

  if (unidadesResto > 0 || entero === 0) {
    textoEntero += convertirBloque(unidadesResto) + ' ';
  }

  const sufijoMoneda = entero === 1 ? 'PESO' : 'PESOS';
  return `${textoEntero.trim()} ${sufijoMoneda} ${centavos}/100 M.N.`;
}

export function formatearMonedaMXN(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(monto);
}

export function formatearFechaLarga(fechaStr: string): string {
  if (!fechaStr) return '';
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  // Soporta YYYY-MM-DD
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const anio = partes[0];
    const mesIndex = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    return `${dia} de ${meses[mesIndex] || 'enero'} de ${anio}`;
  }
  return fechaStr;
}

/**
 * Ensamblador determinista de contratos de Prestación de Servicios Profesionales
 * Incorpora declaraciones formales de NovaLex Tecnología Contractual S.A. de C.V. y del Cliente,
 * las cláusulas seleccionadas con resolución de variables y bloque notarial de firmas.
 */
export function ensamblarBorradorContrato(
  empresa: EmpresaNovaLex,
  cliente: ClienteFiscal,
  variables: VariablesContrato,
  clausulasCatalogo: Clausula[],
  clausulasSeleccionadasIds: string[],
  customOverrides: Record<string, string> = {}
): string {
  const fechaFirmaTexto = formatearFechaLarga(variables.fecha);
  const vigenciaInicioTexto = formatearFechaLarga(variables.vigencia_inicio);
  const vigenciaFinTexto = formatearFechaLarga(variables.vigencia_fin);
  const montoTexto = formatearMonedaMXN(variables.monto);
  const montoLetras = numeroALetrasPesos(variables.monto);
  const lugarFirma = variables.lugar_firma || 'Ciudad de México';

  // Mapa de reemplazo de variables
  const dictVariables: Record<string, string> = {
    '{{cliente_razon_social}}': cliente.razonSocial,
    '{{cliente_rfc}}': cliente.rfc,
    '{{cliente_domicilio}}': cliente.domicilioFiscal,
    '{{cliente_representante}}': cliente.representanteLegal,
    '{{cliente_cargo}}': cliente.cargo,
    '{{cliente_escritura}}': cliente.escritura,
    '{{cliente_email}}': cliente.email,
    '{{objeto}}': variables.objeto,
    '{{monto}}': variables.monto.toString(),
    '{{monto_formateado}}': montoTexto,
    '{{monto_letra}}': montoLetras,
    '{{forma_pago}}': variables.forma_pago,
    '{{vigencia_inicio}}': vigenciaInicioTexto,
    '{{vigencia_fin}}': vigenciaFinTexto,
    '{{penalizacion}}': variables.penalizacion,
    '{{fecha}}': fechaFirmaTexto,
    '{{lugar_firma}}': lugarFirma,
    '{{empresa_razon_social}}': empresa.razonSocial,
    '{{empresa_rfc}}': empresa.rfc,
    '{{empresa_domicilio}}': empresa.domicilioFiscal,
    '{{empresa_representante}}': empresa.representanteLegal,
    '{{empresa_cargo}}': empresa.cargoRepresentante
  };

  // Encabezado proemio
  const proemio = `CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES QUE CELEBRAN, POR UNA PARTE, LA SOCIEDAD MERCANTIL DENOMINADA "${empresa.razonSocial.toUpperCase()}" (EN LO SUCESIVO IDENTIFICADA COMO "EL PRESTADOR"), REPRESENTADA EN ESTE ACTO POR ${empresa.representanteLegal.toUpperCase()}, EN SU CARÁCTER DE ${empresa.cargoRepresentante.toUpperCase()}; Y POR OTRA PARTE, LA PERSONA DENOMINADA "${cliente.razonSocial.toUpperCase()}" (EN LO SUCESIVO IDENTIFICADA COMO "EL CLIENTE"), REPRESENTADA POR ${cliente.representanteLegal.toUpperCase()}, EN SU CARÁCTER DE ${cliente.cargo.toUpperCase()}; A QUIENES CUANDO ACTÚEN CONJUNTAMENTE SE LES DENOMINARÁ "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:`;

  // Declaraciones
  const declaraciones = `DECLARACIONES

I. DECLARA "EL PRESTADOR", POR CONDUCTO DE SU REPRESENTANTE LEGAL:
  I.1. Que es una sociedad anónima de capital variable legalmente constituida de conformidad con las leyes de la República Mexicana, según consta en la ${empresa.escrituraPublica}, inscrita en el Registro Público de la Propiedad y de Comercio bajo el Folio Mercantil Electrónico ${empresa.folioMercantil}.
  I.2. Que su representante legal cuenta con las facultades legales necesarias para suscribir el presente instrumento, las cuales a la fecha no le han sido revocadas, modificadas ni limitadas en forma alguna.
  I.3. Que se encuentra debidamente inscrita en el Registro Federal de Contribuyentes bajo la clave ${empresa.rfc}.
  I.4. Que tiene establecido su domicilio fiscal y corporativo en: ${empresa.domicilioFiscal}.
  I.5. Que dentro de su objeto social y giro preponderante se encuentran los servicios de consultoría, desarrollo de software, capacitación en tecnologías de información y servicios profesionales especializados.
  I.6. Que dispone de la organización, capacidad técnica, personal calificado e infraestructura tecnológica para cumplir cabalmente con las obligaciones asumidas.

II. DECLARA "EL CLIENTE", POR CONDUCTO DE SU REPRESENTANTE:
  II.1. Que es una persona con plena capacidad de ejercicio y existencia legal bajo el marco jurídico mexicano, inscrita en el Registro Federal de Contribuyentes con clave ${cliente.rfc}.
  II.2. Que su representante legal cuenta con las atribuciones jurídicas bastantes para obligarla en los términos de este contrato, conforme al testimonio ${cliente.escritura}.
  II.3. Que señala como su domicilio legal y fiscal para todos los efectos derivados de este acto jurídico el ubicado en: ${cliente.domicilioFiscal}.
  II.4. Que es su voluntad contratar los servicios profesionales especializados de "EL PRESTADOR" bajo las condiciones, plazos y honorarios que se estipulan en el clausulado subsiguiente.

III. DECLARAN "LAS PARTES", CONJUNTAMENTE:
  III.1. Que se reconocen recíprocamente la personalidad jurídica y facultades con las que comparecen a la suscripción del presente acto.
  III.2. Que acuden libremente a la celebración del presente contrato, sin que medie error, dolo, violencia, mala fe, lesión o cualquier otro vicio del consentimiento que pudiera invalidarlo.

Expuesto lo anterior, "LAS PARTES" otorgan de mutuo acuerdo las siguientes:`;

  // Filtrar y ordenar las cláusulas seleccionadas
  const clausulasAProcesar = clausulasCatalogo
    .filter(c => clausulasSeleccionadasIds.includes(c.id))
    .sort((a, b) => a.numero - b.numero);

  // Mapear nombres ordinales si el usuario cambió la selección
  const ordinales = [
    'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
    'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
    'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA'
  ];

  const clausulasTexto = clausulasAProcesar.map((clausula, index) => {
    let contenido = customOverrides[clausula.id] || clausula.textoBase;

    // Sustituir variables en el texto base
    for (const [clave, valor] of Object.entries(dictVariables)) {
      contenido = contenido.replaceAll(clave, valor);
    }

    // Normalizar ordinal si se reorganizaron
    const ordinalActual = ordinales[index] || `CLÁUSULA ${index + 1}`;
    
    // Si la cláusula es estándar o personalizada, asegurar encabezado consistente
    return `CLÁUSULA ${ordinalActual}. ${clausula.nombre.toUpperCase()}\n${contenido}`;
  }).join('\n\n');

  // Cierre y firmas
  const cierre = `LEÍDO QUE FUE EL PRESENTE CONTRATO POR LAS PARTES Y ENTERADAS DE SU CONTENIDO, VALOR Y ALCANCE LEGAL, LO RATIFICAN Y FIRMAN POR DUPLICADO EN LA CIUDAD DE ${lugarFirma.toUpperCase()}, EL DÍA ${fechaFirmaTexto.toUpperCase()}, QUEDANDO UN EJEMPLAR EN PODER DE CADA UNA DE ELLAS.

POR "EL PRESTADOR"
${empresa.razonSocial.toUpperCase()}



_____________________________________________
${empresa.representanteLegal.toUpperCase()}
${empresa.cargoRepresentante.toUpperCase()}
RFC: ${empresa.rfc}


POR "EL CLIENTE"
${cliente.razonSocial.toUpperCase()}



_____________________________________________
${cliente.representanteLegal.toUpperCase()}
${cliente.cargo.toUpperCase()}
RFC: ${cliente.rfc}


TESTIGOS:



_____________________________________________     _____________________________________________
Nombre:                                           Nombre:
Identificación:                                   Identificación:`;

  return `${proemio}\n\n${declaraciones}\n\nCLÁUSULAS\n\n${clausulasTexto}\n\n${cierre}`;
}

/**
 * Prepara el payload estructurado compatible con la futura API FastAPI / LangChain / Ollama
 */
export function generarPayloadFastAPI(
  empresa: EmpresaNovaLex,
  cliente: ClienteFiscal,
  variables: VariablesContrato,
  clausulasSeleccionadasIds: string[]
) {
  return {
    modelo_ia: 'llama3.1:8b',
    temperatura: 0.1,
    proveedor_local: 'ollama',
    endpoint_sugerido: 'http://localhost:11434/api/generate',
    tipo_contrato: 'PRESTACION_SERVICIOS_PROFESIONALES',
    datos_prestador: {
      razon_social: empresa.razonSocial,
      rfc: empresa.rfc,
      representante_legal: empresa.representanteLegal,
      cargo: empresa.cargoRepresentante,
      domicilio: empresa.domicilioFiscal,
      escritura: empresa.escrituraPublica
    },
    datos_cliente: {
      razon_social: cliente.razonSocial,
      rfc: cliente.rfc,
      representante_legal: cliente.representanteLegal,
      cargo: cliente.cargo,
      domicilio: cliente.domicilioFiscal,
      escritura: cliente.escritura,
      email: cliente.email
    },
    variables: {
      ...variables,
      monto_formateado: formatearMonedaMXN(variables.monto),
      monto_letra: numeroALetrasPesos(variables.monto),
      fecha_formateada: formatearFechaLarga(variables.fecha),
      vigencia_inicio_formateada: formatearFechaLarga(variables.vigencia_inicio),
      vigencia_fin_formateada: formatearFechaLarga(variables.vigencia_fin)
    },
    clausulas_ids: clausulasSeleccionadasIds,
    timestamp: new Date().toISOString()
  };
}
