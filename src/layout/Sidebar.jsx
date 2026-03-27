import React, { useState } from 'react';
import { Landmark, ChevronLeft, ChevronRight, LogOut, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { APP_VERSION } from '../data/versionHistory';

const Sidebar = ({ sidebarCollapsed, setSidebarCollapsed, currentModule, setCurrentModule, onLogout, menuItems = [], onMoveMenuItem }) => {
    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleSubmenu = (id) => {
        setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-lg relative`}>
            <div className="h-16 flex items-center justify-center border-b border-slate-100 relative shrink-0">
                <Landmark size={28} className="text-primary" />
                {!sidebarCollapsed && (
                    <span className="font-bold ml-2 text-textPrimary flex items-center gap-2">
                        CARTERA
                        <span className="text-[10px] bg-blue-50 text-primary px-1.5 py-0.5 rounded border border-blue-100">
                            {APP_VERSION}
                        </span>
                    </span>
                )}

                {/* Fix Button Positioning: Using translating to right middle border */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-surface border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-400 hover:text-primary transition-colors z-30"
                >
                    {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item, index) => (
                    <div key={item.id} className="relative group">
                        <div className="flex flex-col">
                            <button
                                onClick={() => {
                                    if (item.subItems) {
                                        toggleSubmenu(item.id);
                                    } else {
                                        setCurrentModule(item.id);
                                    }
                                }}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all ${currentModule === item.id || currentModule.startsWith(item.id) ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}`}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={20} />
                                    {!sidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                                </div>
                                {!sidebarCollapsed && item.subItems && (
                                    <ChevronDown size={14} className={`transition-transform ${expandedMenus[item.id] ? 'rotate-180' : ''}`} />
                                )}
                            </button>

                            {/* Submódulos */}
                            {!sidebarCollapsed && item.subItems && expandedMenus[item.id] && (
                                <div className="ml-9 mt-1 space-y-1 border-l border-slate-200 pl-2">
                                    {item.subItems.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setCurrentModule(sub.id)}
                                            className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all ${currentModule === sub.id ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}`}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Controles de Reordenamiento (Solo visibles en hover y si no está colapsado) */}
                        {!sidebarCollapsed && onMoveMenuItem && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded border border-slate-100">
                                <button onClick={(e) => { e.stopPropagation(); onMoveMenuItem(index, 'up'); }} className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-primary disabled:opacity-30" disabled={index === 0}>
                                    <ArrowUp size={10} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onMoveMenuItem(index, 'down'); }} className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-primary disabled:opacity-30" disabled={index === menuItems.length - 1}>
                                    <ArrowDown size={10} />
                                </button>
                            </div>
                        )}
                    </div>
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
