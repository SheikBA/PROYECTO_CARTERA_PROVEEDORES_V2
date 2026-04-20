import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ currentUser, onLogout, children, currentModule, setCurrentModule, menuItems, onMoveMenuItem }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const currentModuleItem = menuItems.find(m => m.id === currentModule);
    const currentModuleTitle = currentModuleItem ? currentModuleItem.label : 'Módulo';

    return (
        <div className="flex h-screen bg-background font-sans text-textPrimary overflow-hidden w-full">
            <Sidebar
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                currentModule={currentModule}
                setCurrentModule={setCurrentModule}
                onLogout={onLogout}
                menuItems={menuItems}
                onMoveMenuItem={onMoveMenuItem}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header
                    currentUser={currentUser}
                    currentModuleTitle={currentModuleTitle}
                />

                <main className="flex-1 overflow-y-auto p-3 relative">
                    <div className="w-full h-full flex flex-col">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
