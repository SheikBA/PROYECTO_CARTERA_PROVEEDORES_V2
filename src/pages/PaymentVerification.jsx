import React, { useState, useMemo, useEffect } from 'react';
import {
    FileText, Upload, Download, CheckCircle2, Clock, Landmark,
    Search, ShieldAlert, FileSpreadsheet, RefreshCw, ChevronRight,
    Info, Loader2, FolderCheck
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils/formatters.js';

const HS = {
    tealDark: '#195655',
    blueBase: '#0082a6',
    fontTitle: "'Open Sans', sans-serif"
};

const PaymentVerification = ({ trackingData = [], setTrackingData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoaderOpen, setIsLoaderOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [processingInvoice, setProcessingInvoice] = useState(null);

    // --- BLOQUE 2: LÓGICA DE KPIs ---
    const kpis = useMemo(() => {
        const source = trackingData.filter(inv => inv.status === 'PROCESANDO PAGO' || inv.status === 'COMPROBADO (OK)');

        const getStats = (list) => ({
            total: list.length,
            pending: list.filter(i => i.status !== 'COMPROBADO (OK)').length,
            mnPending: list.filter(i => i.status !== 'COMPROBADO (OK)' && i.currency === 'MXN').length,
            usdPending: list.filter(i => i.status !== 'COMPROBADO (OK)' && i.currency === 'USD').length
        });

        const h2h = getStats(source.filter(i => i.meta?.isH2H));
        const nonH2h = getStats(source.filter(i => !i.meta?.isH2H));

        // Proveedores por banco
        const bankMap = {};
        source.forEach(inv => {
            const bank = inv.bankId || 'Sin Banco';
            if (!bankMap[bank]) bankMap[bank] = new Set();
            bankMap[bank].add(inv.providerName);
        });

        return { h2h, nonH2h, banks: bankMap };
    }, [trackingData]);

    // --- BLOQUE 3: FILTRADO DE TABLA ---
    const filteredData = useMemo(() => {
        return trackingData.filter(inv => {
            const isRelevant = inv.status === 'PROCESANDO PAGO' || inv.status === 'COMPROBADO (OK)';
            if (!isRelevant) return false;

            const term = searchTerm.toLowerCase();
            return (
                inv.providerName?.toLowerCase().includes(term) ||
                inv.meta?.invoice?.toLowerCase().includes(term) ||
                inv.bankId?.toLowerCase().includes(term)
            );
        });
    }, [trackingData, searchTerm]);

    // --- BLOQUE 4: LÓGICA DEL LOADER Y CARGA ---
    const steps = [
        { pct: 10, msg: "📄 Leyendo comprobante...", icon: FileText },
        { pct: 35, msg: "🔍 Extrayendo datos: fecha, monto, referencia...", icon: Search },
        { pct: 65, msg: "✅ Validando contra pago...", icon: CheckCircle2 },
        { pct: 90, msg: "📁 Creando carpeta local / renombrando archivo...", icon: FolderCheck },
        { pct: 100, msg: "🎉 Posteo exitoso", icon: CheckCircle2 }
    ];

    const handleStartVerification = (invoice) => {
        setProcessingInvoice(invoice);
        setIsLoaderOpen(true);
        setCurrentStep(0);

        // Simulación del proceso por etapas
        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= steps.length - 1) {
                    clearInterval(interval);
                    setTimeout(() => finalizeVerification(invoice), 800);
                    return prev;
                }
                return prev + 1;
            });
        }, 1200);
    };

    const finalizeVerification = (invoice) => {
        const fileName = `${invoice.meta?.company}_${invoice.meta?.numPaymentId}_${invoice.meta?.providerRFC || 'RFC'}_${invoice.bankId}.pdf`;
        const folderPath = `Comprobantes/${invoice.providerName}/${invoice.processedDate || '2025-02-18'}/`;

        // Actualizar trackingData
        setTrackingData(prev => prev.map(inv => {
            if (inv.id === invoice.id) {
                return {
                    ...inv,
                    status: 'COMPROBADO (OK)',
                    verifiedAt: new Date().toISOString(),
                    filePath: folderPath + fileName
                };
            }
            return inv;
        }));

        // Persistencia simulada solicitada
        const savedVerifications = JSON.parse(localStorage.getItem('hs_comprobaciones') || '[]');
        savedVerifications.push({ id: invoice.id, path: folderPath + fileName, date: new Date().toISOString() });
        localStorage.setItem('hs_comprobaciones', JSON.stringify(savedVerifications));

        setIsLoaderOpen(false);
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in bg-slate-50/50">

            {/* BLOQUE 1: CABECERA */}
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase" style={{ fontFamily: HS.fontTitle }}>
                            Comprobación de pagos
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cartera de Proveedores</span>
                            <span className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 text-[9px] font-black uppercase">
                                Rol: Tesorería
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BLOQUE 2: CINTA DE KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-t-4 border-t-indigo-500 p-4 shadow-sm relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendiente H2H</p>
                    <p className="text-3xl font-black text-slate-800">{kpis.h2h.pending}<span className="text-slate-300 mx-1">/</span>{kpis.h2h.total}</p>
                    <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2">
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">MN</p><p className="text-xs font-bold">{kpis.h2h.mnPending}</p></div>
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">USD</p><p className="text-xs font-bold text-blue-600">{kpis.h2h.usdPending}</p></div>
                    </div>
                </Card>

                <Card className="border-t-4 border-t-amber-500 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendiente SIN H2H</p>
                    <p className="text-3xl font-black text-slate-800">{kpis.nonH2h.pending}<span className="text-slate-300 mx-1">/</span>{kpis.nonH2h.total}</p>
                    <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2">
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">MN</p><p className="text-xs font-bold">{kpis.nonH2h.mnPending}</p></div>
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">USD</p><p className="text-xs font-bold text-blue-600">{kpis.nonH2h.usdPending}</p></div>
                    </div>
                </Card>

                <Card className="border-t-4 border-t-teal-600 p-4 shadow-sm overflow-y-auto max-h-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Proveedores por banco</p>
                    <div className="space-y-1.5">
                        {Object.entries(kpis.banks).map(([bank, providers]) => (
                            <div key={bank} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-600 uppercase">{bank}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500">→ {providers.size} proveedores</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* BLOQUE 3: BARRA DE HERRAMIENTAS */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="primary" icon={Upload} className="bg-blue-600">
                        Cargar comprobante (PDF/EXCEL)
                    </Button>
                    <Button variant="secondary" icon={Download}>
                        Descargar EXCEL
                    </Button>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-blue-700">
                    <Info size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Coincidencia automática: fecha, monto, referencia y proveedor</span>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* BLOQUE 4: TABLA DE DATOS */}
            <Card className="flex-1 p-0 overflow-hidden border-slate-200 shadow-xl flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest">
                            <tr>
                                <th className="p-4">Banco Pagador</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Grupo Proveedor</th>
                                <th className="p-4">Fecha/Hora Procesamiento</th>
                                <th className="p-4 text-center">Moneda</th>
                                <th className="p-4 text-right">Monto</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center text-slate-400 italic">
                                        No hay facturas pendientes de comprobación.
                                    </td>
                                </tr>
                            ) : filteredData.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">{inv.bankId || 'BANORTE'}</td>
                                    <td className="p-4">
                                        <p className="font-black text-slate-800 uppercase">{inv.providerName}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{inv.meta?.company}</p>
                                    </td>
                                    <td className="p-4">
                                        <Badge status="secondary" className="text-[9px]">{inv.group || 'GENERAL'}</Badge>
                                    </td>
                                    <td className="p-4 text-slate-500 font-mono">{inv.processedDate || '2025-02-18'} 10:30:00</td>
                                    <td className="p-4 text-center font-black text-slate-400">{inv.currency}</td>
                                    <td className="p-4 text-right font-black text-slate-800">{formatCurrency(inv.amount, inv.currency)}</td>
                                    <td className="p-4 text-center">
                                        {inv.status === 'COMPROBADO (OK)' ? (
                                            <div className="flex flex-col items-center">
                                                <Badge status="success">Comprobado (OK)</Badge>
                                                <span className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Auto-Match</span>
                                            </div>
                                        ) : (
                                            <Badge status="pending">Pendiente</Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {inv.status !== 'COMPROBADO (OK)' ? (
                                            <button
                                                onClick={() => handleStartVerification(inv)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all border border-blue-200"
                                            >
                                                Cargar comprobante
                                            </button>
                                        ) : (
                                            <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Ver archivo">
                                                <FileText size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* BLOQUE 5: MODAL LOADER VISUAL */}
            <Modal
                isOpen={isLoaderOpen}
                onClose={() => { }} // No permitir cierre manual durante proceso
                title="Procesador Inteligente de Comprobantes"
                size="sm"
            >
                <div className="py-8 px-4 flex flex-col items-center">
                    {/* Icono Dinámico */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
                        <div className="relative h-20 w-20 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-600 shadow-xl">
                            {React.createElement(steps[currentStep].icon, { size: 36, className: currentStep < 4 ? "animate-pulse" : "" })}
                        </div>
                    </div>

                    {/* Porcentaje Numérico */}
                    <div className="text-center mb-2">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">
                            {steps[currentStep].pct}%
                        </span>
                    </div>

                    {/* Barra de Progreso Animada */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 mb-6">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${steps[currentStep].pct}%` }}
                        />
                    </div>

                    {/* Mensaje de Estado por Etapa */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-bold text-slate-700 animate-bounce">
                            {steps[currentStep].msg}
                        </p>
                        {processingInvoice && (
                            <p className="text-[10px] text-slate-400 font-mono uppercase">
                                Factura: {processingInvoice.meta?.invoice} · {processingInvoice.providerName}
                            </p>
                        )}
                    </div>

                    {/* Etapas visuales completadas */}
                    <div className="mt-8 flex justify-between w-full px-2">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 mx-0.5 rounded-full transition-colors duration-500 ${i <= currentStep ? 'bg-blue-500' : 'bg-slate-200'}`}
                            />
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PaymentVerification;