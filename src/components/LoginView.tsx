import React, { useState } from 'react';
import { AuthSession } from '../types/contract';
import { StorageService } from '../services/storageService';
import { EMPRESA_NOVALEX } from '../data/initialDemoData';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  initialMessage?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(initialMessage || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const userClean = username.trim();
    if (!userClean || !password) {
      setError('Por favor, ingresa tu usuario/correo y contraseña.');
      return;
    }

    setCargando(true);
    try {
      const session = await StorageService.login(userClean, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor de autenticación.');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarCuentaDemo = (usr: string, pass: string = 'inicio2026') => {
    setUsername(usr);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Patrón de fondo geométrico sutil */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Cabecera institucional */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-lg mb-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {EMPRESA_NOVALEX.nombreComercial}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {EMPRESA_NOVALEX.razonSocial}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">
            RFC Ficticio: {EMPRESA_NOVALEX.rfc} · Motor de Contratos Inteligente
          </p>
        </div>

        {/* Tarjeta de Formulario de Inicio de Sesión */}
        <div className="mt-8 bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Inicio de Sesión Seguro
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa tus credenciales para acceder al control de contratos
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-semibold block">Aviso de autenticación:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Usuario o Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. uacontreras o v.ramos@example.com"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {cargando ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión en NovaLex</span>
                )}
              </button>
            </div>
          </form>

          {/* Accesos rápidos de demostración para el evaluador */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cuentas de Demostración (Evaluación)
              </span>
              <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Clave: inicio2026
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => seleccionarCuentaDemo('uacontreras')}
                className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                    Valeria Ramos Peña
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Generador
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Usuario: <span className="font-semibold text-slate-700">uacontreras</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarCuentaDemo('elozano')}
                className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                    Eduardo Lozano Mora
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Editor
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Usuario: <span className="font-semibold text-slate-700">elozano</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarCuentaDemo('jmorales')}
                className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                    Javier Morales Hinojosa
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Aprobador
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Usuario: <span className="font-semibold text-slate-700">jmorales</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Nota legal / pie discreto */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>
            Plataforma con autenticación JWT y contraseñas hasheadas en PostgreSQL con Bcrypt.
          </p>
          <p className="mt-1 text-slate-500">
            NovaLex · Soluciones Digitales · Ciudad de México
          </p>
        </div>
      </div>
    </div>
  );
};
