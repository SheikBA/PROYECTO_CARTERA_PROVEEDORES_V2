import { useMemo, useState } from 'react';
import {
    CheckCircle2, Building2, DollarSign, Users, FileText,
    Download, Search, ChevronLeft, ChevronRight, Package, ShieldAlert
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

const PAGE_SIZE = 15;

const AuthorizedPayments = ({ finalizedInvoices, activeBatch, catalogs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    const CATALOG_BANCOS = Array.isArray(catalogs?.banks) ? catalogs.banks : [];

    // --- KPIs del batch ---
    const kpis = useMemo(() => {
        const invoices = finalizedInvoices || [];
        const mxn = invoices.filter(i => i.currency === 'MXN').reduce((s, i) => s + i.amount, 0);
        const usd = invoices.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);
        const providers = new Set(invoices.map(i => i.providerName)).size;
        const banks     = new Set(invoices.map(i => i.bankId)).size;
        const errors    = invoices.filter(i => i.meta?.hasFiscalError).length;
        return { total: invoices.length, mxn, usd, providers, banks, errors };
    }, [finalizedInvoices]);

    // --- Resumen por banco ---
    const bankSummary = useMemo(() => {
        const map = new Map();
        (finalizedInvoices || []).forEach(inv => {
            const bankMeta = CATALOG_BANCOS.find(b => b.id === inv.bankId);
            const key  = inv.bankId || 'Sin Asignar';
            const name = bankMeta?.bank || key;
            const curr = bankMeta?.currency_code || inv.currency || 'MXN';
            if (!map.has(key)) map.set(key, { id: key, name, currency: curr, amount: 0, count: 0 });
            const node = map.get(key);
            node.amount += inv.amount;
            node.count  += 1;
        });
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    }, [finalizedInvoices, CATALOG_BANCOS]);

    // --- Tabla filtrada + paginada ---
    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return (finalizedInvoices || []).filter(inv =>
            !term ||
            String(inv.providerName || '').toLowerCase().includes(term) ||
            String(inv.meta?.invoice || '').toLowerCase().includes(term) ||
            String(inv.bankId || '').toLowerCase().includes(term)
        );
    }, [finalizedInvoices, searchTerm]);

    const totalPages    = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // --- Export CSV ---
    const handleExport = () => {
        let csv = 'Factura,Proveedor,Empresa,Banco,Moneda,Monto,Vencimiento,Grupo\n';
        filtered.forEach(inv => {
            const bankName = CATALOG_BANCOS.find(b => b.id === inv.bankId)?.bank ?? inv.bankId ?? '';
            csv += `"${inv.meta?.invoice ?? ''}","${inv.providerName ?? ''}","${inv.meta?.company ?? ''}","${bankName}","${inv.currency ?? ''}",${inv.amount ?? 0},"${inv.dueDate ?? ''}","${inv.group ?? ''}"\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pagos_autorizados_${activeBatch?.id ?? 'batch'}.csv`;
        link.click();
    };

    // Sin batch finalizado
    if (!activeBatch || !finalizedInvoices || finalizedInvoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 text-slate-400 animate-fade-in">
                <Package size={64} className="opacity-20" />
                <h3 className="text-xl font-bold text-slate-700">Sin Batch Finalizado</h3>
                <p className="text-sm max-w-sm text-slate-500">
                    Aún no se ha finalizado ninguna propuesta de pago. Ve a <strong>Gestión de Pagos</strong>,
                    autoriza facturas y presiona <strong>Finalizar Proceso</strong> para generar un batch.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Pagos Autorizados</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400 font-mono">Batch:</span>
                                <span className="text-xs font-black text-primary font-mono">{activeBatch.id}</span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-xs text-slate-500">
                                    {new Date(activeBatch.createdAt).toLocaleString('es-MX')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <Button variant="success" icon={Download} onClick={handleExport}>
                    Exportar CSV
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-emerald-500 col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total MXN</p>
                    <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(kpis.mxn)}</p>
                </Card>
                <Card className="border-l-4 border-blue-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total USD</p>
                    <p className="text-lg font-black text-blue-700 mt-1">{formatCurrency(kpis.usd)}</p>
                </Card>
                <Card className="border-l-4 border-indigo-400">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Facturas</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-2xl font-black text-slate-800">{kpis.total}</p>
                        <FileText size={16} className="text-indigo-400 mb-1" />
                    </div>
                </Card>
                <Card className="border-l-4 border-violet-400">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Proveedores</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-2xl font-black text-slate-800">{kpis.providers}</p>
                        <Users size={16} className="text-violet-400 mb-1" />
                    </div>
                </Card>
                <Card className={`border-l-4 ${kpis.errors > 0 ? 'border-red-400' : 'border-slate-200'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Inconsistencias</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className={`text-2xl font-black ${kpis.errors > 0 ? 'text-red-600' : 'text-slate-400'}`}>{kpis.errors}</p>
                        <ShieldAlert size={16} className={`mb-1 ${kpis.errors > 0 ? 'text-red-400' : 'text-slate-300'}`} />
                    </div>
                </Card>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden min-h-0">

                {/* Resumen por banco */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                        <Building2 size={14} /> Resumen por Banco
                    </div>
                    <div className="p-2 space-y-1 overflow-y-auto flex-1">
                        {bankSummary.map(b => (
                            <div key={b.id} className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-slate-700 leading-tight">{b.name}</span>
                                    <Badge status={b.currency === 'USD' ? 'success' : 'info'} className="text-[9px] ml-1 shrink-0">
                                        {b.currency}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <span className="text-[10px] text-slate-400">{b.count} facturas</span>
                                    <span className="text-xs font-black text-slate-800">{formatCurrency(b.amount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabla de facturas */}
                <Card className="lg:col-span-3 p-0 flex flex-col overflow-hidden">
                    {/* Buscador */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por proveedor, factura o banco..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                    <th className="p-3">Proveedor</th>
                                    <th className="p-3">Factura</th>
                                    <th className="p-3">Banco</th>
                                    <th className="p-3 text-center">Estado Fiscal</th>
                                    <th className="p-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginated.map((inv, idx) => {
                                    const bankMeta = CATALOG_BANCOS.find(b => b.id === inv.bankId);
                                    return (
                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{inv.providerName}</span>
                                                    <span className="text-[10px] text-slate-400">{inv.meta?.company}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono text-slate-600">{inv.meta?.invoice}</span>
                                                    {inv.meta?.isH2H && (
                                                        <span className="bg-indigo-600 text-white text-[8px] px-1 py-0.5 rounded font-black uppercase">H2H</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-500">
                                                {bankMeta ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{bankMeta.bank.split(' ').slice(0, 2).join(' ')}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{bankMeta.bank_account}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {inv.meta?.hasFiscalError
                                                    ? <Badge status="danger">ERROR</Badge>
                                                    : <Badge status="success">VIGENTE</Badge>}
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="text-[10px] font-bold text-slate-400 mr-1">{inv.currency}</span>
                                                <span className="font-black text-slate-800">{formatCurrency(inv.amount)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginated.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-16 text-center text-slate-400 italic">
                                            No se encontraron facturas con los filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {filtered.length > PAGE_SIZE && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Página {page} de {totalPages} · {filtered.length} registros
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AuthorizedPayments;
