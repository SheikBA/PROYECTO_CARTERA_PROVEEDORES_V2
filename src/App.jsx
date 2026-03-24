import React, { useState } from 'react';
import MainLayout from './layout/MainLayout';
import Payments from './pages/Payments';
import DataLoad from './layout/DataLoad';
import Login from './pages/Login';
import Templates from './pages/Templates';
import { Briefcase } from 'lucide-react';

// Import global mock data
import { INITIAL_RAW_INVOICES, AVAILABLE_INVOICES, INITIAL_TRACKING_DATA } from './data/mockData';
import { MENU_ITEMS as DEFAULT_MENU_ITEMS } from './layout/menuItems';

const App = () => {
  // Estado de la sesión (simulado)
  const [currentUser, setCurrentUser] = useState(null); // Iniciamos en null para ver el Login

  // Estado de navegación
  const [currentModule, setCurrentModule] = useState('payments');

  // Estado del Menú (para permitir reordenamiento)
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

  // Estado global de facturas (compartido entre Carga y Pagos)
  const [rawInvoices, setRawInvoices] = useState(INITIAL_RAW_INVOICES || []);
  const [availableInvoices, setAvailableInvoices] = useState(AVAILABLE_INVOICES || []);
  const [trackingData, setTrackingData] = useState(INITIAL_TRACKING_DATA || []);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Función para mover módulos (Requerimiento JSON #5)
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
      case 'payments':
        return (
          <Payments
            rawInvoices={rawInvoices}
            setRawInvoices={setRawInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
          />
        );
      case 'dataload':
        return (
          <DataLoad
            setRawInvoices={setRawInvoices}
            setCurrentModule={setCurrentModule}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 text-slate-400 animate-fade-in">
            <Briefcase size={64} className="opacity-20" />
            <h3 className="text-xl font-bold text-slate-700">Módulo en construcción</h3>
            <p className="text-sm">Estamos construyendo la vista para: <span className="font-bold text-primary">{menuItems.find(m => m.id === currentModule)?.label || currentModule}</span></p>
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
      {renderContent()}
    </MainLayout>
  );
};

export default App;
