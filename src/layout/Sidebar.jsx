import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { APP_VERSION } from '../data/versionHistory';

const Sidebar = ({ sidebarCollapsed, setSidebarCollapsed, currentModule, setCurrentModule, onLogout, menuItems = [], onMoveMenuItem }) => {
    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleSubmenu = (id) => {
        setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <aside className={`${sidebarCollapsed ? 'w-16 md:w-20' : 'w-16 md:w-64'} bg-surface border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-lg relative shrink-0`}>
            <div className={`${sidebarCollapsed ? 'h-16' : 'h-16 md:h-auto md:py-5'} flex flex-col items-center justify-center border-b border-slate-100 relative shrink-0 transition-all duration-300`}>
                <div className="hs-logo-mark" aria-label="Hotel Shops">
                    <span />
                    <span />
                    <span />
                </div>
                {!sidebarCollapsed && (
                    <div className="hidden flex-col items-center mt-2 md:flex">
                        <span className="font-bold text-textPrimary text-xs text-center leading-tight px-10">
                            CARTERA DE PROVEEDORES
                        </span>
                        <span className="text-[10px] bg-blue-50 text-primary px-1.5 py-0.5 rounded border border-blue-100 mt-1">
                            {APP_VERSION}
                        </span>
                    </div>
                )}

                {/* Botón de colapso */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-surface p-1.5 text-slate-400 shadow-sm transition-colors hover:text-primary md:block"
                >
                    {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 md:px-3 md:py-6">
                {menuItems.map((item, index) => {
                    const isActive = currentModule === item.id
                        || (item.subItems && item.subItems.some(s => s.id === currentModule));
                    return (
                        <div key={item.id} className="relative group">
                            <div className="flex flex-col">
                                <button
                                    onClick={() => {
                                        if (item.subItems) {
                                            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                                setCurrentModule(item.subItems[0].id);
                                            } else {
                                                toggleSubmenu(item.id);
                                            }
                                        } else {
                                            setCurrentModule(item.id);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all md:justify-between ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}`}
                                    title={sidebarCollapsed ? item.label : ''}
                                >
                                    <div className="flex items-center justify-center gap-3 md:justify-start">
                                        <item.icon size={20} />
                                        {!sidebarCollapsed && <span className="hidden font-medium text-sm whitespace-nowrap md:inline">{item.label}</span>}
                                    </div>
                                    {!sidebarCollapsed && item.subItems && (
                                        <ChevronDown size={14} className={`hidden transition-transform md:block ${expandedMenus[item.id] ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {/* Submódulos */}
                                {!sidebarCollapsed && item.subItems && expandedMenus[item.id] && (
                                    <div className="ml-9 mt-1 hidden space-y-1 border-l border-slate-200 pl-2 md:block">
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

                            {/* Controles de reordenamiento */}
                            {!sidebarCollapsed && onMoveMenuItem && (
                                <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 flex-col rounded border border-slate-100 bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 md:flex">
                                    <button onClick={(e) => { e.stopPropagation(); onMoveMenuItem(index, 'up'); }} className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-primary disabled:opacity-30" disabled={index === 0}>
                                        <ArrowUp size={10} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onMoveMenuItem(index, 'down'); }} className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-primary disabled:opacity-30" disabled={index === menuItems.length - 1}>
                                        <ArrowDown size={10} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-2 border-t border-slate-100 shrink-0 md:p-4">
                <button
                    onClick={onLogout}
                    className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'md:justify-center' : 'md:justify-start'} gap-3 px-3 py-2 text-slate-500 hover:text-danger hover:bg-red-50 rounded-lg transition-colors`}
                    title={sidebarCollapsed ? 'Cerrar Sesión' : ''}
                >
                    <LogOut size={20} />
                    {!sidebarCollapsed && <span className="hidden font-medium text-sm whitespace-nowrap md:inline">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
