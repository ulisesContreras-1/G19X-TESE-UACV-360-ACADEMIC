import React, { useState } from 'react';
import { ClienteFiscal, UserRole } from '../types/contract';
import { validateMexicanRFC } from '../services/contractEngine';
import { StorageService } from '../services/storageService';

interface ClientsModuleProps {
  clientes: ClienteFiscal[];
  activeRole: UserRole;
  onClientAdded: (cliente: ClienteFiscal) => void;
  onClientUpdated: (cliente: ClienteFiscal) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  clientes,
  activeRole,
  onClientAdded,
  onClientUpdated
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<ClienteFiscal | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Form state
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [domicilioFiscal, setDomicilioFiscal] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [cargo, setCargo] = useState('Apoderado Legal');
  const [escritura, setEscritura] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // Validaciones
  const [errores, setErrores] = useState<Record<string, string>>({});

  const abrirModalNuevo = () => {
    setClienteEnEdicion(null);
    setRazonSocial('');
    setRfc('');
    setDomicilioFiscal('');
    setRepresentanteLegal('');
    setCargo('Apoderado Legal y Representante');
    setEscritura('');
    setEmail('');
    setTelefono('');
    setErrores({});
    setModalAbierto(true);
  };

  const abrirModalEditar = (cliente: ClienteFiscal) => {
    setClienteEnEdicion(cliente);
    setRazonSocial(cliente.razonSocial);
    setRfc(cliente.rfc);
    setDomicilioFiscal(cliente.domicilioFiscal);
    setRepresentanteLegal(cliente.representanteLegal);
    setCargo(cliente.cargo);
    setEscritura(cliente.escritura);
    setEmail(cliente.email);
    setTelefono(cliente.telefono || '');
    setErrores({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setClienteEnEdicion(null);
  };

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {};

    if (!razonSocial.trim()) {
      nuevosErrores.razonSocial = 'La Razón Social o Denominación es requerida';
    }

    const valRFC = validateMexicanRFC(rfc);
    if (!valRFC.isValid) {
      nuevosErrores.rfc = valRFC.error || 'RFC inválido según formato SAT';
    }

    if (!domicilioFiscal.trim()) {
      nuevosErrores.domicilioFiscal = 'El domicilio fiscal completo es requerido';
    }

    if (!representanteLegal.trim()) {
      nuevosErrores.representanteLegal = 'El nombre del Representante Legal es requerido';
    }

    if (!cargo.trim()) {
      nuevosErrores.cargo = 'El cargo del representante es requerido';
    }

    if (!escritura.trim()) {
      nuevosErrores.escritura = 'El número de escritura notarial o poder es requerido';
    }

    if (!email.trim()) {
      nuevosErrores.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nuevosErrores.email = 'Formato de correo electrónico inválido';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const valRFC = validateMexicanRFC(rfc);

    const datosCliente: ClienteFiscal = {
      id: clienteEnEdicion ? clienteEnEdicion.id : `cli-${Date.now()}`,
      razonSocial: razonSocial.trim(),
      rfc: rfc.trim().toUpperCase(),
      domicilioFiscal: domicilioFiscal.trim(),
      representanteLegal: representanteLegal.trim(),
      cargo: cargo.trim(),
      escritura: escritura.trim(),
      email: email.trim(),
      telefono: telefono.trim() || undefined,
      esDemo: clienteEnEdicion ? clienteEnEdicion.esDemo : false,
      fechaRegistro: clienteEnEdicion ? clienteEnEdicion.fechaRegistro : new Date().toISOString().split('T')[0]
    };

    const guardado = await StorageService.guardarCliente(datosCliente);

    if (clienteEnEdicion) {
      onClientUpdated(guardado);
    } else {
      onClientAdded(guardado);
    }

    cerrarModal();
  };

  // Filtrado
  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      c.razonSocial.toLowerCase().includes(q) ||
      c.rfc.toLowerCase().includes(q) ||
      c.representanteLegal.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catálogo de Clientes Fiscales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro y validación de datos fiscales mexicanos para vinculación contractual (RF-01, RF-02).
          </p>
        </div>

        <div>
          {activeRole === 'GENERADOR' ? (
            <button
              onClick={abrirModalNuevo}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              + Registrar Nuevo Cliente
            </button>
          ) : (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              Solo Generador puede dar de alta clientes
            </span>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="w-full sm:w-96">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por Razón Social, RFC o Representante..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {clientesFiltrados.length} clientes registrados
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Razón Social / Denominación</th>
                <th className="py-3 px-4">RFC</th>
                <th className="py-3 px-4">Representante Legal</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Poder Notarial / Escritura</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No se encontraron clientes registrados con ese criterio.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {cliente.razonSocial}
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate" title={cliente.domicilioFiscal}>
                        {cliente.domicilioFiscal}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {cliente.rfc}
                      <span className="block text-[10px] text-slate-400 font-sans">
                        {cliente.rfc.length === 12 ? 'Persona Moral' : 'Persona Física'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium text-slate-900">{cliente.representanteLegal}</div>
                      <div className="text-[11px] text-slate-500">{cliente.cargo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div>{cliente.email}</div>
                      {cliente.telefono && (
                        <div className="text-[11px] text-slate-400">{cliente.telefono}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={cliente.escritura}>
                      {cliente.escritura}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {activeRole === 'GENERADOR' ? (
                        <button
                          onClick={() => abrirModalEditar(cliente)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Lectura</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro / Edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {clienteEnEdicion ? 'Editar Cliente Fiscal' : 'Registrar Nuevo Cliente'}
                </h2>
                <p className="text-xs text-slate-500">
                  Captura de datos requeridos para el proemio y declaraciones del contrato (PRD 4.1).
                </p>
              </div>
              <button
                onClick={cerrarModal}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              {/* Razón Social */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social / Denominación <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Logística y Soluciones Digitales S.A. de C.V."
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                    errores.razonSocial ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
                {errores.razonSocial && (
                  <p className="text-[11px] text-rose-500 mt-1">{errores.razonSocial}</p>
                )}
              </div>

              {/* RFC */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RFC (Registro Federal de Contribuyentes) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  placeholder="12 caracteres (Moral) o 13 caracteres (Física)"
                  className={`w-full px-3 py-2 text-xs font-mono bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                    errores.rfc ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
                {errores.rfc ? (
                  <p className="text-[11px] text-rose-500 mt-1">{errores.rfc}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Validación SAT: Formato de clave alfanumérica, fecha y homoclave.
                  </p>
                )}
              </div>

              {/* Domicilio Fiscal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Domicilio Fiscal Completo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={domicilioFiscal}
                  onChange={(e) => setDomicilioFiscal(e.target.value)}
                  placeholder="Calle, Número Exterior e Interior, Colonia, Alcaldía o Municipio, Estado y C.P."
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                    errores.domicilioFiscal ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
                {errores.domicilioFiscal && (
                  <p className="text-[11px] text-rose-500 mt-1">{errores.domicilioFiscal}</p>
                )}
              </div>

              {/* Representante Legal y Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Representante Legal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={representanteLegal}
                    onChange={(e) => setRepresentanteLegal(e.target.value)}
                    placeholder="Nombre completo del apoderado"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                      errores.representanteLegal ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                    }`}
                  />
                  {errores.representanteLegal && (
                    <p className="text-[11px] text-rose-500 mt-1">{errores.representanteLegal}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo del Representante <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Administrador Único / Apoderado Legal"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                      errores.cargo ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                    }`}
                  />
                  {errores.cargo && (
                    <p className="text-[11px] text-rose-500 mt-1">{errores.cargo}</p>
                  )}
                </div>
              </div>

              {/* Escritura o Poder Notarial */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Escritura / Poder Notarial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={escritura}
                  onChange={(e) => setEscritura(e.target.value)}
                  placeholder="Ej: Escritura Pública No. 24,190 del Libro 45, Notaría 34 de la CDMX"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                    errores.escritura ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                  }`}
                />
                {errores.escritura && (
                  <p className="text-[11px] text-rose-500 mt-1">{errores.escritura}</p>
                )}
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo de Contacto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                      errores.email ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 focus:ring-1 focus:ring-slate-900'
                    }`}
                  />
                  {errores.email && (
                    <p className="text-[11px] text-rose-500 mt-1">{errores.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="55 1234 5678"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {clienteEnEdicion ? 'Actualizar Cliente' : 'Guardar Cliente Fiscal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
