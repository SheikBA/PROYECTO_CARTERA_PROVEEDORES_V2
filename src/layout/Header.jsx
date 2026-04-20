import { useState, useEffect } from 'react';

const Header = ({ currentUser, currentModuleTitle }) => {
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
        <header className="h-16 bg-surface border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
            <h1 className="text-xl font-bold text-textPrimary">{currentModuleTitle}</h1>

            <div className="flex items-center gap-3">
                {/* Fecha y hora */}
                <div className="flex flex-col items-end border-r border-slate-200 pr-3 mr-1">
                    <span className="text-[11px] font-semibold text-slate-500 capitalize">{dateStr}</span>
                    <span className="text-sm font-black text-slate-700 tabular-nums tracking-tight">{timeStr}</span>
                </div>

                {/* Usuario */}
                <div className="text-right">
                    <p className="text-sm font-black text-slate-800 leading-tight">
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
