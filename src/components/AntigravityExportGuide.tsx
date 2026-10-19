import React from 'react';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';

export const AntigravityExportGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          GuÃ­a de ExportaciÃ³n y ConexiÃ³n Backend
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Instrucciones para migrar este MVP a tu entorno local o Google Antigravity con FastAPI, Ollama (Llama 3.1 8B), PostgreSQL y WeasyPrint (PRD SecciÃ³n 6 y 9).
        </p>
      </div>

      {/* Estado del MVP vs Backend Futuro */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-xs text-amber-900 space-y-2">
        <div className="font-bold flex items-center gap-2 text-amber-950 text-sm">
          <span>â„¹</span>
          <span>AclaraciÃ³n de Alcance TÃ©cnico del MVP Actual</span>
        </div>
        <p>
          Este prototipo cuenta con la <strong>interfaz completa, el flujo de 3 roles (Generador, Editor, Aprobador)</strong>, la validaciÃ³n fiscal mexicana (RFC SAT), el catÃ¡logo de 10 clÃ¡usulas estÃ¡ndar y un <strong>motor determinista de ensamblado legal</strong>.
        </p>
        <p>
          Para mantener la pureza solicitada, <strong>no se ha simulado una falsa base de datos remota ni claves API en el frontend</strong>. El almacenamiento actual es local (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">localStorage</code>) y la lÃ³gica de negocio (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">contractEngine.ts</code>) estÃ¡ completamente desacoplada para conectarse directamente a tu servidor FastAPI.
        </p>
      </div>

      {/* 1. Pasos de exportaciÃ³n */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          1. CÃ³mo exportar el cÃ³digo fuente a tu entorno local / Google Antigravity
        </h2>
        <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
          <p>
            Para continuar el desarrollo en tu estaciÃ³n de trabajo o en Google Antigravity, puedes clonar o descargar los archivos de este proyecto:
          </p>
          <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] space-y-2 overflow-x-auto">
            <div><span className="text-slate-500"># 1. Clona el repositorio o descomprime los archivos del proyecto</span></div>
            <div>git clone &lt;tu-repositorio-antigravity&gt;</div>
            <div>cd novalex-contratos-mvp</div>
            <div className="pt-2"><span className="text-slate-500"># 2. Instala dependencias de React</span></div>
            <div>npm install</div>
            <div className="pt-2"><span className="text-slate-500"># 3. Inicia el servidor de desarrollo Vite</span></div>
            <div>npm run dev</div>
          </div>
        </div>
      </div>

      {/* 2. Arquitectura de microservicios con Docker Compose */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          2. Despliegue con Docker Compose (PRD SecciÃ³n 6)
        </h2>
        <p className="text-xs text-slate-600">
          Crea el archivo <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">docker-compose.yml</code> en la raÃ­z de tu proyecto para orquestar los 4 servicios locales sin depender de internet ni APIs de pago:
        </p>

        <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`version: '3.8'

services:
  # 1. Frontend React (este proyecto)
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend

  # 2. Backend FastAPI + Python 3.11 + LangChain + WeasyPrint
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://plurione@postgres:5432/contratos_db
      - OLLAMA_HOST=http://ollama:11434
      - MODEL_NAME=llama3.1:8b
    depends_on:
      - postgres
      - ollama

  # 3. IA Local Ollama con Llama 3.1 8B (Costo $0, datos locales)
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  # 4. Base de Datos Relacional PostgreSQL
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=plurione
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=contratos_db
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  ollama_data:
  pgdata:`}
        </pre>
      </div>

      {/* 3. Endpoint FastAPI sugerido */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          3. Estructura del Endpoint en FastAPI (<code className="font-mono text-indigo-600">main.py</code>)
        </h2>
        <p className="text-xs text-slate-600">
          En tu backend de Python, implementa la recepciÃ³n del payload generado por <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">src/services/contractEngine.ts</code>:
        </p>

        <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
{`from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests

app = FastAPI(title="Motor de Contratos NovaLex TecnologÃ­a Contractual S.A. de C.V.")

class SolicitudContrato(BaseModel):
    datos_prestador: dict
    datos_cliente: dict
    variables: dict
    clausulas_ids: list[str]

@app.post("/api/v1/contratos/generar")
async def generar_contrato_con_llama(payload: SolicitudContrato):
    # Prompt estructurado para Llama 3.1 8B vÃ­a Ollama local
    prompt = f"""Eres un abogado corporativo mexicano redactando para NovaLex TecnologÃ­a Contractual S.A. de C.V.
    Cliente: {payload.datos_cliente['razon_social']} (RFC: {payload.datos_cliente['rfc']})
    Objeto: {payload.variables['objeto']}
    Monto: {payload.variables['monto_formateado']} ({payload.variables['monto_letra']})
    Vigencia: {payload.variables['vigencia_inicio']} al {payload.variables['vigencia_fin']}
    Genera el texto legal riguroso bajo el CÃ³digo Civil Federal mexicano."""
    
    # Llamada a Ollama local (puerto 11434)
    response = requests.post("http://ollama:11434/api/generate", json={
        "model": "llama3.1:8b",
        "prompt": prompt,
        "stream": False
    })
    
    return {"texto_generado": response.json()["response"]}`}
        </pre>
      </div>

      {/* Datos institucionales de NovaLex */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-xs text-slate-700 space-y-1">
        <div className="font-bold text-slate-900">Datos Ficticios de DemostraciÃ³n Integrados en las Plantillas:</div>
        <div><strong>Empresa:</strong> {EMPRESA_NOVALEX.razonSocial} ({EMPRESA_NOVALEX.nombreComercial})</div>
        <div><strong>RFC Ilustrativo:</strong> {EMPRESA_NOVALEX.rfc} Â· <strong>Domicilio:</strong> {EMPRESA_NOVALEX.domicilioFiscal}</div>
        <div><strong>Representante Legal:</strong> {EMPRESA_NOVALEX.representanteLegal} ({EMPRESA_NOVALEX.cargoRepresentante})</div>
        <div><strong>Instrumento Notarial:</strong> {EMPRESA_NOVALEX.escrituraPublica}</div>
      </div>
    </div>
  );
};

