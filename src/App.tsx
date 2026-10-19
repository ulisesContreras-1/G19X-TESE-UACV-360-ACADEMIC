import React, { useEffect, useState } from 'react';
import { ClienteFiscal, Clausula, Contrato, UserSession, AuthSession } from './types/contract';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClientsModule } from './components/ClientsModule';
import { ClausesCatalog } from './components/ClausesCatalog';
import { ContractWizard } from './components/ContractWizard';
import { ContractEditorView } from './components/ContractEditorView';
import { PrintableContract } from './components/PrintableContract';
import { AntigravityExportGuide } from './components/AntigravityExportGuide';
import { LoginView } from './components/LoginView';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => StorageService.getAuthUser());
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Datos en memoria reactiva sincronizados con StorageService
  const [clientes, setClientes] = useState<ClienteFiscal[]>([]);
  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);

  const cargarDatos = () => {
    setClientes(StorageService.getClientes());
    setClausulas(StorageService.getClausulas());
    setContratos(StorageService.getContratos());
  };

  // Inicialización y sincronización con PostgreSQL vía FastAPI
  useEffect(() => {
    const handleAuthExpired = (e: any) => {
      setUser(null);
      setAuthMessage(e.detail?.message || 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      setCurrentView('dashboard');
      setSelectedContractId(null);
    };

    window.addEventListener('novalex_auth_expired', handleAuthExpired);

    if (StorageService.isAuthenticated()) {
      StorageService.init();
      cargarDatos();
      StorageService.sincronizarConBackend().then(() => {
        cargarDatos();
      });
    }

    return () => {
      window.removeEventListener('novalex_auth_expired', handleAuthExpired);
    };
  }, []);

  const handleLoginSuccess = (session: AuthSession) => {
    setUser(session.user);
    setAuthMessage(null);
    setCurrentView('dashboard');
    StorageService.init();
    cargarDatos();
    StorageService.sincronizarConBackend().then(() => {
      cargarDatos();
    });
  };

  const handleLogout = async () => {
    await StorageService.logout();
    setUser(null);
    setAuthMessage('Has cerrado sesión en NovaLex.');
    setCurrentView('dashboard');
    setSelectedContractId(null);
  };

  const handleSelectContract = (id: string) => {
    setSelectedContractId(id);
    setCurrentView('editor');
  };

  const handlePrintPreview = (id: string) => {
    setSelectedContractId(id);
    setCurrentView('print');
  };

  const handleContractGenerated = (id: string) => {
    cargarDatos();
    setSelectedContractId(id);
    setCurrentView('editor');
  };

  const handleClientAdded = (_cliente: ClienteFiscal) => {
    cargarDatos();
  };

  const handleClientUpdated = (_cliente: ClienteFiscal) => {
    cargarDatos();
  };

  const handleClauseAdded = (_clausula: Clausula) => {
    cargarDatos();
  };

  // Protección de rutas: si no está autenticado, renderizar exclusivamente LoginView
  if (!user || !StorageService.isAuthenticated()) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        initialMessage={authMessage || undefined}
      />
    );
  }

  // Vista de impresión a pantalla completa para contratos
  if (currentView === 'print' && selectedContractId) {
    return (
      <PrintableContract
        contratoId={selectedContractId}
        onClose={() => setCurrentView('editor')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Barra de Navegación Superior con usuario y botón de cierre de sesión */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'nuevo-contrato' && user.rol !== 'GENERADOR') {
            alert('Acción restringida: Únicamente los usuarios con rol Generador pueden crear nuevos contratos.');
            return;
          }
          setCurrentView(view);
          if (view !== 'editor' && view !== 'print') {
            setSelectedContractId(null);
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <Dashboard
            contratos={contratos}
            activeRole={user.rol}
            onSelectContract={handleSelectContract}
            onNavigateNew={() => setCurrentView('nuevo-contrato')}
            onRefreshData={cargarDatos}
          />
        )}

        {currentView === 'clientes' && (
          <ClientsModule
            clientes={clientes}
            activeRole={user.rol}
            onClientAdded={handleClientAdded}
            onClientUpdated={handleClientUpdated}
          />
        )}

        {currentView === 'clausulas' && (
          <ClausesCatalog
            clausulas={clausulas}
            activeRole={user.rol}
            onClauseAdded={handleClauseAdded}
          />
        )}

        {currentView === 'nuevo-contrato' && user.rol === 'GENERADOR' && (
          <ContractWizard
            clientes={clientes}
            clausulas={clausulas}
            activeRole={user.rol}
            onContractGenerated={handleContractGenerated}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'editor' && selectedContractId && (
          <ContractEditorView
            contratoId={selectedContractId}
            activeRole={user.rol}
            onBack={() => {
              setCurrentView('dashboard');
              setSelectedContractId(null);
            }}
            onPrintPreview={handlePrintPreview}
            onContractUpdated={cargarDatos}
          />
        )}

        {currentView === 'guia-exportacion' && (
          <AntigravityExportGuide />
        )}
      </main>

      {/* Pie de página sobrio corporativo */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-700">NovaLex Tecnología Contractual S.A. de C.V.</span> · Soluciones Digitales · RFC Ilustrativo: NTC260101AB1
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Ciudad de México</span>
            <span>·</span>
            <span className="italic">Identidad de Demostración</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
