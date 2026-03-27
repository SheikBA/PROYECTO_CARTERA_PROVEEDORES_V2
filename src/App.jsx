import React, { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import Payments from './pages/Payments';
import DataLoad from './layout/DataLoad';
import Login from './pages/Login';
import Templates from './pages/Templates';
import { Briefcase, DollarSign, CheckCircle2, ShieldAlert, FileText, Database, Layout } from 'lucide-react';

// Nueva Estructura de Menú solicitada
const DEFAULT_MENU_ITEMS = [
  { id: 'dataload', label: 'Carga de Datos', icon: Database },
  { id: 'payments', label: 'Gestión de Pagos', icon: DollarSign },
  { id: 'authorized-payments', label: 'Pagos Autorizados', icon: CheckCircle2 },
  {
    id: 'rejected-payments', label: 'Pagos rechazados', icon: ShieldAlert, subItems: [
      { id: 'rejected-h2h', label: 'Pagos rechazados H2H' },
      { id: 'rejected-general', label: 'Pagos rechazados general' }
    ]
  },
  { id: 'reports', label: 'Reporteria', icon: FileText },
  { id: 'templates', label: 'Plantillas', icon: Layout },
];

const App = () => {
  // Estado de la sesión (simulado)
  const [currentUser, setCurrentUser] = useState(null); // Iniciamos en null para ver el Login

  // Estado de navegación
  const [currentModule, setCurrentModule] = useState('payments');

  // Estado del Menú (para permitir reordenamiento)
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

  // Estado global de facturas (compartido entre Carga y Pagos)
  const [rawInvoices, setRawInvoices] = useState([]);
  const [authorizedInvoices, setAuthorizedInvoices] = useState([]);
  const [rejectedInvoices, setRejectedInvoices] = useState([]);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [trackingData, setTrackingData] = useState([]);

  // Estado para catálogos dinámicos (Bancos, Empresas, Grupos)
  const [catalogs, setCatalogs] = useState({
    banks: [
      { id: "BMX53", bank: "PHOTUR BANAMEX 9553 USD", bank_account: "70029249553", currency_code: "USD", company: "FOTUR" },
      { id: "BMX89", bank: "PHOTUR BANAMEX 2289 MN", bank_account: "70125892289", currency_code: "MXN", company: "FOTUR" },
      { id: "BTE74", bank: "PHOTUR BANORTE 9474 USD", bank_account: "1146489474", currency_code: "USD", company: "FOTUR" },
      { id: "BTE01", bank: "GPF BANORTE 1328210401 MXN", bank_account: "1328210401", currency_code: "MXN", company: "GPFSERV" },
      { id: "BTE36", bank: "GPF BANORTE 1328210362 USD", bank_account: "1328210362", currency_code: "USD", company: "GPFSERV" },
      { id: "PFM01", bank: "GPF BANAMEX 7139 MN", bank_account: "70143507139", currency_code: "MXN", company: "GPFSERV" },
      { id: "BN420", bank: "ISLA 17 BANORTE 9420 MN", bank_account: "0471709420", currency_code: "MXN", company: "HQISLA" },
      { id: "BT641", bank: "ISLA 17 BANORTE 3641 USD", bank_account: "0471713641", currency_code: "USD", company: "HQISLA" },
      { id: "BX233", bank: "ISLA 17 BANAMEX 4233 USD", bank_account: "70029024233", currency_code: "USD", company: "HQISLA" },
      { id: "BX358", bank: "ISLA 17 BANAMEX 6358 MN", bank_account: "70114296358", currency_code: "MXN", company: "HQISLA" },
      { id: "BMX15", bank: "PENINSULA 7 BANAMEX 0715 USD", bank_account: "70029180715", currency_code: "USD", company: "HQPEN7" },
      { id: "BNT75", bank: "PENINSULA 7 BANORTE 8275 USD", bank_account: "1140848275", currency_code: "USD", company: "HQPEN7" },
      { id: "BNX72", bank: "PENINSULA 7 BANAMEX 8072 MN", bank_account: "70172088072", currency_code: "MXN", company: "HQPEN7" },
      { id: "SND75", bank: "PENINSULA 7 SANTANDER 5775 USD", bank_account: "82500785775", currency_code: "USD", company: "HQPEN7" },
      { id: "SND95", bank: "PENINSULA 7 SANTANDER 3956 MN", bank_account: "65505953956", currency_code: "MXN", company: "HQPEN7" },
      { id: "26293", bank: "PHOTOPRO BANORTE 6293 USD", bank_account: "0494726293", currency_code: "USD", company: "HQPHOTO" },
      { id: "59443", bank: "PHOTOPRO BANAMEX 9443 MN", bank_account: "70085159443", currency_code: "MXN", company: "HQPHOTO" },
      { id: "B5631", bank: "PHOTOPRO BANAMEX 5631 USD", bank_account: "70009555631", currency_code: "USD", company: "HQPHOTO" },
      { id: "BN651", bank: "HSPRO BANORTE 9651 USD", bank_account: "0471699651", currency_code: "USD", company: "HSPRO" },
      { id: "BX145", bank: "HSPRO BANAMEX 8145 MN", bank_account: "70082288145", currency_code: "MXN", company: "HSPRO" },
      { id: "BX360", bank: "HSPRO BANAMEX 0360 USD", bank_account: "70029040360", currency_code: "USD", company: "HSPRO" },
      { id: "BX515", bank: "HSPRO Banamex 701-1507-0515", bank_account: "70115070515", currency_code: "MXN", company: "HSPRO" },
      { id: "BX551", bank: "HSPRO Banamex 700-2903-0551", bank_account: "70029030551", currency_code: "USD", company: "HSPRO" },
      { id: "BX570", bank: "HSPRO Banamex 701-1482-8570", bank_account: "70114828570", currency_code: "MXN", company: "HSPRO" },
      { id: "BX920", bank: "HSPRO Banamex 70009455920 USD", bank_account: "70009455920", currency_code: "USD", company: "HSPRO" },
      { id: "SCO76", bank: "PEL JAM SCOTIABANK 1032576 JMD", bank_account: "1032576", currency_code: "JMD", company: "PELJAM" },
      { id: "SCO79", bank: "PEL JAM SCOTIABANK 1032579 USD", bank_account: "1032579", currency_code: "USD", company: "PELJAM" },
      { id: "BTE64", bank: "PTO 85 BANORTE 2264 USD", bank_account: "1160372264", currency_code: "USD", company: "PTO85" },
      { id: "P8B16", bank: "PTO 85 BANAMEX 1116 USD", bank_account: "70029251116", currency_code: "USD", company: "PTO85" },
      { id: "P8B70", bank: "PTO 85 BANAMEX 6270 MN", bank_account: "70125996270", currency_code: "MXN", company: "PTO85" },
      { id: "P8S02", bank: "PTO 85 SANTANDER 2216 USD", bank_account: "82500842216", currency_code: "USD", company: "PTO85" },
      { id: "P8S04", bank: "PTO 85 SANTANDER 5619 MN", bank_account: "65506525619", currency_code: "MXN", company: "PTO85" },
      { id: "BN652", bank: "PTO ARENAS BANORTE 4652", bank_account: "1019994652", currency_code: "USD", company: "PTOARENA" },
      { id: "PAB38", bank: "PTO ARENAS BANAMEX 7538 MN", bank_account: "70123537538", currency_code: "MXN", company: "PTOARENA" },
      { id: "PAB89", bank: "PTO ARENAS BANAMEX 8489 USD", bank_account: "70029238489", currency_code: "USD", company: "PTOARENA" },
      { id: "PAS81", bank: "PTO ARENAS SANTANDER 2281 USD", bank_account: "82500842281", currency_code: "USD", company: "PTOARENA" },
      { id: "PAS87", bank: "PTO ARENAS SANTANDER 6187 MN", bank_account: "65506526187", currency_code: "MXN", company: "PTOARENA" },
      { id: "PHB25", bank: "PTO HS BANORTE 0225 USD", bank_account: "1019990225", currency_code: "USD", company: "PTOHS" },
      { id: "PHS21", bank: "PTO HS BANORTE 8521 MN", bank_account: "1019988521", currency_code: "MXN", company: "PTOHS" },
      { id: "PHS42", bank: "PTO HS SANTANDER 2307 USD", bank_account: "82500842307", currency_code: "USD", company: "PTOHS" },
      { id: "PHS44", bank: "PTO HS SANTANDER 6676 MN", bank_account: "65506526676", currency_code: "MXN", company: "PTOHS" },
      { id: "PHS45", bank: "PTO HS BANORTE 8042 MN", bank_account: "0593148042", currency_code: "MXN", company: "PTOHS" },
      { id: "PHS48", bank: "PTO HS BANAMEX 7511 MN", bank_account: "70123537511", currency_code: "MXN", company: "PTOHS" },
      { id: "PHS49", bank: "PTO HS BANAMEX 7215 USD", bank_account: "70029227215", currency_code: "USD", company: "PTOHS" },
    ],
    companies: [],
    groups: [
      { group: "ACCP", description: "ACRED CTO PLAZO" },
      { group: "ACCP", description: "SHORT TERMS" },
      { group: "ACRE", description: "ACREEDORES" },
      { group: "ADUA", description: "AGENTE ADUANAL" },
      { group: "GRAL", description: "GASTO GENERAL" },
      { group: "HOTE", description: "HOTEL" },
      { group: "HOTE", description: "HOTELS" },
      { group: "HTLS", description: "HOTELES" },
      { group: "Impo", description: "importacion" },
      { group: "MCIA", description: "PROVEEDOR MERCANCIA" },
      { group: "PBOU", description: "PROV BOUTIQUE" },
      { group: "PBOU", description: "BOUTIQUE SUPPLIER" },
      { group: "PCOR", description: "PROV CORPORATIVO" },
      { group: "PJOY", description: "PROV JOYERIA" },
      { group: "PMCA", description: "PROV MARCAS" },
      { group: "PROV", description: "GENERAL" },
      { group: "PROV", description: "PROVEEDOR" },
      { group: "PTAB", description: "PROV TABAQUERIA" },
      { group: "PTAB", description: "GIFT SHOP SUPPLIER" },
      { group: "PTRL", description: "PARTES RELACIONADAS" },
      { group: "PTRL", description: "RELATED PARTS" },
      { group: "PTRL", description: "RELATED PARTIES" },
      { group: "PTRL", description: "RELATES PARTS" },
      { group: "REEM", description: "REEMBOLSOS" },
      { group: "REEM", description: "REEMBOLSO" },
      { group: "SHOP", description: "SHOPS" }
    ]
  });

  // --- PERSISTENCIA: Cargar datos al iniciar ---
  useEffect(() => {
    const savedData = localStorage.getItem('cartera_app_cache');
    if (savedData) {
      try {
        const { invoices, authorized, rejected, tracking, cats } = JSON.parse(savedData);
        if (invoices) setRawInvoices(invoices);
        if (authorized) setAuthorizedInvoices(authorized);
        if (rejected) setRejectedInvoices(rejected);
        if (tracking) setTrackingData(tracking);
        if (cats) setCatalogs(cats);
      } catch (e) {
        console.error("Error cargando caché local", e);
      }
    }
  }, []);

  // --- PERSISTENCIA: Guardar cambios automáticamente ---
  useEffect(() => {
    const dataToSave = { invoices: rawInvoices, authorized: authorizedInvoices, rejected: rejectedInvoices, tracking: trackingData, cats: catalogs };
    try {
      localStorage.setItem('cartera_app_cache', JSON.stringify(dataToSave));
    } catch (e) {
      console.warn("El volumen de datos es demasiado grande para el caché local. Los cambios no se persistirán al refrescar.");
    }
  }, [rawInvoices, trackingData, catalogs]);

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
            setProposalInvoices={setRawInvoices}
            authorizedInvoices={authorizedInvoices}
            setAuthorizedInvoices={setAuthorizedInvoices}
            setRejectedInvoices={setRejectedInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            catalogs={catalogs}
            mode="proposal"
          />
        );
      case 'authorized-payments':
        return (
          <Payments
            rawInvoices={authorizedInvoices}
            setRawInvoices={setAuthorizedInvoices}
            availableInvoices={availableInvoices}
            setAvailableInvoices={setAvailableInvoices}
            trackingData={trackingData}
            setTrackingData={setTrackingData}
            catalogs={catalogs}
            mode="authorized"
          />
        );
      case 'rejected-h2h':
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
            mode="rejected"
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
