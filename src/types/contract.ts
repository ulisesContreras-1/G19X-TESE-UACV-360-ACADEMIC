/**
 * Tipos de datos del Motor Inteligente de Generación Automática de Contratos
 * NovaLex Tecnología Contractual S.A. de C.V. (Soluciones Digitales)
 * Identidad de demostración con fines ilustrativos de software.
 */

export type UserRole = 'GENERADOR' | 'EDITOR' | 'APROBADOR';

export interface UserSession {
  id: string;
  username: string;
  nombre: string;
  email: string;
  rol: UserRole;
  cargo: string;
}

export interface AuthSession {
  token: string;
  user: UserSession;
  expiresIn: number;
}

export type TipoPersona = 'MORAL' | 'FISICA';

export interface ClienteFiscal {
  id: string;
  razonSocial: string; // Razón Social o Nombre Completo
  rfc: string; // 12 para Moral, 13 para Física
  domicilioFiscal: string; // Dirección completa
  representanteLegal: string;
  cargo: string; // Cargo del Representante (ej: Apoderado Legal, Administrador Único)
  escritura: string; // Número de Escritura / Poder Notarial
  email: string;
  telefono?: string;
  esDemo?: boolean;
  fechaRegistro: string;
}

export type TipoClausula = 'estandar' | 'personalizada';

export interface Clausula {
  id: string;
  numero: number;
  nombre: string;
  etiquetaNumero: string; // ej: "PRIMERA", "SEGUNDA"
  textoBase: string; // Contenido con variables {{variable}}
  tipo: TipoClausula;
  categoria: string;
  requerida: boolean;
  seleccionadaPorDefecto: boolean;
  descripcionBreve: string;
  fundamentoLegal?: string; // Marco legal mexicano (Código Civil Federal, LFDA, LFPPI, etc.)
  fechaCreacion?: string;
}

export type EstadoContrato = 'BORRADOR' | 'EN_REVISION' | 'APROBADO';

export type FormaPago = 'Mensual' | 'Por entregable' | 'Única exhibición';

export interface VariablesContrato {
  fecha: string; // Fecha de firma
  objeto: string; // Descripción del servicio
  monto: number; // Monto en MXN
  forma_pago: FormaPago;
  vigencia_inicio: string; // YYYY-MM-DD
  vigencia_fin: string; // YYYY-MM-DD
  penalizacion: string; // e.g. "1% diario por cada día natural de retraso"
  lugar_firma?: string; // e.g. "Ciudad de México"
}

export interface RegistroHistorial {
  id: string;
  timestamp: string;
  usuario: string;
  rol: UserRole;
  accion: string;
  detalles?: string;
  estadoAnterior?: EstadoContrato;
  estadoNuevo?: EstadoContrato;
}

export interface Contrato {
  id: string;
  folio: string; // e.g. "PLURI-PSP-2026-001"
  clienteId: string;
  estado: EstadoContrato;
  fechaCreacion: string;
  fechaActualizacion: string;
  variables: VariablesContrato;
  clausulasSeleccionadas: string[]; // IDs de cláusulas incluidas
  textoGenerado: string;
  creadoPor: string;
  editadoPor?: string;
  aprobadoPor?: string;
  motivoRechazo?: string;
  historial: RegistroHistorial[];
  esDemo?: boolean;
}

export interface EmpresaNovaLex {
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  domicilioFiscal: string;
  representanteLegal: string;
  cargoRepresentante: string;
  escrituraPublica: string;
  notario: string;
  folioMercantil: string;
  telefono: string;
  email: string;
  sector: string;
  giro: string;
  esDemostracion?: boolean;
}

export type EmpresaPluriOne = EmpresaNovaLex;
