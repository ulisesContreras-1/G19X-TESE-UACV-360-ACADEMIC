import React, { useState } from 'react';
import { ClienteFiscal, Clausula, Contrato, FormaPago, UserRole, VariablesContrato } from '../types/contract';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';
import { ensamblarBorradorContrato, formatearMonedaMXN, numeroALetrasPesos } from '../services/contractEngine';
import { StorageService } from '../services/storageService';

interface ContractWizardProps {
  clientes: ClienteFiscal[];
  clausulas: Clausula[];
  activeRole: UserRole;
  onContractGenerated: (contratoId: string) => void;
  onCancel: () => void;
}

export const ContractWizard: React.FC<ContractWizardProps> = ({
  clientes,
  clausulas,
  activeRole,
  onContractGenerated,
  onCancel
}) => {
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Cliente
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>(
    clientes.length > 0 ? clientes[0].id : ''
  );

  // Paso 2: Cláusulas seleccionadas (por defecto todas las estándar seleccionadas)
  const [clausulasSeleccionadas, setClausulasSeleccionadas] = useState<string[]>(
    clausulas.map(c => c.id)
  );

  // Paso 3: Variables del contrato (PRD 4.3)
  const hoyStr = new Date().toISOString().split('T')[0];
  const fechaFinDefault = new Date();
  fechaFinDefault.setMonth(fechaFinDefault.getMonth() + 6);
  const finStr = fechaFinDefault.toISOString().split('T')[0];

  const [fechaFirma, setFechaFirma] = useState<string>(hoyStr);
  const [lugarFirma, setLugarFirma] = useState<string>('Ciudad de México');
  const [objeto, setObjeto] = useState<string>(
    'Servicios de consultoría estratégica y desarrollo de módulos de software empresarial para modernización de procesos digitales, integración de APIs y capacitación de equipos técnicos.'
  );
  const [monto, setMonto] = useState<number>(280000);
  const [formaPago, setFormaPago] = useState<FormaPago>('Por entregable');
  const [vigenciaInicio, setVigenciaInicio] = useState<string>(hoyStr);
  const [vigenciaFin, setVigenciaFin] = useState<string>(finStr);
  const [penalizacion, setPenalizacion] = useState<string>(
    '1% (uno por ciento) diario por cada día natural de demora imputable en la entrega formal de cada hito'
  );

  // Paso 4: Estado de ensamble / simulación de IA local
  const [generando, setGenerando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState('');

  // Validaciones
  const [errorValidacion, setErrorValidacion] = useState('');

  const clienteSeleccionado = clientes.find(c => c.id === clienteSeleccionadoId);

  const toggleClausula = (id: string, requerida: boolean) => {
    if (requerida) return; // Cláusulas requeridas no pueden desmarcarse
    setClausulasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const seleccionarTodasClausulas = () => {
    setClausulasSeleccionadas(clausulas.map(c => c.id));
  };

  const validarPaso3 = () => {
    if (!objeto.trim()) {
      setErrorValidacion('La descripción del objeto del contrato es obligatoria.');
      return false;
    }
    if (!monto || monto <= 0) {
      setErrorValidacion('El monto total debe ser mayor a cero.');
      return false;
    }
    if (!vigenciaInicio || !vigenciaFin) {
      setErrorValidacion('Las fechas de inicio y fin de vigencia son obligatorias.');
      return false;
    }
    if (new Date(vigenciaFin) <= new Date(vigenciaInicio)) {
      setErrorValidacion('La fecha de fin de vigencia debe ser posterior a la fecha de inicio.');
      return false;
    }
    if (!penalizacion.trim()) {
      setErrorValidacion('La estipulación de penalización es obligatoria.');
      return false;
    }
    setErrorValidacion('');
    return true;
  };

  const ejecutarGeneracion = async () => {
    if (!clienteSeleccionado) return;

    setGenerando(true);
    setProgresoTexto('Iniciando motor de redacción (Llama 3.1 8B vía Ollama)...');

    const variables: VariablesContrato = {
      fecha: fechaFirma,
      lugar_firma: lugarFirma,
      objeto: objeto.trim(),
      monto: Number(monto),
      forma_pago: formaPago,
      vigencia_inicio: vigenciaInicio,
      vigencia_fin: vigenciaFin,
      penalizacion: penalizacion.trim()
    };

    const currentUser = StorageService.getCurrentUser();

    try {
      setProgresoTexto('Redactando contrato legal y validando declaraciones en PostgreSQL...');
      const contratoGenerado = await StorageService.generarContratoBackend({
        clienteId: clienteSeleccionado.id,
        variables,
        clausulasIds: clausulasSeleccionadas,
        creadoPor: currentUser.id
      });

      setGenerando(false);
      onContractGenerated(contratoGenerado.id);
    } catch (err: any) {
      console.error('[ContractWizard] Error en generación con IA:', err);
      setGenerando(false);
      alert(`Error al generar contrato con el motor de IA:\n\n${err.message || 'Verifica que Ollama y PostgreSQL estén activos.'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado del Wizard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Generador de Contrato de Servicios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Prestación de Servicios Profesionales · Marco Jurídico Mexicano (PRD 4.3)
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Indicador de Pasos */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { num: 1, label: '1. Cliente' },
          { num: 2, label: '2. Cláusulas' },
          { num: 3, label: '3. Variables' },
          { num: 4, label: '4. Ensamblado' }
        ].map(step => (
          <div
            key={step.num}
            className={`py-2 px-1 rounded-md border text-center transition-colors ${
              pasoActual === step.num
                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                : pasoActual > step.num
                  ? 'bg-slate-100 text-slate-800 border-slate-200 font-medium'
                  : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>

      {/* PASO 1: SELECCIONAR CLIENTE */}
      {pasoActual === 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 1: Seleccionar Cliente Contratante
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona el cliente mexicano registrado cuyos datos fiscales y de apoderado se incorporarán en las declaraciones.
            </p>
          </div>

          {clientes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay clientes registrados en el sistema. Registra al menos un cliente en el módulo de Clientes.
            </div>
          ) : (
            <div className="space-y-3">
              {clientes.map(cli => (
                <div
                  key={cli.id}
                  onClick={() => setClienteSeleccionadoId(cli.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    clienteSeleccionadoId === cli.id
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">
                        {cli.razonSocial}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        RFC: {cli.rfc} · {cli.rfc.length === 12 ? 'Persona Moral' : 'Persona Física'}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Representante: {cli.representanteLegal} ({cli.cargo})
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xl">
                        {cli.domicilioFiscal}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="clienteRadio"
                      checked={clienteSeleccionadoId === cli.id}
                      onChange={() => setClienteSeleccionadoId(cli.id)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              disabled={!clienteSeleccionadoId}
              onClick={() => setPasoActual(2)}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              Continuar a Cláusulas →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: SELECCIONAR CLÁUSULAS */}
      {pasoActual === 2 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paso 2: Selección de Cláusulas Contractuales
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Las 10 cláusulas estándar mexicanas están precargadas. Puedes incluir o excluir cláusulas opcionales o personalizadas.
              </p>
            </div>
            <button
              onClick={seleccionarTodasClausulas}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Seleccionar todas
            </button>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-2">
            {clausulas.map(clausula => {
              const estaSeleccionada = clausulasSeleccionadas.includes(clausula.id);

              return (
                <div
                  key={clausula.id}
                  onClick={() => toggleClausula(clausula.id, clausula.requerida)}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    clausula.requerida
                      ? 'bg-slate-50/80 border-slate-200 cursor-not-allowed'
                      : estaSeleccionada
                        ? 'bg-slate-50 border-slate-300 cursor-pointer'
                        : 'bg-white border-slate-200 opacity-60 cursor-pointer hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={estaSeleccionada}
                      disabled={clausula.requerida}
                      onChange={() => toggleClausula(clausula.id, clausula.requerida)}
                      className="cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>{clausula.etiquetaNumero}. {clausula.nombre}</span>
                        {clausula.requerida && (
                          <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded font-normal">
                            Obligatoria
                          </span>
                        )}
                        {clausula.tipo === 'personalizada' && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Personalizada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {clausula.descripcionBreve}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {clausula.categoria}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setPasoActual(1)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              ← Volver a Cliente
            </button>
            <button
              onClick={() => setPasoActual(3)}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              Continuar a Variables ({clausulasSeleccionadas.length} cláusulas) →
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: VARIABLES DEL CONTRATO (PRD 4.3) */}
      {pasoActual === 3 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 3: Captura de Parámetros Específicos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa los datos deterministas del servicio que sustituirán las variables en el texto contractual (PRD 4.3).
            </p>
          </div>

          {errorValidacion && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {errorValidacion}
            </div>
          )}

          <div className="space-y-4">
            {/* Fechas y Lugar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de Firma del Contrato <span className="font-mono text-slate-400">{`{{fecha}}`}</span>
                </label>
                <input
                  type="date"
                  value={fechaFirma}
                  onChange={(e) => setFechaFirma(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lugar de Firma
                </label>
                <input
                  type="text"
                  value={lugarFirma}
                  onChange={(e) => setLugarFirma(e.target.value)}
                  placeholder="Ciudad de México"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Objeto */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Objeto y Alcance del Servicio <span className="font-mono text-slate-400">{`{{objeto}}`}</span>
              </label>
              <textarea
                rows={3}
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                placeholder="Describe detalladamente los servicios de consultoría o desarrollo que prestará NovaLex..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 leading-relaxed"
              />
            </div>

            {/* Monto y Forma de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto Total en MXN <span className="font-mono text-slate-400">{`{{monto}}`}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value))}
                    min={1}
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  En letras: {numeroALetrasPesos(monto)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pago <span className="font-mono text-slate-400">{`{{forma_pago}}`}</span>
                </label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as FormaPago)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Por entregable">Por entregable</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Única exhibición">Única exhibición</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Requiere validación de CFDI 4.0 previo a liquidación vía SPEI.
                </p>
              </div>
            </div>

            {/* Vigencia Inicio y Fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inicio de Vigencia <span className="font-mono text-slate-400">{`{{vigencia_inicio}}`}</span>
                </label>
                <input
                  type="date"
                  value={vigenciaInicio}
                  onChange={(e) => setVigenciaInicio(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fin de Vigencia <span className="font-mono text-slate-400">{`{{vigencia_fin}}`}</span>
                </label>
                <input
                  type="date"
                  value={vigenciaFin}
                  onChange={(e) => setVigenciaFin(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Penalización */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penalización por Incumplimiento o Demora <span className="font-mono text-slate-400">{`{{penalizacion}}`}</span>
              </label>
              <input
                type="text"
                value={penalizacion}
                onChange={(e) => setPenalizacion(e.target.value)}
                placeholder="Ej: 1% diario por cada día natural de demora sobre el hito pactado"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setPasoActual(2)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              ← Volver a Cláusulas
            </button>
            <button
              onClick={() => {
                if (validarPaso3()) {
                  setPasoActual(4);
                }
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              Revisar Resumen y Ensamblar →
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: RESUMEN Y GENERACIÓN */}
      {pasoActual === 4 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 4: Verificación y Ensamblado de Contrato
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verifica los parámetros consolidados antes de generar el borrador contractual.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block">Prestador:</span>
                <span className="font-semibold text-slate-900">{EMPRESA_NOVALEX.razonSocial}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cliente:</span>
                <span className="font-semibold text-slate-900">{clienteSeleccionado?.razonSocial}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Honorarios:</span>
                <span className="font-semibold text-slate-900 font-mono">{formatearMonedaMXN(monto)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Forma de Pago:</span>
                <span className="font-semibold text-slate-900">{formaPago}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <span className="text-slate-500 block">Vigencia:</span>
              <span className="font-medium text-slate-800">
                Del {vigenciaInicio} al {vigenciaFin} ({clausulasSeleccionadas.length} cláusulas seleccionadas)
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <span className="text-slate-500 block">Objeto del Servicio:</span>
              <span className="text-slate-800">{objeto}</span>
            </div>
          </div>

          {generando && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-indigo-900">
                  {progresoTexto}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700">
                El motor está aplicando reglas del Código Civil Federal y estructurando el borrador verificable.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              disabled={generando}
              onClick={() => setPasoActual(3)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              ← Modificar Variables
            </button>
            <button
              disabled={generando}
              onClick={ejecutarGeneracion}
              className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              {generando ? 'Ensamblando Contrato...' : '⚡ Ensamblar y Generar Borrador'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
