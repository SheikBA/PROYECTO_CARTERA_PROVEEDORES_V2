const Badge = ({ status, children }) => {
    let classes = `hs-badge hs-badge-${status || 'default'} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border `;

    switch (status?.toLowerCase()) {
        case 'paid':
        case 'completed':
        case 'valid':
        case 'active':
        case 'success':
            classes += "bg-emerald-50 text-emerald-600 border-emerald-100";
            break;
        case 'pending':
        case 'draft':
            classes += "bg-amber-50 text-amber-600 border-amber-100";
            break;
        case 'overdue':
        case 'rejectedh2h':
        case 'inactive':
        case 'danger':
            classes += "bg-red-50 text-danger border-red-100";
            break;
        case 'info':
            classes += "bg-blue-50 text-blue-600 border-blue-100";
            break;
        default:
            classes += "bg-slate-50 text-slate-600 border-slate-200";
    }

    const getLabel = () => {
        if (children) return children;
        switch (status) {
            case 'paid': return 'Pagado';
            case 'pending': return 'Pendiente';
            case 'overdue': return 'Vencido';
            case 'completed': return 'Completado';
            case 'rejectedh2h': return 'Rechazado H2H';
            case 'valid': return 'Válido';
            case 'active': return 'Activa';
            case 'draft': return 'Borrador';
            default: return status || 'Desconocido';
        }
    };

    return (
        <span className={classes}>
            {getLabel()}
        </span>
    );
};

export default Badge;
