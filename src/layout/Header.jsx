import React from 'react';

const Header = ({ currentUser, currentModuleTitle }) => {
    return (
        <header className="h-16 bg-surface border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
            <h1 className="text-xl font-bold text-textPrimary">{currentModuleTitle}</h1>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-bold">{currentUser?.name || 'Usuario'}</p>
                    <p className="text-xs text-textSecondary">{currentUser?.role || 'Contador'}</p>
                </div>
                <div className="h-10 w-10 bg-primary rounded-full text-white flex items-center justify-center font-bold">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>
        </header>
    );
};

export default Header;
