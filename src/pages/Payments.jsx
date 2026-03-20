import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, DollarSign, Clock, CheckCircle2, ChevronRight, ArrowLeft, RefreshCw, Building2, Layers, Users, X, Plus } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

// Metadata helpers for the UI that would normally come from the DB as well.
import { MOCK_BANKS_META, MOCK_GROUPS_META, INITIAL_RAW_INVOICES } from '../data/mockData';

const Payments = ({ rawInvoices, setRawInvoices, availableInvoices, setAvailableInvoices, trackingData, setTrackingData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedBanks, setExpandedBanks] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchUuid, setSearchUuid] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // Helper formatting functions
    const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

    // --------------------------------------------------------------------------------
    // CORE LOGIC: Derived State from rawInvoices
    // --------------------------------------------------------------------------------

    // 1. Calculate general KPIs
    const kpis = useMemo(() => {
        let total = 0;
        rawInvoices.forEach(inv => {
            total += inv.amount; // Notes of credit are already negative in mockData
        });
        return {
            totalToPay: total,
            pending: rawInvoices.length,
            processed: trackingData.length // Paid already
        };
    }, [rawInvoices, trackingData]);

    // 2. Group Invoices by Bank -> Group -> Provider (The Drill-down)
    const bankTree = useMemo(() => {
        const tree = {};

        // Initialize tree with existing banks
        MOCK_BANKS_META.forEach(bank => {
            tree[bank.id] = { ...bank, groups: {}, totalAmount: 0 };
        });

        // Populate with active invoices
        rawInvoices.forEach(inv => {
            if (!tree[inv.bankId]) return; // Safeguard
            
            tree[inv.bankId].totalAmount += inv.amount;

            if (!tree[inv.bankId].groups[inv.group]) {
                const groupName = MOCK_GROUPS_META[inv.group]?.name || 'Grupo Desconocido';
                tree[inv.bankId].groups[inv.group] = {
                    id: inv.group,
                    name: groupName,
                    amount: 0,
                    invoices: [] // We'll store invoices here instead of just provider count
                };
            }

            tree[inv.bankId].groups[inv.group].amount += inv.amount;
            tree[inv.bankId].groups[inv.group].invoices.push(inv);
        });

        // Convert grouped objects to Arrays for rendering
        return Object.values(tree)
            .map(bank => ({
                ...bank,
                groupList: Object.values(bank.groups)
            }))
            .filter(bank => bank.groupList.length > 0); // Only show banks that actually have payments
    }, [rawInvoices]);


    // --------------------------------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------------------------------

    // Remove invoice from proposal (Exclude)
    const handleExclude = (invoiceId) => {
        if(confirm('¿Estás seguro de que deseas excluir esta factura de la propuesta de pago temporalmente?')) {
            setRawInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        }
    };

    // Regenerate from initial database state (Simulated)
    const handleRegenerate = () => {
        if(confirm('Esta acción descartará tus cambios manuales (exclusiones e inclusiones) y restaurará la propuesta original. ¿Continuar?')) {
            setRawInvoices(INITIAL_RAW_INVOICES);
            setSelectedGroup(null);
        }
    };

    // Confirm Global Payment - sends everything to tracking
    const handleGlobalConfirm = () => {
        const confirmAmount = prompt(`Confirmación de Seguridad:\nIngresa el monto exacto total a pagar sin comas para confirmar: ${kpis.totalToPay}`);
        if (confirmAmount && parseFloat(confirmAmount) === kpis.totalToPay) {
            
            // Transform rawInvoices to trackingData format and append
            const newTracking = rawInvoices.map(inv => ({
                id: `TRK-${Math.floor(Math.random() * 10000)}`,
                date: new Date().toISOString().split('T')[0],
                providerName: inv.providerName,
                amount: inv.amount,
                currency: inv.currency,
                status: 'Completed',
                pdfUrl: null
            }));

            setTrackingData(prev => [...prev, ...newTracking]);
            setRawInvoices([]); // clear proposal
            setSelectedGroup(null); // return to dashboard
            alert("¡Pagos procesados y enviados al ERP exitosamente!");

        } else if (confirmAmount) {
            alert("El monto ingresado no coincide con el total. Operación cancelada.");
        }
    };

    // Modal Search handler
    const handleSearchInvoice = () => {
        const found = availableInvoices.find(inv => inv.uuid === searchUuid);
        setSearchResult(found || null);
        if (!found) alert("No se encontró ninguna factura con ese UUID en el ERP.");
    };

    const handleAddFoundInvoice = () => {
        if (!searchResult) return;
        
        // Push it matching the rawInvoice structure
        const newRawInvoice = {
            id: `PAY-NEW-${Math.floor(Math.random() * 1000)}`,
            providerId: searchResult.providerId,
            providerName: searchResult.providerName,
            group: 'G-001', // Defaulting to first group for mock simplicity
            type: 'Ingreso',
            amount: searchResult.amount,
            currency: searchResult.currency,
            dueDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            bankId: 'B-001', // Defaulting for mock
            accountId: 'CTA-001'
        };

        setRawInvoices(prev => [...prev, newRawInvoice]);
        
        // Remove from available
        setAvailableInvoices(prev => prev.filter(inv => inv.uuid !== searchResult.uuid));
        
        // Reset modal
        setSearchResult(null);
        setSearchUuid('');
        setIsAddModalOpen(false);
        
        alert("Factura agregada a la propuesta exitosamente.");
    };


    // --------------------------------------------------------------------------------
    // RENDER UI
    // --------------------------------------------------------------------------------

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in-up">
            
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Gestión de Pagos</h1>
                    <p className="text-slate-500 mt-1">Autorización y flujo de pagos dinámicos.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <Button variant="secondary" icon={Download}>Exportar</Button>
                    <Button variant="secondary" icon={RefreshCw} onClick={handleRegenerate}>Regenerar Propuesta</Button>
                    <Button variant="dark" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Añadir Factura</Button>
                    <Button variant="primary" icon={DollarSign} onClick={handleGlobalConfirm} disabled={rawInvoices.length === 0}>
                        Confirmar Global
                    </Button>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Monto Total Propuesta</p>
                            <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(kpis.totalToPay)}</h3>
                        </div>
                        <div className="p-3 rounded-xl text-blue-600 bg-blue-50"><DollarSign size={24} /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Facturas en Propuesta</p>
                            <h3 className="text-3xl font-bold text-slate-800">{kpis.pending}</h3>
                        </div>
                        <div className="p-3 rounded-xl text-amber-600 bg-amber-50"><Clock size={24} /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Histórico Procesados</p>
                            <h3 className="text-3xl font-bold text-slate-800">{kpis.processed}</h3>
                        </div>
                        <div className="p-3 rounded-xl text-emerald-600 bg-emerald-50"><CheckCircle2 size={24} /></div>
                    </div>
                </Card>
            </div>

            {/* Tree Section */}
            <div className="flex-1 bg-surface border border-slate-200 shadow-sm rounded-xl flex flex-col z-10 overflow-hidden">
                {/* Header Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white min-h-[72px]">
                    {selectedGroup ? (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedGroup(null)}
                                className="px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-2 bg-slate-50 border border-slate-200"
                            >
                                <ArrowLeft size={16} /> Volver a Cuentas
                            </button>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Layers size={18} className="text-primary" /> {selectedGroup.group.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Banco: {selectedGroup.bank.name} ({selectedGroup.bank.account})</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full sm:w-80">
                            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar banco activo..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 bg-slate-50/50 p-4">
                    {!selectedGroup ? (
                        // MODO ÁRBOL DE BANCOS
                        <div className="space-y-4 max-w-5xl mx-auto pb-4">
                            <h2 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-200/50">Lista cuentas pagadoras</h2>
                            {bankTree.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No hay facturas en la propuesta actual.</p>
                                    <p className="text-sm mt-2">Usa "Regenerar" o "Añadir Factura" para cargar data.</p>
                                </div>
                            ) : null}

                            {bankTree.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())).map((bank) => {
                                const isExpanded = expandedBanks.includes(bank.id);
                                return (
                                    <div key={bank.id} className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
                                        
                                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpandedBanks(prev => prev.includes(bank.id) ? prev.filter(id => id !== bank.id) : [...prev, bank.id])}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-lg ${isExpanded ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Building2 size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
                                                        {bank.name} <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200">Cuenta: {bank.account}</span>
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Layers size={14} /> Saldará {bank.groupList.length} agrupadores en este ciclo</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs text-slate-500 mb-0.5">Suma Acumulada del Banco</p>
                                                    <p className="font-bold text-slate-800 text-lg">{formatCurrency(bank.totalAmount)}</p>
                                                </div>
                                                <ChevronRight size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-primary' : ''}`} />
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-slate-50/80 border-t border-slate-100 p-4 pl-16">
                                                <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-6 before:w-[2px] before:bg-slate-200">
                                                    {bank.groupList.map(group => (
                                                        <div key={group.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm ml-8">
                                                            <div className="absolute left-[-2rem] w-[2rem] h-[2px] bg-slate-200 top-1/2"></div>
                                                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-700 text-sm">{group.name}</h4>
                                                                    <p className="text-xs text-slate-500 mt-0.5">{group.invoices.length} facturas vinculadas</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                                    <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Subtotal Grupo</p>
                                                                    <p className="font-bold text-primary text-sm">{formatCurrency(group.amount)}</p>
                                                                </div>
                                                                <Button variant="primary" className="text-xs py-2 px-4 shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedGroup({ bank, group }); }}>
                                                                    Ver Facturas
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // MODO LISTA DE FACTURAS (Detalle)
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600 font-bold tracking-wider">
                                            <th className="p-4 w-12"><input type="checkbox" className="rounded" /></th>
                                            <th className="p-4">ID Trans.</th>
                                            <th className="p-4">Proveedor</th>
                                            <th className="p-4">Tipo Doc.</th>
                                            <th className="p-4">Vencimiento</th>
                                            <th className="p-4">Monto Neto</th>
                                            <th className="p-4">Estado DB</th>
                                            <th className="p-4 text-center">Excluir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {selectedGroup.group.invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-blue-50/30 group">
                                                <td className="p-4"><input type="checkbox" className="rounded" /></td>
                                                <td className="p-4 text-slate-500 font-mono text-xs">{inv.id}</td>
                                                <td className="p-4 font-bold text-slate-800">{inv.providerName}</td>
                                                <td className="p-4 text-slate-600 font-medium">{inv.type}</td>
                                                <td className="p-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                                                <td className={`p-4 font-black ${inv.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {formatCurrency(inv.amount)}
                                                </td>
                                                <td className="p-4"><Badge status={inv.status} /></td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => handleExclude(inv.id)} className="p-1.5 text-slate-400 hover:text-danger rounded-lg hover:bg-red-50" title="Excluir de Propuesta">
                                                        <X size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para Agregar Facturas desde ERP */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Búsqueda de Facturas en ERP"
                size="md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Busca código UUID en el catálogo central (ERP simulado) para agregarlo directamente a la propuesta actual de pago.
                    </p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Ej. UUID-9A8B7C"
                            value={searchUuid}
                            onChange={(e) => setSearchUuid(e.target.value)}
                        />
                        <Button variant="primary" icon={Search} onClick={handleSearchInvoice}>Buscar</Button>
                    </div>

                    {searchResult && (
                        <Card className="bg-blue-50/50 border-blue-100">
                            <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Resultado Encontrado</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Proveedor</p>
                                    <p className="font-semibold text-slate-800">{searchResult.providerName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Monto</p>
                                    <p className="font-bold text-primary">{formatCurrency(searchResult.amount)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Cta. de Fondo</p>
                                    <p className="font-medium text-slate-800">{searchResult.bank} ({searchResult.account})</p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button variant="success" icon={CheckCircle2} onClick={handleAddFoundInvoice}>
                                    Agrupar a Propuesta
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </Modal>

        </div>
    );
};

export default Payments;
