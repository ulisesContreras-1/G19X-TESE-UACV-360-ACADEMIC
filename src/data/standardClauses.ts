import { Clausula } from '../types/contract';

/**
 * Las 10 Cláusulas Estándar de Demostración para NovaLex Tecnología Contractual S.A. de C.V.
 * Redactadas con apego estricto al Código Civil Federal de los Estados Unidos Mexicanos,
 * Ley Federal del Derecho de Autor, Ley Federal de Protección a la Propiedad Industrial
 * y Código de Comercio. Contenido demostrativo sujeto a revisión jurídica.
 */
export const CLAUSULAS_ESTANDAR: Clausula[] = [
  {
    id: 'clausula-std-1',
    numero: 1,
    etiquetaNumero: 'PRIMERA',
    nombre: 'Objeto del Contrato',
    tipo: 'estandar',
    categoria: 'Esencial',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Define de manera puntual las actividades de consultoría y servicios profesionales a desempeñar.',
    fundamentoLegal: 'Artículos 2606 al 2615 del Código Civil Federal',
    textoBase: `PRIMERA. OBJETO DEL CONTRATO.- "EL PRESTADOR" (NovaLex Tecnología Contractual S.A. de C.V.) se obliga a prestar a favor de "EL CLIENTE" ({{cliente_razon_social}}), y éste se compromete a recibir a su entera satisfacción, los servicios profesionales consistentes en:

{{objeto}}

Dichos servicios se ejecutarán con la debida diligencia, aplicando los más rigurosos estándares técnicos, metodológicos y profesionales que rigen en la industria de consultoría y tecnologías de la información.`
  },
  {
    id: 'clausula-std-2',
    numero: 2,
    etiquetaNumero: 'SEGUNDA',
    nombre: 'Vigencia',
    tipo: 'estandar',
    categoria: 'Temporalidad',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Estipula el plazo de ejecución del servicio, fecha de inicio y fecha de terminación.',
    fundamentoLegal: 'Artículos 1953 y correlativos del Código Civil Federal',
    textoBase: `SEGUNDA. VIGENCIA.- Las partes acuerdan que la vigencia del presente Contrato surtirá plenos efectos a partir del {{vigencia_inicio}} y concluirá el {{vigencia_fin}}. 

Lo anterior, sin perjuicio de que las partes puedan prorrogar o renovar el plazo pactado mediante la suscripción del convenio modificatorio por escrito correspondiente, celebrado con al menos 15 (quince) días naturales de antelación a su vencimiento ordinario.`
  },
  {
    id: 'clausula-std-3',
    numero: 3,
    etiquetaNumero: 'TERCERA',
    nombre: 'Monto y Forma de Pago',
    tipo: 'estandar',
    categoria: 'Financiera',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Fija los honorarios en pesos mexicanos (MXN), desglose de impuestos y periodicidad acordada.',
    fundamentoLegal: 'Artículos 2062, 2078 y 2613 del Código Civil Federal; Art. 29-A del Código Fiscal de la Federación',
    textoBase: `TERCERA. MONTO Y FORMA DE PAGO.- "EL CLIENTE" pagará a "EL PRESTADOR" por concepto de honorarios profesionales la cantidad total neta pactada de:

$ {{monto_formateado}} M.N. ({{monto_letra}}), más el Impuesto al Valor Agregado (IVA) correspondiente al 16% (dieciséis por ciento).

La contraprestación será liquidada bajo el esquema: {{forma_pago}}, previa emisión y validación del Comprobante Fiscal Digital por Internet (CFDI versión 4.0) emitido por "EL PRESTADOR" que reúna todos los requisitos fiscales vigentes, mediante transferencia electrónica bancaria vía SPEI a la cuenta formal designada.`
  },
  {
    id: 'clausula-std-4',
    numero: 4,
    etiquetaNumero: 'CUARTA',
    nombre: 'Obligaciones del Prestador de Servicios',
    tipo: 'estandar',
    categoria: 'Operativa',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Garantiza la asignación de personal calificado, calidad en entregables y rendición de informes periódicos.',
    fundamentoLegal: 'Artículos 2614 y 2615 del Código Civil Federal',
    textoBase: `CUARTA. OBLIGACIONES DEL PRESTADOR.- "EL PRESTADOR" se compromete a:
a) Prestar los servicios objeto del contrato con sujeción a la más alta pericia técnica y ética profesional.
b) Asignar personal con las calificaciones, experiencia y certificaciones requeridas para el debido cumplimiento.
c) Mantener informado a "EL CLIENTE" sobre el estatus, avances y hallazgos en la ejecución del servicio mediante reportes ejecutivos.
d) Custodiar debidamente cualquier bien, activo documental o credencial técnica puesta a su disposición para el cumplimiento de los servicios.`
  },
  {
    id: 'clausula-std-5',
    numero: 5,
    etiquetaNumero: 'QUINTA',
    nombre: 'Obligaciones del Cliente',
    tipo: 'estandar',
    categoria: 'Operativa',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Compromete al cliente a facilitar información verídica, accesos oportunos y liquidación puntual de honorarios.',
    fundamentoLegal: 'Artículos 2078 y 2606 del Código Civil Federal',
    textoBase: `QUINTA. OBLIGACIONES DEL CLIENTE.- "EL CLIENTE" se compromete expresamente a:
a) Liquidar en tiempo y forma los honorarios devengados conforme a los plazos previstos en la Cláusula Tercera.
b) Suministrar oportunamente a "EL PRESTADOR" la información, lineamientos, especificaciones y accesos digitales indispensables para el desarrollo de los trabajos.
c) Designar a un enlace de coordinación interna para la oportuna revisión y visto bueno de los entregables.`
  },
  {
    id: 'clausula-std-6',
    numero: 6,
    etiquetaNumero: 'SEXTA',
    nombre: 'Confidencialidad',
    tipo: 'estandar',
    categoria: 'Protección Legal',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Salvaguarda la información confidencial y secreto industrial conforme a la legislación mexicana.',
    fundamentoLegal: 'Artículos 163 al 169 de la Ley Federal de Protección a la Propiedad Industrial',
    textoBase: `SEXTA. CONFIDENCIALIDAD Y SECRETO INDUSTRIAL.- Las partes reconocen que con motivo de los servicios podrán tener acceso a información técnica, financiera, comercial y operativa con carácter de Secreto Industrial o de titularidad reservada. Ambas partes convienen en mantener absoluta reserva y confidencialidad respecto de dicha información, obligándose a no divulgarla, publicarla ni transmitirla a terceros sin consentimiento previo y por escrito de la contraparte.

Esta obligación subsistirá durante la vigencia del contrato y por un periodo ininterrumpido de 5 (cinco) años posteriores a su conclusión o rescisión.`
  },
  {
    id: 'clausula-std-7',
    numero: 7,
    etiquetaNumero: 'SÉPTIMA',
    nombre: 'Propiedad Intelectual',
    tipo: 'estandar',
    categoria: 'Protección Legal',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Regula la titularidad de derechos de autor patrimoniales sobre entregables y desarrollos.',
    fundamentoLegal: 'Artículo 83 y 84 de la Ley Federal del Derecho de Autor',
    textoBase: `SÉPTIMA. PROPIEDAD INTELECTUAL Y DERECHOS PATRIMONIALES.- Conforme al Artículo 83 de la Ley Federal del Derecho de Autor, las partes pactan que los derechos patrimoniales sobre los informes, metodologías, códigos fuente y entregables finales producidos exprofeso bajo el presente encargo corresponderán a "EL CLIENTE", una vez satisfecho íntegramente el pago de los honorarios estipulados.

"EL PRESTADOR" conservará en todo momento la titularidad sobre sus herramientas previas, librerías preexistentes ("Background IP") y conocimientos técnicos generales propios de su actividad consultora.`
  },
  {
    id: 'clausula-std-8',
    numero: 8,
    etiquetaNumero: 'OCTAVA',
    nombre: 'Terminación Anticipada',
    tipo: 'estandar',
    categoria: 'Resolución Contractual',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Faculta la rescisión o terminación por mutuo acuerdo o aviso por escrito sin necesidad de resolución judicial.',
    fundamentoLegal: 'Artículos 1797 y 2614 del Código Civil Federal',
    textoBase: `OCTAVA. TERMINACIÓN ANTICIPADA Y PENALIZACIÓN.- Cualquiera de las partes podrá dar por terminado anticipadamente el presente Contrato mediante notificación por escrito con acuse de recibo dada a la contraparte con por lo menos 30 (treinta) días naturales de anticipación. En este supuesto, "EL CLIENTE" cubrirá el importe proporcional de los servicios efectivamente prestados hasta la fecha efectiva de cese.

En caso de incumplimiento imputable a las obligaciones convenidas o retraso en las entregas, operará la siguiente sanción pecuniaria: {{penalizacion}}, sin que el importe acumulado exceda el monto total del presente instrumento.`
  },
  {
    id: 'clausula-std-9',
    numero: 9,
    etiquetaNumero: 'NOVENA',
    nombre: 'Caso Fortuito y Fuerza Mayor',
    tipo: 'estandar',
    categoria: 'Excluyente de Responsabilidad',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Exime de responsabilidad ante catástrofes, fenómenos naturales o actos de autoridad insuperables.',
    fundamentoLegal: 'Artículo 2111 del Código Civil Federal',
    textoBase: `NOVENA. CASO FORTUITO O FUERZA MAYOR.- Ninguna de las partes incurrirá en responsabilidad civil ni contractual por demoras o incumplimientos provocados por circunstancias de caso fortuito o de fuerza mayor insuperables (actos de autoridad legítima, desastres naturales, epidemias o cortes estructurales en redes públicas de telecomunicaciones), debiendo dar aviso formal a la otra parte en un lapso no mayor a 5 (cinco) días hábiles siguientes al evento.`
  },
  {
    id: 'clausula-std-10',
    numero: 10,
    etiquetaNumero: 'DÉCIMA',
    nombre: 'Jurisdicción y Ley Aplicable',
    tipo: 'estandar',
    categoria: 'Marco Legal',
    requerida: true,
    seleccionadaPorDefecto: true,
    descripcionBreve: 'Somete el contrato a las leyes federales mexicanas y a los juzgados competentes de la Ciudad de México.',
    fundamentoLegal: 'Artículos 104 de la Constitución Política de los Estados Unidos Mexicanos y Código de Comercio',
    textoBase: `DÉCIMA. JURISDICCIÓN Y LEY APLICABLE.- Para la interpretación, ejecución y estricto cumplimiento del presente Contrato, las partes se someten de manera expresa e incondicional a la legislación civil y mercantil de los Estados Unidos Mexicanos y a la jurisdicción de los Tribunales Competentes de la Ciudad de México, renunciando de forma voluntaria a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.`
  }
];
