import { ClienteFiscal, Clausula, Contrato, EstadoContrato, UserRole, UserSession, VariablesContrato, AuthSession } from '../types/contract';
import { CLIENTES_INICIALES, CONTRATOS_INICIALES, DEMO_USERS, EMPRESA_NOVALEX } from '../data/initialDemoData';
import { CLAUSULAS_ESTANDAR } from '../data/standardClauses';
import { ensamblarBorradorContrato } from './contractEngine';

const STORAGE_KEYS = {
  TOKEN: 'novalex_auth_token_v1',
  USER: 'novalex_auth_user_v1',
  CLIENTES: 'novalex_mvp_clientes_v1',
  CLAUSULAS: 'novalex_mvp_clausulas_v1',
  CONTRATOS: 'novalex_mvp_contratos_v1',
  ACTIVE_ROLE: 'novalex_mvp_active_role_v1'
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export class StorageService {
  /**
   * Inicializa la memoria local y dispara la sincronización transparente
   * con el backend FastAPI y PostgreSQL.
   */
  static init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTES)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(CLIENTES_INICIALES));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CLAUSULAS)) {
      localStorage.setItem(STORAGE_KEYS.CLAUSULAS, JSON.stringify(CLAUSULAS_ESTANDAR));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CONTRATOS)) {
      // Pre-ensamblar textos demo iniciales como respaldo local
      const contratosConTexto = CONTRATOS_INICIALES.map(cnt => {
        const cliente = CLIENTES_INICIALES.find(c => c.id === cnt.clienteId) || CLIENTES_INICIALES[0];
        const textoEnsamblado = ensamblarBorradorContrato(
          EMPRESA_NOVALEX,
          cliente,
          cnt.variables,
          CLAUSULAS_ESTANDAR,
          cnt.clausulasSeleccionadas
        );
        return {
          ...cnt,
          textoGenerado: textoEnsamblado
        };
      });
      localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(contratosConTexto));
    }
  }

  // ==========================================================================
  // Manejo de Sesión, Token JWT y Autenticación Real
  // ==========================================================================

  static getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  static getAuthUser(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    const token = this.getAuthToken();
    const user = this.getAuthUser();
    return Boolean(token && user && user.id);
  }

  static getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static handleUnauthorized(mensaje?: string): void {
    const msg = mensaje || 'Tu sesión ha expirado o las credenciales no son válidas. Por favor, inicia sesión nuevamente.';
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
    window.dispatchEvent(new CustomEvent('novalex_auth_expired', {
      detail: { message: msg }
    }));
  }

  /**
   * Inicia sesión contra POST /api/v1/auth/login
   */
  static async login(username: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      let mensajeError = 'Credenciales incorrectas o cuenta deshabilitada.';
      try {
        const errorJson = await res.json();
        if (errorJson.detail) mensajeError = errorJson.detail;
      } catch {
        // Fallback
      }
      throw new Error(mensajeError);
    }

    const data = await res.json();
    const authSession: AuthSession = {
      token: data.access_token,
      user: data.user,
      expiresIn: data.expires_in
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, authSession.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authSession.user));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, authSession.user.rol);

    return authSession;
  }

  /**
   * Cierra la sesión activa localmente y notifica al backend.
   */
  static async logout(): Promise<void> {
    const token = this.getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {
        // Cierre local garantizado incluso ante fallo de red
      }
    }
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
  }

  static getActiveRole(): UserRole {
    const user = this.getAuthUser();
    if (user && user.rol) {
      return user.rol;
    }
    return 'GENERADOR';
  }

  static getCurrentUser(): UserSession {
    const user = this.getAuthUser();
    if (user) {
      return user;
    }
    return DEMO_USERS.GENERADOR;
  }

  // ==========================================================================
  // Sincronización con PostgreSQL vía FastAPI
  // ==========================================================================

  static async sincronizarConBackend(): Promise<{ clientes: ClienteFiscal[]; clausulas: Clausula[]; contratos: Contrato[] }> {
    if (!this.isAuthenticated()) {
      return {
        clientes: this.getClientes(),
        clausulas: this.getClausulas(),
        contratos: this.getContratos()
      };
    }

    try {
      const headers = this.getAuthHeaders();
      const [resCli, resCls, resCnt] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/clientes`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/clausulas`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/contratos`, { headers }).catch(() => null)
      ]);

      if (resCli && resCli.status === 401) {
        this.handleUnauthorized();
        return {
          clientes: this.getClientes(),
          clausulas: this.getClausulas(),
          contratos: this.getContratos()
        };
      }

      if (resCli && resCli.ok) {
        const dataCli: ClienteFiscal[] = await resCli.json();
        if (Array.isArray(dataCli) && dataCli.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(dataCli));
        }
      }

      if (resCls && resCls.ok) {
        const dataCls: Clausula[] = await resCls.json();
        if (Array.isArray(dataCls) && dataCls.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CLAUSULAS, JSON.stringify(dataCls));
        }
      }

      if (resCnt && resCnt.ok) {
        const dataCnt: Contrato[] = await resCnt.json();
        if (Array.isArray(dataCnt)) {
          localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(dataCnt));
        }
      }
    } catch (err) {
      console.warn('[StorageService] Servidor FastAPI no disponible; utilizando datos de respaldo local.', err);
    }

    return {
      clientes: this.getClientes(),
      clausulas: this.getClausulas(),
      contratos: this.getContratos()
    };
  }

  // --- Clientes ---
  static getClientes(): ClienteFiscal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTES);
      return data ? JSON.parse(data) : CLIENTES_INICIALES;
    } catch {
      return CLIENTES_INICIALES;
    }
  }

  static async guardarCliente(cliente: ClienteFiscal): Promise<ClienteFiscal> {
    const clientes = this.getClientes();
    const index = clientes.findIndex(c => c.id === cliente.id);
    if (index >= 0) {
      clientes[index] = cliente;
    } else {
      clientes.unshift(cliente);
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clientes`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cliente)
      });

      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Permiso denegado para registrar clientes.');
      }
      if (res.ok) {
        const guardado: ClienteFiscal = await res.json();
        const idx = clientes.findIndex(c => c.id === cliente.id || c.id === guardado.id);
        if (idx >= 0) clientes[idx] = guardado;
        else clientes.unshift(guardado);
        localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
        return guardado;
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('Permiso denegado') || e.message.includes('Sesión expirada'))) {
        throw e;
      }
      console.warn('[StorageService] Cliente persistido en cache local; backend no alcanzado.', e);
    }

    return cliente;
  }

  // --- Cláusulas ---
  static getClausulas(): Clausula[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLAUSULAS);
      return data ? JSON.parse(data) : CLAUSULAS_ESTANDAR;
    } catch {
      return CLAUSULAS_ESTANDAR;
    }
  }

  static async guardarClausula(clausula: Clausula): Promise<Clausula> {
    const clausulas = this.getClausulas();
    const index = clausulas.findIndex(c => c.id === clausula.id);
    if (index >= 0) {
      clausulas[index] = clausula;
    } else {
      clausulas.push(clausula);
    }
    localStorage.setItem(STORAGE_KEYS.CLAUSULAS, JSON.stringify(clausulas));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clausulas`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          id: clausula.id,
          nombre: clausula.nombre,
          textoBase: clausula.textoBase,
          categoria: clausula.categoria,
          requerida: clausula.requerida
        })
      });

      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Permiso denegado: Tu rol no permite gestionar cláusulas.');
      }
      if (res.ok) {
        const guardada: Clausula = await res.json();
        const idx = clausulas.findIndex(c => c.id === clausula.id || c.id === guardada.id);
        if (idx >= 0) clausulas[idx] = guardada;
        localStorage.setItem(STORAGE_KEYS.CLAUSULAS, JSON.stringify(clausulas));
        return guardada;
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('Permiso denegado') || e.message.includes('Sesión expirada'))) {
        throw e;
      }
      console.warn('[StorageService] Cláusula guardada en cache local; backend no alcanzado.', e);
    }

    return clausula;
  }

  // --- Contratos ---
  static getContratos(): Contrato[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTRATOS);
      return data ? JSON.parse(data) : CONTRATOS_INICIALES;
    } catch {
      return CONTRATOS_INICIALES;
    }
  }

  static getContratoById(id: string): Contrato | undefined {
    return this.getContratos().find(c => c.id === id);
  }

  static getContractById(id: string): Contrato | undefined {
    return this.getContratoById(id);
  }

  /**
   * Genera un contrato invocando a Ollama y persistiendo en PostgreSQL
   */
  static async generarContratoBackend(solicitud: {
    clienteId: string;
    variables: VariablesContrato;
    clausulasIds: string[];
    creadoPor?: string;
  }): Promise<Contrato> {
    const res = await fetch(`${API_BASE_URL}/api/v1/contratos/generar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        cliente_id: solicitud.clienteId,
        variables: solicitud.variables,
        clausulas_ids: solicitud.clausulasIds,
        creado_por: solicitud.creadoPor || 'usr-gen-01'
      })
    });

    if (res.status === 401) {
      this.handleUnauthorized();
      throw new Error('Sesión expirada o no válida. Inicia sesión como Generador.');
    }
    if (res.status === 403) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Permiso denegado: Únicamente el rol Generador puede generar contratos.');
    }

    if (!res.ok) {
      let mensajeError = 'Error al generar contrato con el motor de IA.';
      try {
        const errorJson = await res.json();
        if (errorJson.detail) mensajeError = errorJson.detail;
      } catch {
        // Fallback
      }
      throw new Error(mensajeError);
    }

    const dataGen = await res.json();
    const nuevoId = dataGen.id;

    // Consultar el contrato completo generado en PostgreSQL
    const resDetalle = await fetch(`${API_BASE_URL}/api/v1/contratos/${nuevoId}`, {
      headers: this.getAuthHeaders()
    });
    if (resDetalle.ok) {
      const contratoCompleto: Contrato = await resDetalle.json();
      const contratos = this.getContratos();
      contratos.unshift(contratoCompleto);
      localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(contratos));
      return contratoCompleto;
    }

    // Fallback con datos devueltos por el endpoint de generación
    const currentUser = this.getCurrentUser();
    const contratoFallback: Contrato = {
      id: nuevoId,
      folio: dataGen.folio,
      clienteId: solicitud.clienteId,
      estado: 'BORRADOR',
      fechaCreacion: dataGen.creado_en || new Date().toISOString(),
      fechaActualizacion: dataGen.creado_en || new Date().toISOString(),
      variables: solicitud.variables,
      clausulasSeleccionadas: solicitud.clausulasIds,
      textoGenerado: dataGen.texto_generado,
      creadoPor: currentUser.nombre,
      historial: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          usuario: currentUser.nombre,
          rol: currentUser.rol,
          accion: 'Generación con Ollama (Llama 3.1 8B)'
        }
      ]
    };

    const contratos = this.getContratos();
    contratos.unshift(contratoFallback);
    localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(contratos));
    return contratoFallback;
  }

  static async guardarTextoContrato(contratoId: string, textoGenerado: string): Promise<Contrato | null> {
    const contrato = this.getContratoById(contratoId);
    if (contrato) {
      contrato.textoGenerado = textoGenerado;
      contrato.fechaActualizacion = new Date().toISOString();
      this.guardarContratoLocal(contrato);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/contratos/${contratoId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ textoGenerado })
      });

      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error('Sesión expirada. Inicia sesión nuevamente.');
      }
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Permiso denegado: No tienes autorización para modificar este contrato.');
      }
      if (res.ok) {
        const actualizado: Contrato = await res.json();
        this.guardarContratoLocal(actualizado);
        return actualizado;
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('Permiso denegado') || e.message.includes('Sesión expirada'))) {
        throw e;
      }
      console.warn('[StorageService] Texto actualizado en cache local; backend no alcanzado.', e);
    }

    return contrato || null;
  }

  static guardarContrato(contrato: Contrato): Contrato {
    return this.guardarContratoLocal(contrato);
  }

  private static guardarContratoLocal(contrato: Contrato): Contrato {
    const contratos = this.getContratos();
    const index = contratos.findIndex(c => c.id === contrato.id);
    if (index >= 0) {
      contratos[index] = {
        ...contrato,
        fechaActualizacion: new Date().toISOString()
      };
    } else {
      contratos.unshift(contrato);
    }
    localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(contratos));
    return contrato;
  }

  static async actualizarEstadoContrato(
    contratoId: string,
    nuevoEstado: EstadoContrato,
    usuario: UserSession,
    detalles?: string,
    motivoRechazo?: string
  ): Promise<Contrato | null> {
    // 1. Actualización local anticipada
    const contrato = this.getContratoById(contratoId);
    if (contrato) {
      const estadoAnterior = contrato.estado;
      contrato.estado = nuevoEstado;
      contrato.fechaActualizacion = new Date().toISOString();

      if (nuevoEstado === 'EN_REVISION') {
        contrato.motivoRechazo = undefined;
      } else if (nuevoEstado === 'APROBADO') {
        contrato.aprobadoPor = usuario.nombre;
        contrato.motivoRechazo = undefined;
      } else if (nuevoEstado === 'BORRADOR' && motivoRechazo) {
        contrato.motivoRechazo = motivoRechazo;
      }

      if (usuario.rol === 'EDITOR') {
        contrato.editadoPor = usuario.nombre;
      }

      contrato.historial.push({
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        usuario: usuario.nombre,
        rol: usuario.rol,
        accion: nuevoEstado === 'APROBADO' 
          ? 'Aprobación definitiva de contrato'
          : nuevoEstado === 'EN_REVISION'
            ? 'Envío formal a revisión'
            : motivoRechazo 
              ? 'Rechazo de contrato con solicitud de correcciones'
              : 'Actualización de borrador',
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        detalles: motivoRechazo ? `Motivo: ${motivoRechazo}` : detalles
      });

      this.guardarContratoLocal(contrato);
    }

    // 2. Persistencia en PostgreSQL con validación estricta de rol por JWT
    try {
      const headers = this.getAuthHeaders();
      headers['X-User-Role'] = usuario.rol;

      const res = await fetch(`${API_BASE_URL}/api/v1/contratos/${contratoId}/estado`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nuevoEstado,
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          rol: usuario.rol,
          detalles,
          motivoRechazo
        })
      });

      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error('Sesión expirada o no autorizada. Por favor inicia sesión.');
      }

      if (res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Permiso denegado: Acción no permitida para tu rol.');
      }

      if (res.ok) {
        const contratoPersistido: Contrato = await res.json();
        this.guardarContratoLocal(contratoPersistido);
        return contratoPersistido;
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.detail) {
          throw new Error(errJson.detail);
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error sincronizando estado con backend:', e);
      throw e;
    }

    return contrato || null;
  }

  /**
   * Descarga el PDF generado por WeasyPrint en FastAPI.
   */
  static async descargarPDF(contratoId: string, folio: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/contratos/${contratoId}/pdf`, {
        headers: this.getAuthHeaders()
      });
      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error('Sesión expirada. Inicia sesión nuevamente.');
      }
      if (!res.ok) throw new Error(`Error ${res.status} al generar PDF en el servidor.`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folio}_CONTRATO_NOVALEX.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[StorageService] Error descargando PDF:', e);
      throw e;
    }
  }
}
