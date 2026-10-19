import React from 'react';
import { UserSession } from '../types/contract';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: UserSession;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  user,
  onLogout
}) => {
  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'GENERADOR':
        return {
          label: 'Generador',
          classes: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'EDITOR':
        return {
          label: 'Editor',
          classes: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'APROBADOR':
        return {
          label: 'Aprobador',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      default:
        return {
          label: rol,
          classes: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-500'
        };
    }
  };

  const roleInfo = getRoleBadge(user.rol);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Aviso institucional discreto */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-1.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide">{EMPRESA_NOVALEX.razonSocial}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{EMPRESA_NOVALEX.nombreComercial}</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-slate-300">RFC Ilustrativo: {EMPRESA_NOVALEX.rfc}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400">Ambiente Demostrativo</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-400 font-medium">Llama 3.1 8B / Ollama Ready</span>
        </div>
      </div>

      {/* Top Bar Contract (3 zonas con navegación) */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        {/* Zona 1: Brand title */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-left group cursor-pointer focus:outline-none whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            NL
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Motor de Contratos
            </span>
            <span className="ml-2 text-xs font-mono text-slate-400 font-normal">v1.0-MVP</span>
          </div>
        </button>

        {/* Zona 2: Nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 cursor-pointer ${
              currentView === 'dashboard'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('clientes')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 cursor-pointer ${
              currentView === 'clientes'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'text-slate-600'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => onNavigate('clausulas')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 cursor-pointer ${
              currentView === 'clausulas'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'text-slate-600'
            }`}
          >
            Catálogo Cláusulas
          </button>
          {user.rol === 'GENERADOR' && (
            <button
              onClick={() => onNavigate('nuevo-contrato')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 cursor-pointer ${
                currentView === 'nuevo-contrato'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600'
              }`}
            >
              Nuevo Contrato
            </button>
          )}
          <button
            onClick={() => onNavigate('guia-exportacion')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 cursor-pointer ${
              currentView === 'guia-exportacion'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'text-slate-600'
            }`}
          >
            Guía Antigravity / FastAPI
          </button>
        </nav>

        {/* Zona 3: Información de usuario autenticado y botón de cierre de sesión */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Perfil del usuario autenticado */}
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user.nombre}
            </div>
            <div className="text-[11px] text-slate-500">
              {user.cargo || user.email}
            </div>
          </div>

          {/* Insignia de Rol asignado por Backend */}
          <div
            title={`Rol autenticado: ${user.rol}. Determinado por la base de datos PostgreSQL.`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
            <span>{roleInfo.label}</span>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            onClick={onLogout}
            title="Cerrar sesión y revocar acceso local"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
