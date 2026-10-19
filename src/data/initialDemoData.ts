import { ClienteFiscal, Contrato, EmpresaNovaLex, UserSession } from '../types/contract';

/**
 * Identidad Corporativa Ficticia de Demostración
 * NOTA: Entidad y datos creados exclusivamente con fines ilustrativos de software.
 * No corresponde a un registro fiscal real ante el SAT.
 */
export const EMPRESA_NOVALEX: EmpresaNovaLex = {
  razonSocial: 'NovaLex Tecnología Contractual S.A. de C.V.',
  nombreComercial: 'Soluciones Digitales',
  rfc: 'NTC260101AB1',
  domicilioFiscal: 'Av. Insurgentes Sur 1602 Piso 4, Col. Crédito Constructor, Alcaldía Benito Juárez, C.P. 03940, Ciudad de México (Demostración)',
  representanteLegal: 'Lic. Claudia Sandoval Ortega',
  cargoRepresentante: 'Apoderada Legal y Directora General',
  escrituraPublica: 'Póliza Mercantil No. 12,345 ante la fe de la Correduría Pública No. 80 de la Ciudad de México (Ficticia / Demostración)',
  notario: 'Correduría Pública No. 80 de la Ciudad de México',
  folioMercantil: 'N-202601019999',
  telefono: '55 5555 0199',
  email: 'contacto@novalex.example.com',
  sector: 'Privado | Tecnología Contractual (Demostración)',
  giro: 'Soluciones Digitales, Consultoría Tecnológica y Automatización Contractual',
  esDemostracion: true
};

// Alias de compatibilidad
export const EMPRESA_PLURIONE = EMPRESA_NOVALEX;

export const DEMO_USERS: Record<string, UserSession> = {
  GENERADOR: {
    id: 'usr-gen-01',
    username: 'uacontreras',
    nombre: 'Valeria Ramos Peña',
    email: 'valeria.ramos@example.com',
    rol: 'GENERADOR',
    cargo: 'Ingeniera de Soluciones Contractuales'
  },
  EDITOR: {
    id: 'usr-edit-02',
    username: 'elozano',
    nombre: 'Eduardo Lozano Mora',
    email: 'eduardo.lozano@example.com',
    rol: 'EDITOR',
    cargo: 'Revisor Jurídico de Contratos'
  },
  APROBADOR: {
    id: 'usr-aprob-03',
    username: 'jmorales',
    nombre: 'Javier Morales Hinojosa',
    email: 'javier.morales@example.com',
    rol: 'APROBADOR',
    cargo: 'Director de Operaciones Legales'
  }
};

export const CLIENTES_INICIALES: ClienteFiscal[] = [
  {
    id: 'cli-001',
    razonSocial: 'Logística Integral Quantum S.A. de C.V.',
    rfc: 'LIQ180425AB1',
    domicilioFiscal: 'Av. Insurgentes Sur 1200 Piso 5, Col. Del Valle, Benito Juárez, Ciudad de México, C.P. 03100 (Demostración)',
    representanteLegal: 'Ing. Fernando Barrientos Ochoa',
    cargo: 'Director General y Apoderado Legal',
    escritura: 'Escritura Pública No. 24,190 del Libro 45, Notaría Pública No. 34 de la Ciudad de México (Ficticia)',
    email: 'contacto@logistica-quantum.example.com',
    telefono: '55 5555 0120',
    esDemo: true,
    fechaRegistro: '2026-09-18'
  },
  {
    id: 'cli-002',
    razonSocial: 'Distribuidora Nexus Farma S.A.P.I. de C.V.',
    rfc: 'DNF140912CD2',
    domicilioFiscal: 'Calzada de Tlalpan 2148, Col. Campestre Churubusco, Coyoacán, Ciudad de México, C.P. 04200 (Demostración)',
    representanteLegal: 'Lic. Mariana Soto Castro',
    cargo: 'Representante Legal y Directora de Operaciones',
    escritura: 'Póliza Mercantil No. 8,921 ante Correduría Pública No. 51 de la Ciudad de México (Ficticia)',
    email: 'contacto@nexusfarma.example.com',
    telefono: '55 5555 0140',
    esDemo: true,
    fechaRegistro: '2026-09-22'
  },
  {
    id: 'cli-003',
    razonSocial: 'Roberto Garza Salinas',
    rfc: 'GASR820514U82',
    domicilioFiscal: 'Av. Paseo de la Reforma 450 Piso 8, Cuauhtémoc, Ciudad de México, C.P. 06600 (Demostración)',
    representanteLegal: 'Roberto Garza Salinas',
    cargo: 'Persona Física con Actividad Empresarial (Demostración)',
    escritura: 'Constancia de Situación Fiscal y Poder Notarial No. 12,300 de la CDMX (Ficticia)',
    email: 'roberto.garza@rgs-tech.example.com',
    telefono: '55 5555 0180',
    esDemo: true,
    fechaRegistro: '2026-09-28'
  }
];

export const CONTRATOS_INICIALES: Contrato[] = [
  {
    id: 'cnt-001',
    folio: 'NOVA-PSP-2026-001',
    clienteId: 'cli-001',
    estado: 'BORRADOR',
    fechaCreacion: '2026-09-29T10:15:00Z',
    fechaActualizacion: '2026-09-29T11:30:00Z',
    creadoPor: 'Valeria Ramos Peña',
    esDemo: true,
    variables: {
      fecha: '2026-10-05',
      lugar_firma: 'Ciudad de México',
      objeto: 'Consultoría especializada y desarrollo de módulos de optimización logística, arquitectura de integración de microservicios e impartición de programa de capacitación técnica para personal de infraestructura TI.',
      monto: 348000,
      forma_pago: 'Por entregable',
      vigencia_inicio: '2026-10-15',
      vigencia_fin: '2027-04-15',
      penalizacion: '1% (uno por ciento) diario por cada día natural de demora imputable a la entrega formal de cada hito'
    },
    clausulasSeleccionadas: [
      'clausula-std-1',
      'clausula-std-2',
      'clausula-std-3',
      'clausula-std-4',
      'clausula-std-5',
      'clausula-std-6',
      'clausula-std-7',
      'clausula-std-8',
      'clausula-std-9',
      'clausula-std-10'
    ],
    textoGenerado: '',
    historial: [
      {
        id: 'hist-1',
        timestamp: '2026-09-29T10:15:00Z',
        usuario: 'Valeria Ramos Peña',
        rol: 'GENERADOR',
        accion: 'Creación de borrador',
        detalles: 'Se capturaron datos iniciales con Logística Integral Quantum S.A. de C.V.'
      }
    ]
  },
  {
    id: 'cnt-002',
    folio: 'NOVA-PSP-2026-002',
    clienteId: 'cli-002',
    estado: 'EN_REVISION',
    fechaCreacion: '2026-09-25T14:00:00Z',
    fechaActualizacion: '2026-09-28T09:20:00Z',
    creadoPor: 'Valeria Ramos Peña',
    esDemo: true,
    variables: {
      fecha: '2026-10-02',
      lugar_firma: 'Ciudad de México',
      objeto: 'Servicios de consultoría y diseño de arquitectura cloud para el sistema de trazabilidad de distribución farmacéutica, incluyendo análisis de vulnerabilidades, refactorización de base de datos e implementación de pipeline CI/CD.',
      monto: 580000,
      forma_pago: 'Mensual',
      vigencia_inicio: '2026-10-10',
      vigencia_fin: '2027-04-10',
      penalizacion: '0.75% (cero punto setenta y cinco por ciento) semanal sobre el valor de la mensualidad en curso'
    },
    clausulasSeleccionadas: [
      'clausula-std-1',
      'clausula-std-2',
      'clausula-std-3',
      'clausula-std-4',
      'clausula-std-5',
      'clausula-std-6',
      'clausula-std-7',
      'clausula-std-8',
      'clausula-std-9',
      'clausula-std-10'
    ],
    textoGenerado: '',
    historial: [
      {
        id: 'hist-2a',
        timestamp: '2026-09-25T14:00:00Z',
        usuario: 'Valeria Ramos Peña',
        rol: 'GENERADOR',
        accion: 'Creación inicial',
        detalles: 'Borrador estructurado para Distribuidora Nexus Farma S.A.P.I. de C.V.'
      },
      {
        id: 'hist-2b',
        timestamp: '2026-09-28T09:20:00Z',
        usuario: 'Valeria Ramos Peña',
        rol: 'GENERADOR',
        accion: 'Envío a revisión',
        estadoAnterior: 'BORRADOR',
        estadoNuevo: 'EN_REVISION',
        detalles: 'Se solicita al Editor validar cláusula de entregables y confidencialidad.'
      }
    ]
  },
  {
    id: 'cnt-003',
    folio: 'NOVA-PSP-2026-003',
    clienteId: 'cli-003',
    estado: 'APROBADO',
    fechaCreacion: '2026-09-20T08:30:00Z',
    fechaActualizacion: '2026-09-27T17:45:00Z',
    creadoPor: 'Valeria Ramos Peña',
    editadoPor: 'Eduardo Lozano Mora',
    aprobadoPor: 'Javier Morales Hinojosa',
    esDemo: true,
    variables: {
      fecha: '2026-09-28',
      lugar_firma: 'Ciudad de México',
      objeto: 'Capacitación ejecutiva de alto nivel en ingeniería de prompts, evaluación de modelos de lenguaje y gobierno de datos para el equipo directivo y técnico de RGS Consulting.',
      monto: 165000,
      forma_pago: 'Única exhibición',
      vigencia_inicio: '2026-10-01',
      vigencia_fin: '2026-11-30',
      penalizacion: '1.5% diario en caso de retraso no justificado'
    },
    clausulasSeleccionadas: [
      'clausula-std-1',
      'clausula-std-2',
      'clausula-std-3',
      'clausula-std-4',
      'clausula-std-5',
      'clausula-std-6',
      'clausula-std-7',
      'clausula-std-8',
      'clausula-std-9',
      'clausula-std-10'
    ],
    textoGenerado: '',
    historial: [
      {
        id: 'hist-3a',
        timestamp: '2026-09-20T08:30:00Z',
        usuario: 'Valeria Ramos Peña',
        rol: 'GENERADOR',
        accion: 'Creación de contrato'
      },
      {
        id: 'hist-3b',
        timestamp: '2026-09-22T11:00:00Z',
        usuario: 'Valeria Ramos Peña',
        rol: 'GENERADOR',
        accion: 'Envío a revisión',
        estadoAnterior: 'BORRADOR',
        estadoNuevo: 'EN_REVISION'
      },
      {
        id: 'hist-3c',
        timestamp: '2026-09-24T16:15:00Z',
        usuario: 'Eduardo Lozano Mora',
        rol: 'EDITOR',
        accion: 'Revisión y visto bueno técnico',
        detalles: 'Se validó el alcance de la capacitación y términos de propiedad intelectual.'
      },
      {
        id: 'hist-3d',
        timestamp: '2026-09-27T17:45:00Z',
        usuario: 'Javier Morales Hinojosa',
        rol: 'APROBADOR',
        accion: 'Aprobación definitiva',
        estadoAnterior: 'EN_REVISION',
        estadoNuevo: 'APROBADO',
        detalles: 'Autorizado para emisión de PDF y firma formal de las partes.'
      }
    ]
  }
];
