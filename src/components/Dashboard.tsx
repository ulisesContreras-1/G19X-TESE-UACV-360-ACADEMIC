import React, { useState } from 'react';
import { Contrato, EstadoContrato, UserRole } from '../types/contract';
import { formatearMonedaMXN, formatearFechaLarga } from '../services/contractEngine';
import { StorageService } from '../services/storageService';

interface DashboardProps {
  contratos: Contrato[];
  activeRole: UserRole;
  onSelectContract: (contratoId: string) => void;
  onNavigateNew: () => void;
  onRefreshData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  contratos,
  activeRole,
  onSelectContract,
  onNavigateNew,
  onRefreshData
}) => {
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoContrato>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const clientes = StorageService.getClientes();

  // Métricas
  const totalContratos = contratos.length;
  const borradores = contratos.filter(c => c.estado === 'BORRADOR').length;
  const enRevision = contratos.filter(c => c.estado === 'EN_REVISION').length;
  const aprobados = contratos.filter(c => c.estado === 'APROBADO').length;

  const montoTotalContratado = contratos
    .filter(c => c.estado === 'APROBADO' || c.estado === 'EN_REVISION')
    .reduce((acc, c) => acc + (c.variables?.monto || 0), 0);

  // Filtrado de contratos
  const contratosFiltrados = contratos.filter(c => {
    const coincideEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
    const cliente = clientes.find(cl => cl.id === c.clienteId);
    const textoBusqueda = busqueda.toLowerCase().trim();

    const coincideBusqueda =
      !textoBusqueda ||
      c.folio.toLowerCase().includes(textoBusqueda) ||
      (cliente && cliente.razonSocial.toLowerCase().includes(textoBusqueda)) ||
      (cliente && cliente.rfc.toLowerCase().includes(textoBusqueda)) ||
      c.variables.objeto.toLowerCase().includes(textoBusqueda);

    return coincideEstado && coincideBusqueda;
  });

  const getCliente = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId);
  };

  const getEstadoLabel = (estado: EstadoContrato) => {
    switch (estado) {
      case 'BORRADOR':
        return {
          texto: 'Borrador',
          descripcion: 'En captura por Generador',
          color: 'text-amber-800 bg-amber-50 border-amber-200'
        };
      case 'EN_REVISION':
        return {
          texto: 'En revisión',
          descripcion: 'En validación por Editor',
          color: 'text-sky-800 bg-sky-50 border-sky-200'
        };
      case 'APROBADO':
        return {
          texto: 'Aprobado',
          descripcion: 'Listo para firma y PDF',
          color: 'text-emerald-800 bg-emerald-50 border-emerald-200'
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado y acción principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Control de Contratos Empresariales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Motor de generación de contratos de Prestación de Servicios Profesionales · NovaLex Tecnología Contractual S.A. de C.V.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeRole === 'GENERADOR' ? (
            <button
              onClick={onNavigateNew}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              + Nuevo Contrato
            </button>
          ) : (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              Modo {activeRole.toLowerCase()}: consulta y gestión
            </span>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Instrumentos
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {totalContratos}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Prestación de Servicios Profesionales
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Borradores
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono tabular-nums">
            {borradores}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Pendientes de envío por Generador
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            En Revisión
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-2 font-mono tabular-nums">
            {enRevision}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Revisión jurídica activa por Editor
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Aprobados & Formalizados
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {aprobados}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Total activo: {formatearMonedaMXN(montoTotalContratado)}
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtro segmentado interactivo */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              filtroEstado === 'TODOS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({totalContratos})
          </button>
          <button
            onClick={() => setFiltroEstado('BORRADOR')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              filtroEstado === 'BORRADOR'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Borrador ({borradores})
          </button>
          <button
            onClick={() => setFiltroEstado('EN_REVISION')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              filtroEstado === 'EN_REVISION'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En revisión ({enRevision})
          </button>
          <button
            onClick={() => setFiltroEstado('APROBADO')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              filtroEstado === 'APROBADO'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aprobado ({aprobados})
          </button>
        </div>

        {/* Input de búsqueda rápida */}
        <div className="w-full md:w-80">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio, cliente, RFC u objeto..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Tabla de Contratos */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Cliente / Razón Social</th>
                <th className="py-3 px-4">Honorarios (MXN)</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No se encontraron contratos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((contrato) => {
                  const cliente = getCliente(contrato.clienteId);
                  const estadoInfo = getEstadoLabel(contrato.estado);

                  return (
                    <tr
                      key={contrato.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {contrato.folio}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {cliente?.razonSocial || 'Cliente no localizado'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          RFC: {cliente?.rfc || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                        {formatearMonedaMXN(contrato.variables.monto)}
                        <span className="block text-[11px] font-sans text-slate-500 font-normal">
                          {contrato.variables.forma_pago}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div>
                          {contrato.variables.vigencia_inicio} a {contrato.variables.vigencia_fin}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Firma: {formatearFechaLarga(contrato.variables.fecha)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${estadoInfo.color}`}>
                          {estadoInfo.texto}
                        </span>
                        {contrato.motivoRechazo && (
                          <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={contrato.motivoRechazo}>
                            Obs: {contrato.motivoRechazo}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectContract(contrato.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          {contrato.estado === 'APROBADO'
                            ? 'Ver y Descargar'
                            : activeRole === 'EDITOR'
                              ? 'Revisar Borrador'
                              : 'Abrir Editor'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
