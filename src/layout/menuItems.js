// src/layout/menuItems.js
// Fuente única de verdad para la configuración del menú lateral
// Importar DEFAULT_MENU_ITEMS desde aquí en App.jsx

import { DollarSign, CheckCircle2, ShieldAlert, FileText, Database, Layout, Layers, GitMerge } from 'lucide-react';

export const DEFAULT_MENU_ITEMS = [
    { id: 'dataload',            label: 'Carga de Datos',       icon: Database },
    { id: 'payments',            label: 'Gestión de Pagos',     icon: DollarSign },
    { id: 'payments-v2',         label: 'Gestión Pagos V2',     icon: Layers },
    { id: 'multi-batch',         label: 'Multi Propuestas',     icon: GitMerge },
    { id: 'authorized-payments', label: 'Pagos',    icon: CheckCircle2 },
    {
        id: 'rejected-payments', label: 'Pagos Rechazados',     icon: ShieldAlert,
        subItems: [
            { id: 'rejected-h2h',     label: 'Pagos Rechazados H2H' },
            { id: 'rejected-general', label: 'Pagos Rechazados General' },
        ]
    },
    { id: 'reports',    label: 'Reportería',            icon: FileText },
    { id: 'templates',  label: 'Configuración Plantillas', icon: Layout },
];
