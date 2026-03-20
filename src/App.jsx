import React, { useState } from 'react';
import Login from './pages/Login';
import MainLayout from './layout/MainLayout';
import Templates from './pages/Templates';
import Payments from './pages/Payments';
import { Briefcase } from 'lucide-react';

// Import global mock data
import { INITIAL_RAW_INVOICES, AVAILABLE_INVOICES, INITIAL_TRACKING_DATA } from './data/mockData';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentModule, setCurrentModule] = useState('payments');

  // Global State Architecture
  const [rawInvoices, setRawInvoices] = useState(INITIAL_RAW_INVOICES);
  const [availableInvoices, setAvailableInvoices] = useState(AVAILABLE_INVOICES);
  const [trackingData, setTrackingData] = useState(INITIAL_TRACKING_DATA);

  const handleLogin = (userObj) => {
    setCurrentUser(userObj);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const renderModuleContent = () => {
    switch (currentModule) {
      case 'templates':
        return <Templates />;
      case 'payments':
        return <Payments 
                 rawInvoices={rawInvoices} 
                 setRawInvoices={setRawInvoices}
                 availableInvoices={availableInvoices}
                 setAvailableInvoices={setAvailableInvoices}
                 trackingData={trackingData}
                 setTrackingData={setTrackingData}
               />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 text-slate-400 animate-fade-in">
            <Briefcase size={64} className="opacity-20" />
            <h3 className="text-xl font-bold text-slate-700">Módulo en construcción</h3>
            <p className="text-sm">Estamos construyendo la vista para: <span className="font-bold text-primary">{currentModule}</span></p>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <MainLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      currentModule={currentModule}
      setCurrentModule={setCurrentModule}
    >
      {renderModuleContent()}
    </MainLayout>
  );
};

export default App;
