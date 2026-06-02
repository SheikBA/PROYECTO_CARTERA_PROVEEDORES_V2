import { useState, useMemo } from 'react';
import { ShieldAlert, History, Download, Search, Filter, Calendar, Printer, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const PAGE_SIZE = 15;

const Reports = ({ rejectedInvoices, trackingData }) => {
    const [activeTab, setActiveTab] = useState('rejected');
    const [filterTerm, setFilterTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [rejectedPage, setRejectedPage] = useState(1);
    const [changelogPage, setChangelogPage] = useState(1);

    // --- Reporte 1: Facturas Rechazadas ---
    const filteredRejected = useMemo(() => {
        return (rejectedInvoices || []).filter(inv => {
            const matchesSearch =
                String(inv.providerName || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
                String(inv.meta?.invoice || '').toLowerCase().includes(filterTerm.toLowerCase());
            const matchesDate = dateFilter
                ? inv.rejectedAt?.startsWith(dateFilter)
                : true;
            return matchesSearch && matchesDate;
        });
    }, [rejectedInvoices, filterTerm, dateFilter]);

    const rejectedTotalPages = Math.ceil(filteredRejected.length / PAGE_SIZE) || 1;
    const paginatedRejected = filteredRejected.slice((rejectedPage - 1) * PAGE_SIZE, rejectedPage * PAGE_SIZE);

    // --- Reporte 2: Log de Cambios ---
    const changeLog = useMemo(() => {
        const allItems = [...(trackingData || []), ...(rejectedInvoices || [])];
        const logs = [];

        allItems.forEach(item => {
            if (Array.isArray(item.auditLog)) {
                item.auditLog.forEach(log => {
                    logs.push({
                        ...log,
                        invoice: item.meta?.invoice || 'S/N',
                        provider: item.providerName,
                        amount: item.amount,
                        trackingId: item.trackingId || 'N/A',
                    });
                });
            }
        });

        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .filter(log =>
                String(log.provider || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
                String(log.event || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
                String(log.invoice || '').toLowerCase().includes(filterTerm.toLowerCase())
            );
    }, [trackingData, rejectedInvoices, filterTerm]);

    const changelogTotalPages = Math.ceil(changeLog.length / PAGE_SIZE) || 1;
    const paginatedChangelog = changeLog.slice((changelogPage - 1) * PAGE_SIZE, changelogPage * PAGE_SIZE);

    // --- Exportar a CSV ---
    const handleExport = () => {
        let csv = '';

        if (activeTab === 'rejected') {
            csv = 'Fecha Rechazo,Factura,Proveedor,Monto,Tipo,Rechazado Por\n';
            filteredRejected.forEach(inv => {
                const fecha = formatDate(inv.rejectedAt) || 'N/A';
                const factura = inv.meta?.invoice ?? '';
                const prov = inv.providerName ?? '';
                const monto = inv.amount ?? 0;
                const tipo = inv.meta?.isH2H ? 'H2H' : 'GENERAL';
                const usuario = inv.auditLog?.[inv.auditLog.length - 1]?.user ?? 'Admin';
                csv += `"${fecha}","${factura}","${prov}",${monto},"${tipo}","${usuario}"\n`;
            });
        } else {
            csv = 'Fecha/Hora,Usuario,Evento,Factura,Proveedor,Detalle\n';
            changeLog.forEach(log => {
                const fecha = formatDate(log.timestamp) || '';
                const usuario = log.user ?? 'Sistema';
                const evento = log.event ?? '';
                const factura = log.invoice ?? '';
                const prov = log.provider ?? '';
                const detalle = log.details ?? '';
                csv += `"${fecha}","${usuario}","${evento}","${factura}","${prov}","${detalle}"\n`;
            });
        }

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = activeTab === 'rejected' ? 'facturas_rechazadas.csv' : 'log_cambios.csv';
        link.click();
    };

    // --- Paginador genérico ---
    const Paginator = ({ page, totalPages, onPageChange }) => (
        <div className="flex justify-between items-center p-3 border-t border-slate-100 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Hotel Shops — Reportería Fiscal</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Interno y Auditoría de Pagos</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" icon={Printer} size="sm" onClick={() => window.print()}>
                        Imprimir
                    </Button>
                    <Button variant="success" icon={Download} size="sm" onClick={handleExport}>
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => { setActiveTab('rejected'); setRejectedPage(1); }}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'rejected' ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <ShieldAlert size={18} /> FACTURAS RECHAZADAS
                    {filteredRejected.length > 0 && (
                        <span className="ml-1 bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{filteredRejected.length}</span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('changelog'); setChangelogPage(1); }}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'changelog' ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={18} /> LOG DE CAMBIOS (CONTROL)
                    {changeLog.length > 0 && (
                        <span className="ml-1 bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{changeLog.length}</span>
                    )}
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[250px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Búsqueda General</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Proveedor, factura, evento..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={filterTerm}
                            onChange={(e) => { setFilterTerm(e.target.value); setRejectedPage(1); setChangelogPage(1); }}
                        />
                    </div>
                </div>
                <div className="w-48">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Fecha Evento</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="date"
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                            value={dateFilter}
                            onChange={(e) => { setDateFilter(e.target.value); setRejectedPage(1); }}
                        />
                    </div>
                </div>
                {(filterTerm || dateFilter) && (
                    <Button variant="secondary" icon={Filter} size="sm" onClick={() => { setFilterTerm(''); setDateFilter(''); }}>
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Tablas */}
            <Card className="flex-1 overflow-hidden flex flex-col p-0 border-slate-200">
                <div className="overflow-x-auto flex-1">
                    {activeTab === 'rejected' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <th className="p-4">Fecha Rechazo</th>
                                    <th className="p-4">Factura</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4 text-right">Monto MN</th>
                                    <th className="p-4 text-center">Etiqueta</th>
                                    <th className="p-4">Motivo / Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRejected.length > 0 ? paginatedRejected.map((inv, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="p-4 font-medium text-slate-600">
                                            {formatDate(inv.rejectedAt) || 'N/A'}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{inv.meta?.invoice}</td>
                                        <td className="p-4 text-slate-600">{inv.providerName}</td>
                                        <td className="p-4 text-right font-bold">{formatCurrency(inv.amount)}</td>
                                        <td className="p-4 text-center">
                                            {inv.meta?.isH2H
                                                ? <Badge status="info">H2H</Badge>
                                                : <Badge status="secondary">GENERAL</Badge>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold text-xs uppercase">Rechazo Manual</span>
                                                <span className="text-[10px] text-slate-400 italic">
                                                    Por: {inv.auditLog?.[inv.auditLog.length - 1]?.user || 'Admin'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center text-slate-400 italic">
                                            No hay registros de facturas rechazadas para mostrar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                    <th className="p-4">Fecha/Hora</th>
                                    <th className="p-4">Usuario</th>
                                    <th className="p-4">Evento</th>
                                    <th className="p-4">Factura</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Detalle Técnico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedChangelog.length > 0 ? paginatedChangelog.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="p-4 font-mono text-xs text-slate-500">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User size={12} />
                                                </div>
                                                <span className="font-bold text-slate-700">{log.user || 'Sistema'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge status={log.event?.includes('RECHAZO') ? 'danger' : 'success'}>
                                                {log.event}
                                            </Badge>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{log.invoice}</td>
                                        <td className="p-4 text-xs text-slate-500 uppercase">{log.provider}</td>
                                        <td className="p-4 text-xs italic text-slate-500">{log.details}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center text-slate-400 italic">
                                            No hay movimientos registrados en el log de auditoría.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Paginación */}
                {activeTab === 'rejected' && filteredRejected.length > PAGE_SIZE && (
                    <Paginator page={rejectedPage} totalPages={rejectedTotalPages} onPageChange={setRejectedPage} />
                )}
                {activeTab === 'changelog' && changeLog.length > PAGE_SIZE && (
                    <Paginator page={changelogPage} totalPages={changelogTotalPages} onPageChange={setChangelogPage} />
                )}
            </Card>
        </div>
    );
};

export default Reports;
