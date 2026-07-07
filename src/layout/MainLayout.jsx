import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ currentUser, onLogout, children, currentModule, setCurrentModule, menuItems, onMoveMenuItem, themeMode, onToggleTheme, headerTitle, headerSubtitle }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const findMenuItemById = (items, id) => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.subItems) {
                const match = findMenuItemById(item.subItems, id);
                if (match) return match;
            }
        }
        return null;
    };

    const currentModuleItem = findMenuItemById(menuItems, currentModule);
    const currentModuleTitle = currentModuleItem ? currentModuleItem.label : 'Módulo';

    const appName = "PAGOS | Tesorería H2H";

    return (
        <div className="hs-app flex h-screen bg-background font-sans text-textPrimary overflow-hidden w-full">
            <Sidebar
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                currentModule={currentModule}
                setCurrentModule={setCurrentModule}
                onLogout={onLogout}
                menuItems={menuItems}
                onMoveMenuItem={onMoveMenuItem}
                appName={appName}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header
                    currentUser={currentUser}
                    currentModuleTitle={headerTitle || currentModuleTitle}
                    currentModuleSubtitle={headerSubtitle}
                    themeMode={themeMode}
                    onToggleTheme={onToggleTheme}
                />

                <main className="flex-1 overflow-y-auto p-2 sm:p-3 relative">
                    <div className="w-full h-full flex flex-col">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
