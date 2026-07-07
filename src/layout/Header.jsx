import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const Header = ({ currentUser, currentModuleTitle, currentModuleSubtitle = '', themeMode = 'light', onToggleTheme }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const dateStr = now.toLocaleDateString('es-MX', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    return (
        <header className="min-h-16 bg-surface border-b border-slate-200 flex items-center justify-between gap-2 px-3 py-2 shadow-sm z-10 shrink-0 sm:h-16 sm:px-8 sm:py-0">
            <div className="min-w-0 flex-1 pr-2 sm:pr-6">
                <h1
                    className="truncate text-base font-bold uppercase text-textPrimary sm:text-xl"
                >
                    {currentModuleTitle}
                </h1>
                {currentModuleSubtitle && (
                    <p className="mt-0.5 truncate text-[8px] font-semibold uppercase text-slate-400 sm:text-[10px]">
                        {currentModuleSubtitle}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                    onClick={onToggleTheme}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[0px] font-semibold uppercase text-slate-600 shadow-sm transition-colors hover:bg-slate-50 sm:px-3 sm:text-[10px]"
                    title={themeMode === 'dark' ? 'Cambiar a tema Light' : 'Cambiar a tema Oscuro'}
                >
                    {themeMode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {themeMode === 'dark' ? 'Light' : 'Oscuro'}
                </button>

                {/* Fecha y hora */}
                <div className="hidden flex-col items-end border-r border-slate-200 pr-3 mr-1 md:flex">
                    <span className="text-[11px] font-semibold text-slate-500 capitalize">{dateStr}</span>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">{timeStr}</span>
                </div>

                {/* Usuario */}
                <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                        {currentUser?.name || 'Usuario'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {currentUser?.role || 'Contador'}
                    </p>
                </div>

                {/* Avatar */}
                <div className="h-9 w-9 bg-primary rounded-full text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>
        </header>
    );
};

export default Header;
