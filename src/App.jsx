import { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import Payments from './pages/Payments';
import DataLoad from './layout/DataLoad';
import Login from './pages/Login';
import Reports from './pages/Reports';
import PaymentsV2 from './pages/PaymentsV2';
import MultiBatch from './pages/MultiBatch';
import Templates from './pages/Templates';
import AuthorizedPayments from './pages/AuthorizedPayments';
import { Briefcase } from 'lucide-react';
import { DEFAULT_MENU_ITEMS } from './layout/menuItems';
import { CATALOG_BANCOS_INICIAL, CATALOG_GRUPOS_INICIAL } from './data/catalogs';

const App = () => {
  // Estado de la sesión (simulado)
  const [currentUser, setCurrentUser] = useState(null);

  // Estado de navegación
  const [currentModule, setCurrentModule] = useState('dataload');

  // Estado del Menú (para permitir reordenamiento)
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS.filter(item => item.id !== 'payments'));

  // Estado global de facturas (compartido entre Carga y Pagos)
  const [rawInvoices, setRawInvoices] = useState([]);
  const [authorizedInvoices, setAuthorizedInvoices] = useState([]);
  const [finalizedInvoices, setFinalizedInvoices] = useState([]);
  const [rejectedInvoices, setRejectedInvoices] = useState([]);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [trackingData, setTrackingData] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchList, setBatchList] = useState([]);  // historial de batches para MultiBatch

  // Estado para catálogos dinámicos — inicializados desde catalogs.js
  const [catalogs, setCatalogs] = useState({
    banks: CATALOG_BANCOS_INICIAL,
    companies: [],
    groups: CATALOG_GRUPOS_INICIAL,
  });

  // --- PERSISTENCIA: Cargar datos al iniciar ---
  useEffect(() => {
    const savedData = localStorage.getItem('cartera_app_cache');
    if (savedData) {
      try {
        const { invoices, authorized, finalized, rejected, tracking, cats, batch } = JSON.parse(savedData);
        if (invoices) setRawInvoices(invoices);
        if (authorized) setAuthorizedInvoices(authorized);
        if (finalized) setFinalizedInvoices(finalized);
        if (rejected) setRejectedInvoices(rejected);
        if (tracking) setTrackingData(tracking);
        if (cats) setCatalogs(cats);
        if (batch) setActiveBatch(batch);
        const savedBatchList = localStorage.getItem('cartera_batch_list');
        if (savedBatchList) setBatchList(JSON.parse(savedBatchList));
      } catch (e) {
        console.error("Error cargando caché local", e);
      }
    }
  }, []);

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
    } catch (e) {
      console.warn("El volumen de datos es demasiado grande para el caché local. Los cambios no se persistirán al refrescar.");
    }
  }, [rawInvoices, authorizedInvoices, finalizedInvoices, rejectedInvoices, trackingData, catalogs, activeBatch]);

  useEffect(() => {
    try { localStorage.setItem('cartera_batch_list', JSON.stringify(batchList)); } catch (e) { /* quota */ }
  }, [batchList]);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

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

      case 'multi-batch':
        return (
          <MultiBatch
            batchList={batchList}
            setBatchList={setBatchList}
            currentUser={currentUser}
          />
        );

      case 'authorized-payments':
        return (
          <Payments
            rawInvoices={finalizedInvoices}
            setRawInvoices={setFinalizedInvoices}
            setProposalInvoices={setRawInvoices}
            authorizedInvoices={authorizedInvoices}
            setAuthorizedInvoices={setAuthorizedInvoices}
            setRejectedInvoices={setRejectedInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            catalogs={catalogs}
            activeBatch={activeBatch}
            setActiveBatch={setActiveBatch}
            currentUser={currentUser}
            mode="authorized"
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

  return (
    <MainLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      currentModule={currentModule}
      setCurrentModule={setCurrentModule}
      menuItems={menuItems}
      onMoveMenuItem={moveMenuItem}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;700&family=Roboto:wght@400;600;700&display=swap');
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Open Sans', sans-serif;
          font-weight: 300;
        }
      `}</style>
      <div style={{ fontFamily: "'Roboto', sans-serif", height: '100%' }}>
        {renderContent()}
      </div>
    </MainLayout>
  );
};

export default App;
