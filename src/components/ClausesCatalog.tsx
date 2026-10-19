import React, { useState } from 'react';
import { Clausula, UserRole } from '../types/contract';
import { StorageService } from '../services/storageService';

interface ClausesCatalogProps {
  clausulas: Clausula[];
  activeRole: UserRole;
  onClauseAdded: (clausula: Clausula) => void;
}

export const ClausesCatalog: React.FC<ClausesCatalogProps> = ({
  clausulas,
  activeRole,
  onClauseAdded
}) => {
  const [tabActivo, setTabActivo] = useState<'ESTANDAR' | 'PERSONALIZADA'>('ESTANDAR');
  const [clausulaExpandida, setClausulaExpandida] = useState<string | null>('clausula-std-1');
  const [modalAbierto, setModalAbierto] = useState(false);

  // Form para cláusula personalizada
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Especializada');
  const [tipoRequerida, setTipoRequerida] = useState(false);
  const [descripcionBreve, setDescripcionBreve] = useState('');
  const [textoBase, setTextoBase] = useState('');
  const [error, setError] = useState('');

  const estandarCount = clausulas.filter(c => c.tipo === 'estandar').length;
  const personalizadasCount = clausulas.filter(c => c.tipo === 'personalizada').length;

  const clausulasFiltradas = clausulas.filter(c =>
    tabActivo === 'ESTANDAR' ? c.tipo === 'estandar' : c.tipo === 'personalizada'
  );

  const abrirModalNueva = () => {
    setNombre('');
    setCategoria('Especializada');
    setTipoRequerida(false);
    setDescripcionBreve('');
    setTextoBase('DÉCIMA PRIMERA. ... Las partes acuerdan que con motivo de los servicios {{objeto}} ...');
    setError('');
    setModalAbierto(true);
  };

  const handleCrearClausula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la cláusula es obligatorio');
      return;
    }
    if (!textoBase.trim()) {
      setError('El texto base de la cláusula es obligatorio');
      return;
    }

    const maxNumero = Math.max(...clausulas.map(c => c.numero), 10);
    const nuevaClausula: Clausula = {
      id: `clausula-pers-${Date.now()}`,
      numero: maxNumero + 1,
      etiquetaNumero: `CLÁUSULA ${maxNumero + 1}`,
      nombre: nombre.trim(),
      tipo: 'personalizada',
      categoria: categoria.trim() || 'Personalizada',
      requerida: tipoRequerida,
      seleccionadaPorDefecto: false,
      descripcionBreve: descripcionBreve.trim() || 'Cláusula personalizada creada por el usuario',
      textoBase: textoBase.trim(),
      fechaCreacion: new Date().toISOString()
    };

    const guardada = await StorageService.guardarClausula(nuevaClausula);
    onClauseAdded(guardada);
    setModalAbierto(false);
    setTabActivo('PERSONALIZADA');
    setClausulaExpandida(guardada.id);
  };

  // Helper para insertar tags de variables
  const insertarVariable = (variableTag: string) => {
    setTextoBase(prev => `${prev} {{${variableTag}}}`);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catálogo de Cláusulas Contractuales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            10 cláusulas estándar basadas en la legislación civil y mercantil mexicana, más cláusulas personalizadas parametrizadas (PRD 4.2).
          </p>
        </div>

        <div>
          {activeRole === 'GENERADOR' || activeRole === 'EDITOR' ? (
            <button
              onClick={abrirModalNueva}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              + Crear Cláusula Personalizada
            </button>
          ) : (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              Modo solo lectura para Aprobador
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTabActivo('ESTANDAR')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            tabActivo === 'ESTANDAR'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          10 Cláusulas Estándar ({estandarCount})
        </button>
        <button
          onClick={() => setTabActivo('PERSONALIZADA')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            tabActivo === 'PERSONALIZADA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Cláusulas Personalizadas ({personalizadasCount})
        </button>
      </div>

      {/* Listado de Cláusulas */}
      <div className="space-y-3">
        {clausulasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-600 font-medium">No existen cláusulas personalizadas aún.</p>
            <p className="text-xs text-slate-400 mt-1">
              Puedes crear cláusulas con variables dinámicas para casos específicos como SLA o soporte extendido.
            </p>
            {(activeRole === 'GENERADOR' || activeRole === 'EDITOR') && (
              <button
                onClick={abrirModalNueva}
                className="mt-4 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Crear primera cláusula personalizada
              </button>
            )}
          </div>
        ) : (
          clausulasFiltradas.map((clausula) => {
            const estaExpandida = clausulaExpandida === clausula.id;

            return (
              <div
                key={clausula.id}
                className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Header de la tarjeta */}
                <div
                  onClick={() => setClausulaExpandida(estaExpandida ? null : clausula.id)}
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400 w-6">
                      #{clausula.numero}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {clausula.etiquetaNumero}. {clausula.nombre}
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500">
                          {clausula.categoria}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {clausula.descripcionBreve}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {clausula.requerida ? (
                      <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        Requerida
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Opcional
                      </span>
                    )}

                    <span className="text-slate-400 text-xs font-mono">
                      {estaExpandida ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Contenido expandible */}
                {estaExpandida && (
                  <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
                    {clausula.fundamentoLegal && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Fundamento legal:</span>
                        <span>{clausula.fundamentoLegal}</span>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Texto Base Parametrizado:
                      </div>
                      <pre className="text-xs text-slate-800 bg-white p-3.5 rounded-md border border-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {clausula.textoBase}
                      </pre>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold">Variables detectadas:</span>{' '}
                      {clausula.textoBase.match(/\{\{([a-zA-Z0-9_]+)\}\}/g)?.join(', ') || 'Ninguna variable dinámica directa'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal para crear cláusula personalizada */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Crear Cláusula Personalizada
                </h2>
                <p className="text-xs text-slate-500">
                  Define el texto base y las variables de sustitución para el contrato (PRD 4.2).
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearClausula} className="p-6 space-y-4">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Cláusula <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Acuerdos de Nivel de Servicio (SLA) o Licenciamiento"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ej: Técnica, Operativa, Cobranza"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Exigencia
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={!tipoRequerida}
                        onChange={() => setTipoRequerida(false)}
                      />
                      Opcional
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={tipoRequerida}
                        onChange={() => setTipoRequerida(true)}
                      />
                      Requerida
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Breve
                </label>
                <input
                  type="text"
                  value={descripcionBreve}
                  onChange={(e) => setDescripcionBreve(e.target.value)}
                  placeholder="Resumen del propósito de la cláusula en una línea"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Botones de inserción rápida de variables */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Insertar Variable Dinámica
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['objeto', 'monto', 'forma_pago', 'vigencia_inicio', 'vigencia_fin', 'penalizacion', 'cliente_razon_social'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertarVariable(tag)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono cursor-pointer transition-colors"
                    >
                      +{`{{${tag}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto Base de la Cláusula <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={textoBase}
                  onChange={(e) => setTextoBase(e.target.value)}
                  placeholder="Redacta el texto legal empleando variables entre llaves..."
                  className="w-full px-3 py-2 text-xs font-sans bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Guardar Cláusula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
