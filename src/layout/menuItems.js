// src/layout/menuItems.js
// Fuente unica de verdad para la configuracion del menu lateral.
// Importar DEFAULT_MENU_ITEMS desde aqui en App.jsx.

import {
    Layers,
    GitMerge,
    CheckCircle2,
    Landmark,
    ShieldAlert,
    History,
    Upload,
    FileText,
    Package,
} from 'lucide-react';

export const DEFAULT_MENU_ITEMS = [
    { id: 'payments-v2',          label: 'Gestión de Pagos',           icon: Layers },
    { id: 'authorized-payments',  label: 'Pagos Autorizados',          icon: CheckCircle2 },
    { id: 'payment-verification', label: 'Comprobación de Pagos',      icon: Landmark },
    {
        id: 'rejected-parent', label: 'Pagos Rechazados', icon: ShieldAlert,
        subItems: [
            { id: 'rejected-h2h',     label: 'Rechazados H2H' },
            { id: 'rejected-general', label: 'Rechazados General' },
        ],
    },
    { id: 'multi-batch',          label: 'Multi Propuestas',           icon: GitMerge },
    { id: 'batch-management',     label: 'Gestión de Lotes',           icon: Package },
    { id: 'reports',              label: 'Reportería',                 icon: History },
    { id: 'dataload',             label: 'Carga de Datos',             icon: Upload },
    { id: 'templates',            label: 'Plantillas',                 icon: FileText },
];
