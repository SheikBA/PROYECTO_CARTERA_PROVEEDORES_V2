import React from 'react';
import { Landmark, ChevronLeft, ChevronRight, LogOut, FileText, CreditCard, Search, Database, CheckCircle, Users } from 'lucide-react';

const MENU_ITEMS = [
    { id: 'templates', label: 'Config. Plantillas', icon: FileText },
    { id: 'payments', label: 'Gestión de Pagos', icon: CreditCard },
    { id: 'tracking', label: 'Rastreo / Comprobación', icon: Search },
    { id: 'dataload', label: 'Cargar Fuente de Datos', icon: Database },
    { id: 'verification', label: 'Auditoría', icon: CheckCircle },
    { id: 'users', label: 'Usuarios y Permisos', icon: Users },
];

const Sidebar = ({ sidebarCollapsed, setSidebarCollapsed, currentModule, setCurrentModule, onLogout }) => {
    return (
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-lg relative`}>
            <div className="h-16 flex items-center justify-center border-b border-slate-100 relative shrink-0">
                <Landmark size={28} className="text-primary" />
                {!sidebarCollapsed && <span className="font-bold ml-2 text-textPrimary">CARTERA</span>}

                {/* Fix Button Positioning: Using translating to right middle border */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-surface border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-400 hover:text-primary transition-colors z-30"
                >
                    {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {MENU_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentModule(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentModule === item.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        title={sidebarCollapsed ? item.label : ''}
                    >
                        <item.icon size={20} className={currentModule === item.id ? 'text-white' : ''} />
                        {!sidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100 shrink-0">
                <button
                    onClick={onLogout}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 text-slate-500 hover:text-danger hover:bg-red-50 rounded-lg transition-colors`}
                    title={sidebarCollapsed ? 'Cerrar Sesión' : ''}
                >
                    <LogOut size={20} />
                    {!sidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
export { MENU_ITEMS };
