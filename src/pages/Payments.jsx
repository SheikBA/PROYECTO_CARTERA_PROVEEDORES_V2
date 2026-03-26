import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, DollarSign, Clock, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft, RefreshCw, Building2, Layers, Users, X, Plus, Edit2, ArrowRightLeft, AlertTriangle, Briefcase, FileText, ShieldAlert } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

// Metadata helpers for the UI that would normally come from the DB as well.
import { INITIAL_RAW_INVOICES } from '../data/mockData.js';
// Ya no importamos CATALOG_... fijos, los recibiremos por props

const Payments = ({ rawInvoices, setRawInvoices, availableInvoices, setAvailableInvoices, trackingData, setTrackingData, catalogs }) => {
    // Desempaquetamos los catálogos dinámicos (con valores por defecto por seguridad)
    const { banks: CATALOG_BANCOS = [], companies: CATALOG_COMPANIAS = [], groups: CATALOG_GRUPOS = [] } = catalogs || {};

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedBanks, setExpandedBanks] = useState([]);

    // Navigation State:
    // 0: Bancos -> 1: Compañías -> 2: Grupos -> 3: Proveedores -> 4: Facturas (Fiscal/NoFiscal)
    const [drillLevel, setDrillLevel] = useState(0);
    const [selectedBank, setSelectedBank] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);

    // Inputs Globales State
    const [globalAmountInput, setGlobalAmountInput] = useState('');
    const [globalAdjustmentInput, setGlobalAdjustmentInput] = useState('');

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignSourceBank, setReassignSourceBank] = useState(null);
    const [reassignTargetBank, setReassignTargetBank] = useState('');

    const [searchUuid, setSearchUuid] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // Pagination & Local Search State (Level 4)
    const [invoicePage, setInvoicePage] = useState(1);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const ITEMS_PER_PAGE = 10;

    // Helper formatting functions
    const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

    // --------------------------------------------------------------------------------
    // CORE LOGIC: Derived State from rawInvoices
    // --------------------------------------------------------------------------------

    // 1. Calculate general KPIs
    const kpis = useMemo(() => {
        const totalToPay = rawInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalPaid = trackingData.reduce((sum, item) => sum + item.amount, 0);
        const providers = new Set(rawInvoices.map(inv => inv.providerName));
        const groups = new Set(rawInvoices.map(inv => inv.group));
        const fiscalErrors = rawInvoices.filter(inv => inv.meta?.hasFiscalError).length;

        return {
            totalToPay,
            totalPaid,
            providersCount: providers.size,
            groupsCount: groups.size,
            fiscalErrors,
            pending: rawInvoices.length,
            processed: trackingData.length
        };
    }, [rawInvoices, trackingData]);

    // 2. Group Invoices by Bank -> Company -> Group -> Provider -> Invoices
    const bankTree = useMemo(() => {
        const treeMap = new Map();

        // 1. Inicializar el árbol con TODAS las cuentas del catálogo para que se vean las 44 tarjetas
        // Y pre-popular la estructura de Compañías dentro de cada Banco
        CATALOG_BANCOS.forEach(b => {
            // Usamos el ID de la cuenta del catálogo como clave única
            const key = b.id;

            // Buscamos datos de la compañía asociada a esta cuenta bancaria
            const companyMeta = CATALOG_COMPANIAS.find(c => c.company === b.company);
            const companyName = companyMeta ? companyMeta.company_name : b.company;
            const companyCountry = companyMeta ? companyMeta.country : '';

            // Extracción robusta del nombre del Banco
            const fullDescription = b.bank || b.description || 'Banco Desconocido';
            const KNOWN_BANKS = ['BANAMEX', 'BANORTE', 'SANTANDER', 'SCOTIABANK', 'BBVA', 'HSBC', 'INBURSA', 'BAJIO', 'AFIRME'];
            const upperDesc = fullDescription.toUpperCase();
            const detectedBankName = KNOWN_BANKS.find(k => upperDesc.includes(k)) || fullDescription.split(' ')[1] || 'OTRO';

            treeMap.set(key, {
                id: key,
                name: detectedBankName,
                account: b.bank_account || 'S/N', // El número de cuenta
                currency: b.currency_code,
                description: fullDescription,
                company: b.company,
                amount: 0,
                // Pre-cargamos la compañía propietaria de la cuenta como un "item" hijo
                items: [{
                    id: b.company,
                    name: companyName,
                    country: companyCountry, // Info extra para mostrar
                    amount: 0,
                    // Pre-populamos con el catálogo de grupos por defecto (Global)
                    items: CATALOG_GRUPOS.map(g => ({
                        id: `${g.group}|${g.description}`, // ID compuesto para evitar colisiones
                        name: g.description,
                        groupCode: g.group,
                        amount: 0,
                        items: [],
                        invoices: [],
                        meta: g
                    })),
                    meta: companyMeta
                }],
                invoices: []
            });
        });

        // Buckets para lo no asignado (solo aparecerán si tienen facturas huerfanas)
        const unassignedMXN = { id: 'Unassigned-MXN', name: 'NO ASIGNADO', account: 'Generico', currency: 'MXN', description: 'Facturas sin cuenta asignada', amount: 0, items: [], invoices: [] };
        const unassignedUSD = { id: 'Unassigned-USD', name: 'NO ASIGNADO', account: 'Generico', currency: 'USD', description: 'Facturas sin cuenta asignada', amount: 0, items: [], invoices: [] };

        // Helper para buscar o crear nodo
        const findOrCreate = (array, id, name, extra = {}) => {
            let node = array.find(item => item.id === id);
            if (!node) {
                node = { id, name, amount: 0, items: [], invoices: [], ...extra };
                array.push(node);
            }
            return node;
        };

        rawInvoices.forEach(inv => {
            // Nivel 1: Banco
            // Lógica Maestra: Determinar Cuenta Pagadora cruzando Compañía y Moneda con el Catálogo
            // Usamos el 'bankId' que viene del Excel (columna 'BANCOS') para encontrar el 'id' en el catálogo
            const match = CATALOG_BANCOS.find(b => b.id === inv.bankId);

            let bankNode;
            if (match) {
                bankNode = treeMap.get(match.id);
            } else {
                // Fallback a los nodos genéricos
                bankNode = inv.currency === 'USD' ? unassignedUSD : unassignedMXN;
            }

            if (bankNode) {
                bankNode.amount += inv.amount;

                // Nivel 2: Compañía
                const companyName = inv.company || 'Sin Compañía Asignada';

                // Buscamos el nodo de compañía (que ya debería existir por la inicialización si vino del catálogo)
                let compNode = bankNode.items.find(c => c.id === companyName);

                if (!compNode) {
                    // Si la factura trae una compañía que NO estaba ligada a la cuenta en el catálogo (caso raro o "Sin Asignar")
                    const companyMeta = CATALOG_COMPANIAS.find(c => c.company === inv.company);
                    const displayCompanyName = companyMeta ? companyMeta.company_name : companyName;
                    compNode = findOrCreate(bankNode.items, companyName, displayCompanyName, { meta: companyMeta });
                }

                if (compNode) {
                    compNode.amount += inv.amount;

                    if (!compNode.items || compNode.items.length === 0) {
                        compNode.items = CATALOG_GRUPOS.map(g => ({
                            id: `${g.group}|${g.description}`,
                            name: g.description,
                            groupCode: g.group,
                            amount: 0,
                            items: [],
                            invoices: [],
                            meta: g
                        }));
                    }

                    const invDesc = inv.meta?.description_grupo_proveedor;

                    // Intentamos encontrar el nodo pre-populado que coincida con código y descripción
                    let groupNode = compNode.items.find(g =>
                        g.groupCode === inv.group && (!invDesc || g.name === invDesc)
                    );

                    if (!groupNode) {
                        // Si no está en el catálogo, lo creamos dinámicamente
                        const groupName = invDesc || inv.group || 'Grupo General';
                        groupNode = findOrCreate(compNode.items, inv.group, groupName);
                        groupNode.groupCode = inv.group;
                    }

                    groupNode.amount += inv.amount;

                    // Nivel 4: Proveedor
                    const provNode = findOrCreate(groupNode.items, inv.providerName, inv.providerName);
                    provNode.amount += inv.amount;

                    // Nivel 5: Facturas (Guardadas en el proveedor)
                    provNode.invoices.push(inv);
                }
            }
        });

        // Agregar los nodos de no asignados si tienen monto > 0
        const result = Array.from(treeMap.values());
        if (unassignedMXN.amount > 0) result.unshift(unassignedMXN);
        if (unassignedUSD.amount > 0) result.unshift(unassignedUSD);

        return result;
    }, [rawInvoices, CATALOG_BANCOS, CATALOG_COMPANIAS, CATALOG_GRUPOS]);

    // Paginación de Bancos (Lógica faltante que causaba el error)
    const filteredBanks = useMemo(() => {
        const list = (bankTree || []).filter(b =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.account && b.account.includes(searchTerm)) ||
            (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Ordenamos por nombre de banco para agrupar visualmente "por banco"
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [bankTree, searchTerm]);

    // Reset pagination when provider changes
    useEffect(() => {
        setInvoicePage(1);
        setInvoiceSearch('');
    }, [selectedProvider]);

    useEffect(() => {
        // Este hook está vacío a propósito, solo para registrar cambios en el término de búsqueda si fuera necesario en el futuro.
    }, [searchTerm]);

    // Reassign Bank Handler
    const openReassignModal = (bank) => {
        setReassignSourceBank(bank);
        setReassignTargetBank('');
        setIsReassignModalOpen(true);
    };

    const handleConfirmReassign = () => {
        if (!reassignTargetBank) return alert("Selecciona un banco destino.");

        const targetBank = CATALOG_BANCOS.find(b => b.id === reassignTargetBank);
        if (!targetBank) {
            return alert("Error: No se encontró el banco destino en el catálogo.");
        }

        if (targetBank.id === reassignSourceBank.id) {
            return alert("El banco destino debe ser diferente.");
        }

        setRawInvoices(prev => prev.map(inv => {
            if (inv.bankId === reassignSourceBank.id) {
                return { ...inv, bankId: targetBank.id };
            }
            return inv;
        }));

        setIsReassignModalOpen(false);
        alert(`Se han movido todos los pagos de ${reassignSourceBank.name} al nuevo banco.`);
    };

    // Modal Search handler
    const handleSearchInvoice = () => {
        const found = (availableInvoices || []).find(inv => inv.uuid === searchUuid);
        setSearchResult(found || null);
        if (!found) alert("No se encontró ninguna factura con ese UUID en el ERP.");
    };

    const handleAddFoundInvoice = () => {
        if (!searchResult) return;

        // Transforma el resultado de la búsqueda al formato interno de `rawInvoices`
        const newRawInvoice = {
            id: searchResult.uuid,
            uuid: searchResult.uuid,
            providerName: searchResult.providerName,
            amount: searchResult.amount,
            currency: searchResult.currency,
            dueDate: new Date().toISOString().split('T')[0], // Default due date
            status: 'pending',
            group: 'Sin Grupo', // Default group
            bankId: 'Unassigned-MXN', // Default to unassigned
            company: searchResult.company,
            meta: { ...searchResult }
        };

        // Validar si la factura ya existe en la propuesta
        if (rawInvoices.some(inv => inv.id === newRawInvoice.id)) {
            alert("Esta factura ya se encuentra en la propuesta de pago.");
            return;
        }

        setRawInvoices(prev => [...prev, newRawInvoice]);

        // Opcional: remover de la lista de "disponibles" para no agregarla dos veces
        setAvailableInvoices(prev => (prev || []).filter(inv => inv.uuid !== searchResult.uuid));

        // Resetear el modal
        setSearchResult(null);
        setSearchUuid('');
        setIsAddModalOpen(false);

        alert("Factura agregada a la propuesta exitosamente.");
    };


    const getSegmentedInvoices = (provider) => {
        if (!provider) return { fiscal: [], nonFiscal: [] };

        const fiscal = [];
        const nonFiscal = [];

        provider.invoices.forEach(inv => {
            // Criterio de Usuario:
            // Fiscal: Tiene UUID.
            // No Fiscal: Tarcode Verdadero (true) o '1'.
            // (Asumimos que si tiene UUID es fiscal, si no, revisamos TAR Code, o lo mandamos a No Fiscal por defecto si falta UUID).

            const hasUuid = inv.uuid && inv.uuid.trim().length > 0;
            const isTarCode = inv.meta?.tar_code === true || inv.meta?.tar_code === '1' || inv.meta?.tar_code === 'Verdadero' || inv.meta?.TAR_Code === true;

            if (hasUuid && !isTarCode) {
                fiscal.push(inv);
            } else {
                nonFiscal.push(inv);
            }
        });
        return { fiscal, nonFiscal };
    };

    // --------------------------------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------------------------------

    // Navigate Up
    const goBack = () => {
        if (drillLevel === 4) { // De Facturas a Proveedores
            setDrillLevel(3);
            setSelectedProvider(null);
        } else if (drillLevel === 3) { // De Proveedores a Grupos
            setDrillLevel(2);
            setSelectedGroup(null);
        } else if (drillLevel === 2) { // De Grupos a Compañías
            setDrillLevel(1);
            setSelectedCompany(null);
        } else if (drillLevel === 1) { // De Compañías a Bancos
            setDrillLevel(0);
            setSelectedBank(null);
        }
    };

    // Remove invoice from proposal (Exclude)
    const handleExclude = (invoiceId) => {
        if (confirm('¿Estás seguro de que deseas excluir esta factura de la propuesta de pago temporalmente?')) {
            setRawInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        }
    };

    // Regenerate from initial database state (Simulated)
    const handleRegenerate = () => {
        if (globalAmountInput != kpis.totalToPay || confirm('¿Deseas recalcular la propuesta?')) {
            setRawInvoices(INITIAL_RAW_INVOICES || []);
            setGlobalAmountInput((INITIAL_RAW_INVOICES || []).reduce((sum, i) => sum + i.amount, 0) || 0);
            setGlobalAdjustmentInput(0);
            setDrillLevel(0);
            setSelectedBank(null);
            setSelectedCompany(null);
            setSelectedGroup(null);
            setSelectedProvider(null);
            alert("Propuesta regenerada correctamente.");
        }
    };

    // Confirm Global Payment - sends everything to tracking
    const handleGlobalConfirm = () => {
        if (parseFloat(globalAmountInput) !== kpis.totalToPay) {
            alert(`Error: El monto ingresado (${formatCurrency(globalAmountInput)}) no coincide con el total de la propuesta (${formatCurrency(kpis.totalToPay)}). Revisa los ajustes.`);
            return;
        }

        if (confirm(`¿Estás seguro de confirmar el pago masivo por ${formatCurrency(kpis.totalToPay)}?`)) {

            // Transform rawInvoices to trackingData format and append
            const newTracking = (rawInvoices || []).map(inv => ({
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
            setSelectedBank(null);
            setSelectedCompany(null);
            setSelectedGroup(null);
            setSelectedProvider(null);
            setDrillLevel(0);
            alert("¡Pagos procesados y enviados al ERP exitosamente!");
        }
    };

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
                    <Button variant="dark" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Añadir Factura</Button>
                </div>
            </div>

            {/* Alerta Crítica de Errores Fiscales (JSON #6) */}
            {kpis.fiscalErrors > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-600" size={24} />
                        <p className="text-sm text-red-800 font-medium">Se han detectado <b>{kpis.fiscalErrors}</b> facturas con inconsistencias fiscales (TAR Code vs UUID). Por favor, revíselas antes de procesar el pago.</p>
                    </div>
                </div>
            )}

            {/* Global Proposal Inputs (JSON #11-13) */}
            <Card className="bg-slate-50 border-slate-200">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Importe Global a Pagar</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="number"
                                value={globalAmountInput}
                                onChange={(e) => setGlobalAmountInput(parseFloat(e.target.value) || 0)}
                                className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 outline-none font-bold text-lg transition-all ${globalAmountInput > kpis.totalToPay ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 focus:border-primary'}`}
                            />
                        </div>
                        {globalAmountInput > kpis.totalToPay && <p className="text-xs text-red-500 mt-1 font-medium">El importe no puede ser mayor a la propuesta calculada.</p>}
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ajuste Manual</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="number"
                                value={globalAdjustmentInput}
                                onChange={(e) => setGlobalAdjustmentInput(parseFloat(e.target.value) || 0)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-primary font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {/* Botón Regenerar solo activo si hay cambios (JSON #13) */}
                        <Button
                            variant="secondary"
                            icon={RefreshCw}
                            onClick={handleRegenerate}
                            disabled={parseFloat(globalAmountInput) === kpis.totalToPay && parseFloat(globalAdjustmentInput) === 0}
                        >
                            Regenerar
                        </Button>
                        <Button
                            variant="primary"
                            icon={CheckCircle2}
                            onClick={handleGlobalConfirm}
                            disabled={!rawInvoices || rawInvoices.length === 0 || globalAmountInput <= 0}
                            className="w-full md:w-auto"
                        >
                            Confirmar Global
                        </Button>
                    </div>
                </div>
            </Card>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase">Monto Total Propuesta</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(kpis.totalToPay)}</h3>
                    <div className="absolute right-4 top-4 p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
                </Card>
                <Card className="relative">
                    <p className="text-xs font-bold text-slate-400 uppercase">Histórico Procesados</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(kpis.totalPaid)}</h3>
                    <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
                </Card>
                <Card className="relative">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Proveedores</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.providersCount}</h3>
                    <div className="absolute right-4 top-4 p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
                </Card>
                <Card className="relative">
                    <p className="text-xs font-bold text-slate-400 uppercase">Grupos Activos</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{kpis.groupsCount}</h3>
                    <div className="absolute right-4 top-4 p-2 bg-amber-50 text-amber-600 rounded-lg"><Layers size={20} /></div>
                </Card>
            </div>

            {/* Tree Section */}
            <div className="flex-1 bg-surface border border-slate-200 shadow-sm rounded-xl flex flex-col z-10 overflow-hidden min-h-[500px]">
                {/* Breadcrumb Header */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white min-h-[60px]">
                    {drillLevel > 0 ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={goBack} // Corrected: was missing
                                className="px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-2 bg-slate-50 border border-slate-200 text-sm"
                            >
                                <ArrowLeft size={16} /> Atrás
                            </button>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <div className="flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap">
                                <span className="text-slate-500 font-medium">{selectedBank?.name}</span>
                                {drillLevel >= 2 && <><ChevronRight size={14} className="text-slate-300" /><span className="text-slate-500">{selectedCompany?.name}</span></>}
                                {drillLevel >= 3 && <><ChevronRight size={14} className="text-slate-300" /><span className="text-slate-500">{selectedGroup?.name}</span></>}
                                {drillLevel >= 4 && (
                                    <>
                                        <ChevronRight size={14} className="text-slate-300" />
                                        <span className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{selectedProvider?.name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full sm:w-80">
                            <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar banco o cuenta..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 bg-slate-50/50 p-4">
                    {drillLevel === 0 && (
                        // NIVEL 0: BANCOS (CUENTAS PAGADORAS)
                        <div className="max-w-7xl mx-auto pb-4">
                            <h2 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-200/50">Lista cuentas pagadoras</h2>
                            {(bankTree || []).length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No hay catálogos cargados.</p>
                                    <p className="text-sm mt-2">Ve a "Carga de Datos" y presiona "Cargar Catálogos".</p>
                                </div>
                            ) : null}

                            <div className="space-y-6 mt-4">
                                {Object.entries(
                                    filteredBanks.reduce((acc, bank) => {
                                        const key = bank.name || 'Desconocido';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(bank);
                                        return acc;
                                    }, {})
                                ).map(([bankName, accounts]) => (
                                    <div key={bankName}>
                                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Building2 size={16} className="text-slate-400" /> {bankName}
                                        </h3>
                                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50/80">
                                                    <tr className="text-xs text-slate-500 font-semibold">
                                                        <th className="p-3 w-1/4">Banco</th>
                                                        <th className="p-3 w-1/4">Cuenta</th>
                                                        <th className="p-3">ID Cuenta</th>
                                                        <th className="p-3">Moneda</th>
                                                        <th className="p-3 text-right">Saldo Propuesta</th>
                                                        <th className="p-3 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {accounts.map(account => (
                                                        <tr key={account.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => { setSelectedBank(account); setDrillLevel(1); }}>
                                                            <td className="p-3 font-medium text-slate-800">{account.name}</td>
                                                            <td className="p-3 font-mono text-slate-600">{account.account}</td>
                                                            <td className="p-3 font-mono text-xs text-slate-500">{account.id}</td>
                                                            <td className="p-3">
                                                                <Badge status={account.currency === 'USD' ? 'success' : 'info'}>{account.currency}</Badge>
                                                            </td>
                                                            <td className={`p-3 text-right font-bold ${account.amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                {formatCurrency(account.amount)}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title="Reasignar Saldo"
                                                                    onClick={(e) => { e.stopPropagation(); openReassignModal(account); }}
                                                                    disabled={account.amount <= 0}
                                                                >
                                                                    <ArrowRightLeft size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LISTAS GENÉRICAS PARA NIVELES 1, 2, 3 */}
                    {[1, 2, 3].includes(drillLevel) && (
                        <div className="max-w-6xl mx-auto animate-fade-in">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                {drillLevel === 1 ? 'Selecciona una Compañía' :
                                    drillLevel === 2 ? `Grupos en ${selectedCompany?.name}` :
                                        `Proveedores en ${selectedGroup?.name}`}
                            </h2>

                            <div className="grid grid-cols-1 gap-3">
                                {(() => {
                                    // Determinar lista actual según nivel
                                    let currentList = [];
                                    let icon = null;
                                    let colorClass = "";

                                    if (drillLevel === 1) {
                                        currentList = selectedBank?.items || [];
                                        icon = <Briefcase size={20} />;
                                        colorClass = "bg-indigo-500";
                                    } else if (drillLevel === 2) {
                                        currentList = selectedCompany?.items || [];
                                        icon = <Layers size={20} />;
                                        colorClass = "bg-emerald-500";
                                    } else if (drillLevel === 3) {
                                        currentList = selectedGroup?.items || [];
                                        icon = <Users size={20} />;
                                        colorClass = "bg-amber-500";
                                    }

                                    return currentList.map((item, idx) => (
                                        <div key={idx}
                                            className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                                            onClick={() => {
                                                if (drillLevel === 1) { setSelectedCompany(item); setDrillLevel(2); }
                                                else if (drillLevel === 2) { setSelectedGroup(item); setDrillLevel(3); }
                                                else if (drillLevel === 3) { setSelectedProvider(item); setDrillLevel(4); }
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm ${colorClass}`}>
                                                    {icon}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">
                                                        {item.name}
                                                    </h4>
                                                    {drillLevel === 2 && <p className="text-[10px] font-mono text-slate-400 uppercase">Código: {item.groupCode || item.id}</p>}
                                                    <p className="text-xs text-slate-500">{(item.items || []).length} {drillLevel === 3 ? 'Facturas' : (drillLevel === 2 ? 'Proveedores' : 'Grupos')} activos</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-lg text-slate-800">{formatCurrency(item.amount)}</p>
                                                    <span className="text-xs text-blue-600 font-medium hover:underline">
                                                        {drillLevel === 1 ? 'Ver Grupos de Pagos' :
                                                            drillLevel === 2 ? 'Ver Proveedores' :
                                                                'Ver Facturas'}
                                                    </span>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-300" />
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* NIVEL 4: FACTURAS (SEGMENTADAS POR FISCALES / NO FISCALES) */}
                    {drillLevel === 4 && selectedProvider && (
                        (() => {
                            const { fiscal, nonFiscal } = getSegmentedInvoices(selectedProvider);

                            // Lógica de Filtrado Local (Búsqueda por UUID o Monto)
                            const filteredFiscal = fiscal.filter(inv =>
                                invoiceSearch === '' ||
                                (inv.uuid || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                inv.amount.toString().includes(invoiceSearch) ||
                                inv.id.toLowerCase().includes(invoiceSearch.toLowerCase())
                            );

                            // Lógica de Paginación
                            const totalPages = Math.ceil(filteredFiscal.length / ITEMS_PER_PAGE);
                            const paginatedFiscal = filteredFiscal.slice(
                                (invoicePage - 1) * ITEMS_PER_PAGE,
                                invoicePage * ITEMS_PER_PAGE
                            );

                            return (
                                <div className="space-y-8 animate-fade-in pb-12">
                                    {/* Sección Fiscales */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg"><FileText size={18} /></div>
                                                <h3 className="font-bold text-slate-700">Facturas Fiscales (UUID)</h3>
                                                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{filteredFiscal.length}</span>
                                            </div>

                                            {/* Barra de búsqueda local */}
                                            <div className="relative w-full sm:w-64">
                                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Filtrar por UUID o monto..."
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                                                    value={invoiceSearch}
                                                    onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
                                                />
                                            </div>
                                        </div>

                                        {filteredFiscal.length > 0 ? (
                                            <div className="bg-white border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-emerald-50/50">
                                                        <tr className="text-xs uppercase text-slate-600 font-bold tracking-wider">
                                                            <th className="p-4">UUID / Folio</th>
                                                            <th className="p-4">Vencimiento</th>
                                                            <th className="p-4 text-right">Monto</th>
                                                            <th className="p-4 text-center">Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-emerald-50 text-sm">
                                                        {paginatedFiscal.map(inv => (
                                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-mono text-xs text-slate-500">{inv.uuid}</div>
                                                                        {inv.meta?.hasFiscalError && <Badge status="danger">Error Fiscal</Badge>}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400">ID: {inv.id}</div>
                                                                </td>
                                                                <td className="p-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                                                                <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(inv.amount)}</td>
                                                                <td className="p-4 text-center">
                                                                    <button onClick={() => handleExclude(inv.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"><X size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {/* Controles de Paginación */}
                                                {totalPages > 1 && (
                                                    <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50">
                                                        <button
                                                            onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                                                            disabled={invoicePage === 1}
                                                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <ChevronLeft size={20} className="text-slate-500" />
                                                        </button>
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            Página {invoicePage} de {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setInvoicePage(p => Math.min(totalPages, p + 1))}
                                                            disabled={invoicePage === totalPages}
                                                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <ChevronRight size={20} className="text-slate-500" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic p-8 text-center border border-dashed rounded-xl bg-slate-50">
                                                {invoiceSearch ? 'No se encontraron facturas con ese criterio.' : 'No hay facturas fiscales disponibles.'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sección NO Fiscales */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2 pt-4 border-t border-dashed border-slate-200">
                                            <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg"><ShieldAlert size={18} /></div>
                                            <h3 className="font-bold text-slate-700">No Fiscales / Anticipos (TAR Code)</h3>
                                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{nonFiscal.length}</span>
                                        </div>

                                        {nonFiscal.length > 0 ? (
                                            <div className="bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-amber-50/50">
                                                        <tr className="text-xs uppercase text-slate-600 font-bold tracking-wider">
                                                            <th className="p-4">Referencia</th>
                                                            <th className="p-4">Tipo</th>
                                                            <th className="p-4 text-right">Monto</th>
                                                            <th className="p-4 text-center">Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-amber-50 text-sm">
                                                        {nonFiscal.map(inv => (
                                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                                <td className="p-4 font-medium text-slate-700">{inv.id}</td>
                                                                <td className="p-4"><Badge status="warning">No Fiscal</Badge></td>
                                                                <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(inv.amount)}</td>
                                                                <td className="p-4 text-center">
                                                                    <button onClick={() => handleExclude(inv.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"><X size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <div className="text-sm text-slate-400 italic p-4 border border-dashed rounded-xl">No hay registros no fiscales.</div>}
                                    </div>
                                </div>
                            );
                        })()
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

            {/* Modal Reasignar Cuenta (JSON #20) */}
            <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reasignar Saldo de Banco" size="sm">
                <div className="space-y-4">
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex gap-3 text-sm">
                        <AlertTriangle size={20} className="shrink-0" />
                        <p>Estás a punto de mover todas las facturas de <b>{reassignSourceBank?.name}</b> a otra cuenta. Esta acción actualizará los saldos globales.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Banco Destino</label>
                        <select
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            value={reassignTargetBank}
                            onChange={(e) => setReassignTargetBank(e.target.value)}
                        >
                            <option value="">-- Seleccionar --</option>
                            {(CATALOG_BANCOS || []).filter(b => b.id !== reassignSourceBank?.id).map(b => <option key={b.id} value={b.id}>{b.bank} ({b.currency_code})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end pt-2"><Button variant="primary" icon={ArrowRightLeft} onClick={handleConfirmReassign}>Confirmar Reasignación</Button></div>
                </div>
            </Modal>

        </div>
    );
};

export default Payments;
