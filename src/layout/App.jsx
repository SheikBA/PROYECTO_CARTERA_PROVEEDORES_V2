import React, { useState } from 'react';
import MainLayout from './MainLayout';
import Payments from '../pages/Payments';
import DataLoad from './DataLoad';
import Login from '../pages/Login';

// Datos iniciales simulados (puedes moverlos a un archivo separado si prefieres)
import { INITIAL_RAW_INVOICES } from '../data/mockData';
import { MENU_ITEMS as DEFAULT_MENU_ITEMS } from './menuItems';

const App = () => {
    // Estado de la sesión (simulado)
    const [currentUser, setCurrentUser] = useState(null); // Iniciamos en null para ver el Login

    // Estado de navegación
    const [currentModule, setCurrentModule] = useState('payments');

    // Estado del Menú (para permitir reordenamiento)
    const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

    // Estado global de facturas (compartido entre Carga y Pagos)
    const [rawInvoices, setRawInvoices] = useState(INITIAL_RAW_INVOICES || []);
    const [availableInvoices, setAvailableInvoices] = useState([]); // Para el buscador del ERP
    const [trackingData, setTrackingData] = useState([]); // Histórico de pagos

    const handleLogout = () => {
        alert("Cerrando sesión...");
        // Aquí iría tu lógica de logout
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
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p>Módulo {currentModule} en construcción</p>
                    </div>
                );
        }
    };

    if (!currentUser) {
        return <Login onLogin={(user) => setCurrentUser(user)} />;
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