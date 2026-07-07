import { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import Payments from './pages/Payments';
import DataLoad from './layout/DataLoad';
import Login from './pages/Login';
import Reports from './pages/Reports';
import PaymentsV2 from './pages/PaymentsV2';
import MultiBatch from './pages/MultiBatch';
import Templates from './pages/Templates';
import PaymentVerification from './pages/PaymentVerification';
import AuthorizedPayments from './pages/AuthorizedPayments';
import BatchManagement from './pages/BatchManagement';
import { Briefcase } from 'lucide-react';
import { DEFAULT_MENU_ITEMS } from './layout/menuItems';
import { CATALOG_BANCOS_INICIAL, CATALOG_GRUPOS_INICIAL, CATALOG_COMPANIAS_INICIAL } from './data/catalogs';

const loadAppCache = () => {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(window.localStorage.getItem('cartera_app_cache') || '{}') || {};
  } catch {
    return {};
  }
};

const loadBatchList = () => {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem('cartera_batch_list') || '[]') || [];
  } catch {
    return [];
  }
};

const App = () => {
  const [initialCache] = useState(loadAppCache);
  // Estado de la sesión (simulado)
  const [currentUser, setCurrentUser] = useState(null);

  // Estado de navegación
  const [currentModule, setCurrentModule] = useState('dataload');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('cartera_theme_mode') || 'light');

  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

  // Estado global de facturas (compartido entre Carga y Pagos)
  const [rawInvoices, setRawInvoices] = useState(() => initialCache.invoices || []);
  const [authorizedInvoices, setAuthorizedInvoices] = useState(() => initialCache.authorized || []);
  const [finalizedInvoices, setFinalizedInvoices] = useState(() => initialCache.finalized || []);
  const [rejectedInvoices, setRejectedInvoices] = useState(() => initialCache.rejected || []);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [trackingData, setTrackingData] = useState(() => initialCache.tracking || []);
  const [activeBatch, setActiveBatch] = useState(() => initialCache.batch || null);
  const [batchList, setBatchList] = useState(loadBatchList);  // historial de batches para MultiBatch

  // Estado para catálogos dinámicos — inicializados desde catalogs.js
  const [catalogs] = useState(() => initialCache.cats || {
    banks: CATALOG_BANCOS_INICIAL,
    companies: CATALOG_COMPANIAS_INICIAL,
    groups: CATALOG_GRUPOS_INICIAL,
  });

  // --- PERSISTENCIA: Guardar cambios automáticamente ---
  useEffect(() => {
    const dataToSave = {
      invoices: rawInvoices,
      authorized: authorizedInvoices,
      finalized: finalizedInvoices,
      rejected: rejectedInvoices,
      tracking: trackingData,
      cats: catalogs,
      batch: activeBatch,
    };
    try {
      localStorage.setItem('cartera_app_cache', JSON.stringify(dataToSave));
    } catch {
      // cuota localStorage excedida — datos no persistidos en esta sesión
    }
  }, [rawInvoices, authorizedInvoices, finalizedInvoices, rejectedInvoices, trackingData, catalogs, activeBatch]);

  useEffect(() => {
    try { localStorage.setItem('cartera_batch_list', JSON.stringify(batchList)); } catch { /* quota */ }
  }, [batchList]);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);
  const toggleThemeMode = () => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem('cartera_theme_mode', themeMode);
  }, [themeMode]);

  const findMenuItemById = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subItems) {
        const match = findMenuItemById(item.subItems, id);
        if (match) return match;
      }
    }
    return null;
  };

  const formatBatchDateTime = (value) => {
    if (!value) return 'SIN FECHA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'SIN FECHA';
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getCurrentModuleHeader = () => {
    const menuItem = findMenuItemById(menuItems, currentModule);
    const fallbackTitle = menuItem?.label || currentModule || 'Módulo';

    const headers = {
      dataload: {
        title: 'CARGAR FUENTE DE DATOS',
        subtitle: 'SUBE TUS ARCHIVOS EXCEL PARA ALIMENTAR EL FLUJO DE PAGOS',
      },
      'payments-v2': {
        title: 'GESTIÓN DE PAGOS V2',
        subtitle: 'PORTAL HS | CARTERA DE PROVEEDORES',
      },
      'multi-batch': {
        title: 'LISTA DE PROPUESTAS DE PAGO',
        subtitle: 'GESTIÓN Y CONSOLIDACIÓN DE LOTES PARA ENVÍO A APROBACIÓN',
      },
      'authorized-payments': {
        title: 'PAGOS AUTORIZADOS',
        subtitle: `BATCH: ${activeBatch?.id || 'SIN BATCH'} | ${formatBatchDateTime(activeBatch?.createdAt)}`,
      },
      'payment-verification': {
        title: 'COMPROBACIÓN DE PAGOS',
        subtitle: 'CARTERA DE PROVEEDORES | P2',
      },
      'rejected-h2h': {
        title: 'PAGOS RECHAZADOS H2H',
        subtitle: 'HISTORIAL Y REPROCESO DE PAGOS',
      },
      'rejected-general': {
        title: 'PAGOS RECHAZADOS',
        subtitle: 'HISTORIAL Y REPROCESO DE PAGOS',
      },
      reports: {
        title: 'HOTEL SHOPS - REPORTERÍA FISCAL',
        subtitle: 'CONTROL INTERNO Y AUDITORÍA DE PAGOS',
      },
      templates: {
        title: 'CONFIGURACIÓN DE PLANTILLAS',
        subtitle: 'CARTERA DE PROVEEDORES | EP-2829',
      },
      'batch-management': {
        title: 'GESTIÓN DE LOTES',
        subtitle: 'ADMINISTRA Y CONSOLIDA LOS BATCHES GENERADOS EN GESTIÓN DE PAGOS',
      },
    };

    return headers[currentModule] || {
      title: String(fallbackTitle).toUpperCase(),
      subtitle: '',
    };
  };

  // Función para mover módulos en el sidebar
  const moveMenuItem = (index, direction) => {
    const newItems = [...menuItems];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setMenuItems(newItems);
  };

  const renderContent = () => {
    switch (currentModule) {
      case 'templates':
        return <Templates />;

      case 'dataload':
        return (
          <DataLoad
            setRawInvoices={setRawInvoices}
            setCurrentModule={setCurrentModule}
          />
        );

      case 'payments-v2':
        return (
          <PaymentsV2
            rawInvoices={rawInvoices}
            setRawInvoices={setRawInvoices}
            catalogs={catalogs}
            authorizedInvoices={authorizedInvoices}
            setAuthorizedInvoices={setAuthorizedInvoices}
            finalizedInvoices={finalizedInvoices}
            setFinalizedInvoices={setFinalizedInvoices}
            activeBatch={activeBatch}
            setActiveBatch={setActiveBatch}
            batchList={batchList}
            setBatchList={setBatchList}
          />
        );

      case 'payment-verification':
        return (
          <PaymentVerification
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            finalizedInvoices={finalizedInvoices}
          />
        );


      case 'multi-batch':
        return (
          <MultiBatch
            batchList={batchList}
            setBatchList={setBatchList}
            setRawInvoices={setRawInvoices}
            currentUser={currentUser}
            finalizedInvoices={finalizedInvoices}
            activeBatch={activeBatch}
          />
        );

      case 'authorized-payments':
        return (
          <AuthorizedPayments
            finalizedInvoices={finalizedInvoices}
            setFinalizedInvoices={setFinalizedInvoices}
            setTrackingData={setTrackingData}
            setRejectedInvoices={setRejectedInvoices}
            activeBatch={activeBatch}
            catalogs={catalogs}
          />
        );

      case 'batch-management':
        return (
          <BatchManagement
            batches={batchList}
            setBatches={setBatchList}
            setFinalizedInvoices={setFinalizedInvoices}
            currentUser={currentUser}
          />
        );

      case 'rejected-h2h':
        return (
          <Payments
            rawInvoices={rejectedInvoices}
            setRawInvoices={setRejectedInvoices}
            setProposalInvoices={setRawInvoices}
            authorizedInvoices={authorizedInvoices}
            setAuthorizedInvoices={setAuthorizedInvoices}
            setRejectedInvoices={setRejectedInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            catalogs={catalogs}
            currentUser={currentUser}
            mode="rejected"
            subMode="h2h"
          />
        );

      case 'rejected-general':
        return (
          <Payments
            rawInvoices={rejectedInvoices}
            setRawInvoices={setRejectedInvoices}
            setProposalInvoices={setRawInvoices}
            authorizedInvoices={authorizedInvoices}
            setAuthorizedInvoices={setAuthorizedInvoices}
            setRejectedInvoices={setRejectedInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            catalogs={catalogs}
            currentUser={currentUser}
            mode="rejected"
            subMode="general"
          />
        );

      case 'reports':
        return (
          <Reports
            rejectedInvoices={rejectedInvoices}
            trackingData={trackingData}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 text-slate-400 animate-fade-in">
            <Briefcase size={64} className="opacity-20" />
            <h3 className="text-xl font-bold text-slate-700">Módulo en construcción</h3>
            <p className="text-sm">
              Estamos construyendo la vista para:{' '}
              <span className="font-bold text-primary">
                {menuItems.find(m => m.id === currentModule)?.label || currentModule}
              </span>
            </p>
          </div>
        );
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const currentModuleHeader = getCurrentModuleHeader();

  return (
    <MainLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      currentModule={currentModule}
      setCurrentModule={setCurrentModule}
      menuItems={menuItems}
      onMoveMenuItem={moveMenuItem}
      themeMode={themeMode}
      onToggleTheme={toggleThemeMode}
      headerTitle={currentModuleHeader.title}
      headerSubtitle={currentModuleHeader.subtitle}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@600;700&family=Roboto:wght@400;500;600;700&display=swap');
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Open Sans', sans-serif;
        }
      `}</style>
      <div style={{ fontFamily: "'Roboto', sans-serif", height: '100%' }}>
        {renderContent()}
      </div>
    </MainLayout>
  );
};

export default App;
