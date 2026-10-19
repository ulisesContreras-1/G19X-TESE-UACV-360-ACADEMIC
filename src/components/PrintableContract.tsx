import React from 'react';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';
import { StorageService } from '../services/storageService';

interface PrintableContractProps {
  contratoId: string;
  onClose: () => void;
}

export const PrintableContract: React.FC<PrintableContractProps> = ({
  contratoId,
  onClose
}) => {
  const contrato = StorageService.getContractById(contratoId);
  const clientes = StorageService.getClientes();
  const cliente = clientes.find(c => c.id === contrato?.clienteId);

  if (!contrato || !cliente) {
    return (
      <div className="p-8 text-center">
        <p>Contrato no localizado.</p>
        <button onClick={onClose} className="mt-2 text-indigo-600 underline">Cerrar</button>
      </div>
    );
  }

  const [descargandoPDF, setDescargandoPDF] = React.useState(false);

  const handleDescargarPDFWeasyPrint = async () => {
    try {
      setDescargandoPDF(true);
      await StorageService.descargarPDF(contrato.id, contrato.folio);
    } catch (e: any) {
      alert(`Error descargando PDF del backend:\n${e.message || e}`);
    } finally {
      setDescargandoPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDescargarTexto = () => {
    const element = document.createElement('a');
    const file = new Blob([contrato.textoGenerado], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${contrato.folio}_CONTRATO_NOVALEX.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-slate-100 min-h-screen py-6 px-4">
      {/* Barra de control flotante (no imprimible) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
          >
            ← Volver al Editor
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900 font-mono">
              {contrato.folio}
            </div>
            <div className="text-[11px] text-slate-500">
              Vista de Impresión / Exportación PDF Legal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDescargarTexto}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
          >
            Descargar .TXT
          </button>
          <button
            onClick={handleDescargarPDFWeasyPrint}
            disabled={descargandoPDF}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>{descargandoPDF ? 'Generando PDF...' : 'Descargar PDF (WeasyPrint)'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-2"
          >
            <span>🖨</span>
            <span>Imprimir Navegador</span>
          </button>
        </div>
      </div>

      {/* Hoja de Contrato Legal (estilo notarial mexicano para impresión) */}
      <div className="print-page max-w-4xl mx-auto bg-white p-12 sm:p-16 shadow-lg border border-slate-200 rounded-lg text-black relative">
        {/* Marca de agua si no está aprobado */}
        {contrato.estado !== 'APROBADO' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-[-30deg]">
            <span className="text-6xl font-black tracking-widest text-slate-900 uppercase">
              {contrato.estado === 'BORRADOR' ? 'BORRADOR' : 'EN REVISIÓN'}
            </span>
          </div>
        )}

        {/* Encabezado Corporativo Oficial */}
        <div className="border-b-2 border-slate-900 pb-5 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
              {EMPRESA_NOVALEX.razonSocial}
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              {EMPRESA_NOVALEX.nombreComercial} · Identidad Demostrativa
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              RFC Ilustrativo: <span className="font-mono">{EMPRESA_NOVALEX.rfc}</span> · Giro: {EMPRESA_NOVALEX.giro}
            </p>
            <p className="text-[10px] text-slate-500">
              {EMPRESA_NOVALEX.domicilioFiscal} · Tel: {EMPRESA_NOVALEX.telefono}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-200 inline-block">
              FOLIO: {contrato.folio}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5 font-mono">
              ESTADO: {contrato.estado}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              EMISIÓN: {contrato.variables.fecha}
            </div>
          </div>
        </div>

        {/* Cuerpo del Contrato en Prosa Legal Justificada */}
        <div className="text-[13px] leading-relaxed text-justify space-y-4 font-serif whitespace-pre-wrap">
          {contrato.textoGenerado}
        </div>

        {/* Pie de página con folio y sello de trazabilidad */}
        <div className="mt-12 pt-6 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between items-center font-sans">
          <span>
            {EMPRESA_NOVALEX.razonSocial} · Instrumento Contractual {contrato.folio}
          </span>
          <span className="font-mono">
            Página 1 de 1 · Sistema de Generación NovaLex
          </span>
        </div>
      </div>
    </div>
  );
};
