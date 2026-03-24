import { FileText, CreditCard, Search, Database, CheckCircle, Users } from 'lucide-react';

export const MENU_ITEMS = [
    {
        id: "templates",
        label: "Config. Plantillas",
        icon: FileText
    },
    {
        id: "users",
        label: "Usuarios y Permisos",
        icon: Users
    },
    {
        id: "payments",
        label: "Gestión de Pagos",
        icon: CreditCard
    },
    {
        id: "tracking",
        label: "Rastreo / Comprobación",
        icon: Search
    },
    {
        id: "dataload",
        label: "Cargar Fuente de Datos",
        icon: Database
    },
    {
        id: "verification",
        label: "Auditoría",
        icon: CheckCircle
    }
];