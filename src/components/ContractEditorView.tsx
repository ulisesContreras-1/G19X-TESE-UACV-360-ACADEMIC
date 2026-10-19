import React, { useState } from 'react';
import { Contrato, EstadoContrato, UserRole } from '../types/contract';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';
import { formatearMonedaMXN, formatearFechaLarga, generarPayloadFastAPI } from '../services/contractEngine';
import { StorageService } from '../services/storageService';

interface ContractEditorViewProps {
  contratoId: string;
  activeRole: UserRole;
  onBack: () => void;
  onPrintPreview: (contratoId: string) => void;
  onContractUpdated: () => void;
}

export const ContractEditorView: React.FC<ContractEditorViewProps> = ({
  contratoId,
  activeRole,
  onBack,
  onPrintPreview,
  onContractUpdated
}) => {
  const contrato = StorageService.getContractById(contratoId);
  const clientes = StorageService.getClientes();
  const cliente = clientes.find(c => c.id === contrato?.clienteId);

  // Tab activo: 'LECTURA_FORMAL' | 'EDITOR_TEXTO' | 'PAYLOAD_FASTAPI' | 'HISTORIAL'
  const [tabModo, setTabModo] = useState<'LECTURA' | 'EDITOR' | 'FASTAPI' | 'HISTORIAL'>('LECTURA');
  
  // Texto editable
  const [textoEditable, setTextoEditable] = useState<string>(contrato?.textoGenerado || '');
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Modal de Rechazo
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  if (!contrato || !cliente) {
    return (
      <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
        <p className="text-slate-600">No se encontró el contrato seleccionado.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
        >
          Regresar al Dashboard
        </button>
      </div>
    );
  }

  // Permisos según el rol y el estado actual (PRD 4.4, 4.5)
  // Generador: Borrador -> Enviar a revisión
  // Editor: En revisión -> Puede editar texto y rechazar a Borrador con observaciones (NO aprueba)
  // Aprobador: Aprobación final formal o rechazar a Borrador; descarga de PDF
  const puedeEditarTexto =
    (activeRole === 'GENERADOR' && contrato.estado === 'BORRADOR') ||
    (activeRole === 'EDITOR' && contrato.estado === 'EN_REVISION');

  const puedeEnviarARevision =
    activeRole === 'GENERADOR' && contrato.estado === 'BORRADOR';

  const puedeRechazarEditor =
    activeRole === 'EDITOR' && contrato.estado === 'EN_REVISION';

  const puedeAprobacionFinal =
    activeRole === 'APROBADOR' && contrato.estado === 'EN_REVISION';

  const puedeDescargarPDF =
    contrato.estado === 'APROBADO' || activeRole === 'APROBADOR' || activeRole === 'EDITOR';

  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleGuardarTexto = async () => {
    try {
      contrato.textoGenerado = textoEditable;
      contrato.fechaActualizacion = new Date().toISOString();
      await StorageService.guardarTextoContrato(contrato.id, textoEditable);
      setGuardadoExitoso(true);
      setErrorFeedback(null);
      setTimeout(() => setGuardadoExitoso(false), 2500);
      onContractUpdated();
    } catch (err: any) {
      setErrorFeedback(err.message || 'Error al guardar modificaciones en el contrato.');
    }
  };

  const handleEnviarARevision = async () => {
    if (window.confirm('¿Confirmas el envío de este borrador a revisión jurídica por el Editor?')) {
      try {
        const user = StorageService.getCurrentUser();
        await StorageService.actualizarEstadoContrato(
          contrato.id,
          'EN_REVISION',
          user,
          'Envío formal por el Generador para validación técnica de cláusulas.'
        );
        setErrorFeedback(null);
        onContractUpdated();
      } catch (err: any) {
        setErrorFeedback(err.message || 'Error al enviar a revisión.');
      }
    }
  };

  const handleAprobacionFinalAprobador = async () => {
    if (window.confirm('¿Autorizas formalmente el presente contrato de Prestación de Servicios?')) {
      try {
        const user = StorageService.getCurrentUser();
        await StorageService.actualizarEstadoContrato(
          contrato.id,
          'APROBADO',
          user,
          'Autorización ejecutiva concedida por Aprobador. Listo para firma de partes.'
        );
        setErrorFeedback(null);
        onContractUpdated();
      } catch (err: any) {
        setErrorFeedback(err.message || 'Error al autorizar el contrato.');
      }
    }
  };

  const handleConfirmarRechazo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoRechazo.trim()) return;

    const user = StorageService.getCurrentUser();
    await StorageService.actualizarEstadoContrato(
      contrato.id,
      'BORRADOR',
      user,
      undefined,
      motivoRechazo.trim()
    );
    setModalRechazoAbierto(false);
    setMotivoRechazo('');
    onContractUpdated();
  };

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(contrato.textoGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const payloadFastAPI = generarPayloadFastAPI(
    EMPRESA_NOVALEX,
    cliente,
    contrato.variables,
    contrato.clausulasSeleccionadas
  );

  return (
    <div className="space-y-6">
      {/* Barra superior con navegación y acciones del flujo */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md cursor-pointer transition-colors"
          >
            ← Volver
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">
                {contrato.folio}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-700">
                {cliente.razonSocial}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Estado actual:</span>
              <span className={`font-semibold uppercase tracking-wider ${
                contrato.estado === 'APROBADO'
                  ? 'text-emerald-700'
                  : contrato.estado === 'EN_REVISION'
                    ? 'text-sky-700'
                    : 'text-amber-700'
              }`}>
                {contrato.estado === 'EN_REVISION' ? 'En revisión' : contrato.estado.toLowerCase()}
              </span>
              <span>·</span>
              <span className="font-mono">{formatearMonedaMXN(contrato.variables.monto)}</span>
            </div>
          </div>
        </div>

        {/* Acciones por rol */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de envío a revisión (Generador) */}
          {puedeEnviarARevision && (
            <button
              onClick={handleEnviarARevision}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              📤 Enviar a Revisión
            </button>
          )}

          {/* Botón de Editor: Rechazar con observaciones para devolver a Borrador */}
          {puedeRechazarEditor && (
            <button
              onClick={() => setModalRechazoAbierto(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              ✕ Solicitar Correcciones (Regresar a Borrador)
            </button>
          )}

          {/* Botón de Aprobación Final (Aprobador) */}
          {puedeAprobacionFinal && (
            <>
              <button
                onClick={() => setModalRechazoAbierto(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
              >
                ✕ Solicitar Correcciones
              </button>
              <button
                onClick={handleAprobacionFinalAprobador}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                ✓ Autorización Final Aprobador
              </button>
            </>
          )}

          {/* Exportar / Imprimir PDF */}
          {puedeDescargarPDF && (
            <button
              onClick={() => onPrintPreview(contrato.id)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>📄</span>
              <span>Descargar / Imprimir PDF</span>
            </button>
          )}

          {/* Copiar texto */}
          <button
            onClick={handleCopiarTexto}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
          >
            {copiado ? '✓ Copiado' : 'Copiar Texto'}
          </button>
        </div>
      </div>

      {/* Mensaje de error / restricción de rol */}
      {errorFeedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="text-base text-amber-600 font-bold">⛔</span>
          <div className="flex-1">
            <span className="font-semibold block">Notificación de permisos:</span>
            <span>{errorFeedback}</span>
          </div>
          <button
            onClick={() => setErrorFeedback(null)}
            className="text-amber-700 hover:text-amber-900 font-bold px-1 text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Alerta de Rechazo si existe */}
      {contrato.motivoRechazo && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs text-rose-800 flex items-start gap-3">
          <span className="text-base font-bold text-rose-600">⚠</span>
          <div>
            <div className="font-semibold text-rose-900">
              Observaciones de Rechazo / Corrección solicitadas:
            </div>
            <p className="mt-1 text-rose-800">{contrato.motivoRechazo}</p>
            <div className="text-[11px] text-rose-600 mt-2">
              El Generador debe ajustar las cláusulas o variables y reenviar a revisión.
            </div>
          </div>
        </div>
      )}

      {/* Tabs de vista */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTabModo('LECTURA')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tabModo === 'LECTURA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Vista Previa Formal Notarial
        </button>

        <button
          onClick={() => setTabModo('EDITOR')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tabModo === 'EDITOR'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Editor de Cláusulas y Texto {puedeEditarTexto ? '✏' : '(Solo Lectura)'}
        </button>

        <button
          onClick={() => setTabModo('HISTORIAL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tabModo === 'HISTORIAL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Bitácora de Auditoría ({contrato.historial.length})
        </button>

        <button
          onClick={() => setTabModo('FASTAPI')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tabModo === 'FASTAPI'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Schema JSON (FastAPI / Ollama)
        </button>
      </div>

      {/* TAB 1: VISTA PREVIA FORMAL NOTARIAL */}
      {tabModo === 'LECTURA' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 sm:p-12 max-w-4xl mx-auto">
          {/* Encabezado formal de la empresa */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {EMPRESA_NOVALEX.razonSocial}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {EMPRESA_NOVALEX.nombreComercial} · RFC Ilustrativo: {EMPRESA_NOVALEX.rfc}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {EMPRESA_NOVALEX.domicilioFiscal} · Tel: {EMPRESA_NOVALEX.telefono}
            </p>
            <div className="mt-3 inline-block bg-slate-100 px-3 py-1 rounded text-xs font-mono font-semibold text-slate-800">
              INSTRUMENTO: {contrato.folio}
            </div>
          </div>

          {/* Texto del contrato estructurado y justificado */}
          <div className="space-y-6 text-xs text-slate-800 leading-relaxed font-sans text-justify whitespace-pre-wrap">
            {contrato.textoGenerado}
          </div>
        </div>
      )}

      {/* TAB 2: EDITOR DE TEXTO ENRIQUECIDO */}
      {tabModo === 'EDITOR' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Editor del Instrumento Contractual
              </h2>
              <p className="text-xs text-slate-500">
                {puedeEditarTexto
                  ? 'Puedes modificar o afinar párrafos específicos de las cláusulas generadas.'
                  : `El estado actual (${contrato.estado}) o tu rol (${activeRole}) limitan la edición directa.`}
              </p>
            </div>

            {puedeEditarTexto && (
              <button
                onClick={handleGuardarTexto}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Guardar Modificaciones
              </button>
            )}
          </div>

          {guardadoExitoso && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              ✓ Cambios guardados correctamente en el borrador contractual.
            </div>
          )}

          <textarea
            disabled={!puedeEditarTexto}
            rows={22}
            value={textoEditable}
            onChange={(e) => setTextoEditable(e.target.value)}
            className="w-full p-4 text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 leading-relaxed font-normal disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* TAB 3: BITÁCORA DE HISTORIAL */}
      {tabModo === 'HISTORIAL' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bitácora de Trazabilidad y Auditoría
            </h2>
            <p className="text-xs text-slate-500">
              Registro inmutable de transiciones de estado, usuario responsable y observaciones registradas.
            </p>
          </div>

          <div className="space-y-4">
            {contrato.historial.map((reg: { id: string; timestamp: string; usuario: string; rol: string; accion: string; detalles?: string; estadoAnterior?: string; estadoNuevo?: string }, idx: number) => (
              <div
                key={reg.id || idx}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{reg.accion}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-[11px] font-mono text-slate-500">{reg.rol}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(reg.timestamp).toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Responsable:</span> {reg.usuario}
                </div>
                {reg.estadoAnterior && reg.estadoNuevo && (
                  <div className="text-[11px] text-slate-500">
                    Transición de estado: <span className="font-semibold">{reg.estadoAnterior}</span> → <span className="font-semibold">{reg.estadoNuevo}</span>
                  </div>
                )}
                {reg.detalles && (
                  <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-2">
                    {reg.detalles}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SCHEMA FASTAPI / OLLAMA */}
      {tabModo === 'FASTAPI' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Payload JSON para Backend FastAPI + LangChain
              </h2>
              <p className="text-xs text-slate-500">
                Estructura desacoplada lista para consumo por el endpoint <code className="font-mono text-indigo-600">POST /api/v1/contratos/generar</code> con Ollama (Llama 3.1 8B).
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(payloadFastAPI, null, 2));
                alert('Payload JSON copiado al portapapeles');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
            >
              Copiar JSON
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
            {JSON.stringify(payloadFastAPI, null, 2)}
          </pre>
        </div>
      )}

      {/* Modal de Rechazo (Editor / Aprobador) */}
      {modalRechazoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rechazar Contrato a Borrador
                </h3>
                <p className="text-xs text-slate-500">
                  Especifica el motivo o las correcciones legales que debe subsanar el Generador.
                </p>
              </div>
              <button
                onClick={() => setModalRechazoAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarRechazo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo detallado de rechazo / Observaciones <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej: Corregir descripción de entregables en la Cláusula Primera y verificar porcentaje de penalización acordado con el cliente..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRechazoAbierto(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
