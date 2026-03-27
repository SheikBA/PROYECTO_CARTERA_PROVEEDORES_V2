import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, DollarSign, Clock, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft, RefreshCw, Building2, Layers, Users, X, Plus, Edit2, ArrowRightLeft, AlertTriangle, Briefcase, FileText, ShieldAlert, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
// Ya no importamos CATALOG_... fijos, los recibiremos por props

const Payments = ({ rawInvoices, setRawInvoices, setProposalInvoices, authorizedInvoices, setAuthorizedInvoices, setRejectedInvoices, availableInvoices, setAvailableInvoices, trackingData, setTrackingData, catalogs, mode = 'proposal' }) => {
    const isProposal = mode === 'proposal';
    const isAuthorized = mode === 'authorized';
    const isRejected = mode === 'rejected';

    // Desempaquetamos los catálogos dinámicos (con valores por defecto por seguridad)
    const { banks: CATALOG_BANCOS = [], companies: CATALOG_COMPANIAS = [], groups: CATALOG_GRUPOS = [] } = catalogs || {};

    const [searchTerm, setSearchTerm] = useState('');
    // Inicializamos con todos los bancos expandidos para que sea intuitivo al inicio
    const [collapsedBanks, setCollapsedBanks] = useState([]);

    // Navigation State:
    // 0: Bancos -> 1: Compañías -> 2: Grupos -> 3: Proveedores -> 4: Facturas (Fiscal/NoFiscal)
    const [drillLevel, setDrillLevel] = useState(0);
    const [selectedBank, setSelectedBank] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);

    // Inputs Globales State
    const [globalAmountInput, setGlobalAmountInput] = useState('');

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignSourceBank, setReassignSourceBank] = useState(null);
    const [reassignTargetBank, setReassignTargetBank] = useState('');

    const [searchUuid, setSearchUuid] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // Estados para Ordenamiento y Secciones Colapsables
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isFiscalExpanded, setIsFiscalExpanded] = useState(true);
    const [isNonFiscalExpanded, setIsNonFiscalExpanded] = useState(true);

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
            const detectedBankName = KNOWN_BANKS.find(k => upperDesc.includes(k)) || (fullDescription && fullDescription.split(' ')[1]) || fullDescription || 'OTRO';

            treeMap.set(key, {
                id: key,
                name: detectedBankName,
                account: b.bank_account || 'S/N', // El número de cuenta
                currency: b.currency_code,
                description: fullDescription,
                company: b.company,
                amount: 0,
                items: [{
                    id: b.company,
                    name: companyName,
                    country: companyCountry, // Info extra para mostrar
                    amount: 0,
                    items: [], // Ahora es dinámico: se llena según la fuente de datos
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
            // Normalizamos ambos IDs a String para asegurar el match
            const bankMatch = CATALOG_BANCOS.find(b => String(b.id).trim() === String(inv.bankId).trim());

            let bankNode;
            if (bankMatch) {
                bankNode = treeMap.get(bankMatch.id);
            } else {
                // Fallback a los nodos genéricos
                bankNode = inv.currency === 'USD' ? unassignedUSD : unassignedMXN;
            }

            if (bankNode && Array.isArray(bankNode.items)) {
                bankNode.amount += inv.amount;

                // Nivel 2: Compañía
                const companyName = inv.company || bankNode.company || 'Sin Compañía';

                // Buscamos el nodo de compañía (que ya debería existir por la inicialización si vino del catálogo)
                let compNode = bankNode.items.find(c => c && c.id === companyName);

                if (!compNode) {
                    // Si la factura trae una compañía que NO estaba ligada a la cuenta en el catálogo (caso raro o "Sin Asignar")
                    const companyMeta = CATALOG_COMPANIAS.find(c => c.company === inv.company);
                    const displayCompanyName = companyMeta ? companyMeta.company_name : companyName;
                    compNode = findOrCreate(bankNode.items, companyName, displayCompanyName, { meta: companyMeta });
                }

                // Ajuste de Jerarquía: Saltamos nivel visual de Compañía si es necesario para ir directo a Grupo
                // Pero mantenemos la estructura interna.
                if (compNode) {
                    compNode.amount += inv.amount;

                    const groupCode = inv.group;
                    const invDesc = inv.meta?.description_grupo_proveedor;

                    // Buscamos si el grupo ya existe en este nodo de compañía para este banco específico
                    let groupNode = compNode.items.find(g => g.groupCode === groupCode);

                    if (!groupNode) {
                        // Si no existe, buscamos en el catálogo global para traer la descripción oficial
                        const catalogGroup = CATALOG_GRUPOS.find(g => g.group === groupCode);
                        const groupName = catalogGroup ? catalogGroup.description : (invDesc || groupCode);

                        groupNode = {
                            id: `${groupCode}|${groupName}`,
                            name: groupName,
                            groupCode: groupCode,
                            amount: 0,
                            items: [],
                            invoices: [],
                            meta: catalogGroup || { group: groupCode, description: groupName }
                        };
                        compNode.items.push(groupNode);
                    }

                    groupNode.amount += inv.amount;

                    // Nivel 4: Proveedor
                    // Agrupamos proveedores. Si el mismo proveedor tiene facturas en diferentes bancos, 
                    // aparecerá en ambos bancos por separado, cumpliendo tu requerimiento de segregación por moneda/banco.
                    const provNode = findOrCreate(groupNode.items,
                        (inv.providerName || 'Prov Desconocido').toString(),
                        (inv.providerName || 'Prov Desconocido').toString());
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

    // --- LÓGICA DE MOVIMIENTO ENTRE ESTADOS ---
    const handleAuthorize = (invoicesToMove) => {
        if (!invoicesToMove || invoicesToMove.length === 0) return;

        const ids = invoicesToMove.map(inv => inv.id);

        // 1. Quitar de la lista actual (Proposal)
        setRawInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));

        // 2. Agregar a la lista de Autorizados
        if (setAuthorizedInvoices) {
            setAuthorizedInvoices(prev => [...prev, ...invoicesToMove]);
        }

        alert(`Se han autorizado ${invoicesToMove.length} facturas.`);
    };

    const handleReject = (invoicesToMove) => {
        if (!invoicesToMove || invoicesToMove.length === 0) return;
        const ids = invoicesToMove.map(inv => inv.id);
        setRawInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
        if (setRejectedInvoices) {
            setRejectedInvoices(prev => [...prev, ...invoicesToMove]);
        }
        alert(`Se han rechazado ${invoicesToMove.length} facturas.`);
    };

    const handleRevoke = (invoicesToMove) => {
        if (!invoicesToMove || invoicesToMove.length === 0) return;
        const ids = invoicesToMove.map(inv => inv.id);
        setRawInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
        if (setProposalInvoices) {
            setProposalInvoices(prev => [...prev, ...invoicesToMove]);
        }
        alert(`Se ha quitado la autorización de ${invoicesToMove.length} facturas.`);
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
        if (!provider || !Array.isArray(provider.invoices)) return { fiscal: [], nonFiscal: [] };

        const fiscal = [];
        const nonFiscal = [];

        provider.invoices.forEach(inv => {
            const hasUuid = inv.uuid && String(inv.uuid).trim().length > 5;
            const isTarCode = inv.meta?.tar_code === 1 || inv.meta?.tar_code === '1';

            // REGLA FISCAL ACTUALIZADA:
            if (hasUuid) {
                // Si tiene UUID es Fiscal (aunque tenga error de tar_code)
                fiscal.push(inv);
            } else {
                // Si NO tiene UUID o es TarCode 1 (y no tiene UUID), es No Fiscal
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
        setRawInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    };

    // Regenerate from initial database state (Simulated)
    const handleRegenerate = () => {
        if (confirm('¿Deseas limpiar la propuesta actual y sincronizar de nuevo los datos?')) {
            setRawInvoices([]);
            setGlobalAmountInput(0);
            setDrillLevel(0);
            setSelectedBank(null);
            setSelectedCompany(null);
            setSelectedGroup(null);
            setSelectedProvider(null);
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                        {isProposal ? 'Gestión de Pagos' : 'Pagos Autorizados'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {isProposal ? 'Etapa 1: Refinamiento y autorización de propuesta.' : 'Etapa 2: Control de pagos autorizados para dispersión.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    {isProposal && (
                        <Button
                            variant="primary"
                            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-blue-200 animate-pulse border-none text-white"
                            onClick={() => alert("Proceso de refinamiento finalizado. Los pagos autorizados están listos para revisión en el siguiente módulo.")}
                        >
                            FINALIZAR PROCESO
                        </Button>
                    )}
                    <Button variant="secondary" icon={Download}>Exportar</Button>
                    {isProposal && <Button variant="dark" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Añadir Factura</Button>}
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

            {/* Solo mostramos el Importe Global en el módulo de Pagos Autorizados */}
            {isAuthorized && (
                <Card className="bg-emerald-50 border-emerald-100">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block font-mono">Importe Global Autorizado a Pagar</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                <input
                                    type="number"
                                    value={globalAmountInput}
                                    onChange={(e) => setGlobalAmountInput(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 outline-none font-bold text-lg transition-all bg-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button
                                variant="success"
                                icon={CheckCircle2}
                                onClick={handleGlobalConfirm}
                                disabled={rawInvoices.length === 0}
                                className="w-full md:w-auto shadow-lg"
                            >
                                Dispersar Pagos (ERP)
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase">
                        {isProposal ? 'Monto Total Propuesta' : 'Monto Total Autorizado'}
                    </p>
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
                                <button
                                    onClick={() => { setDrillLevel(0); setSelectedBank(null); setSelectedCompany(null); setSelectedGroup(null); setSelectedProvider(null); }}
                                    className="text-slate-500 hover:text-primary transition-colors hover:underline"
                                >
                                    Bancos
                                </button>
                                <ChevronRight size={14} className="text-slate-300" />
                                <button
                                    onClick={() => { setDrillLevel(1); setSelectedCompany(null); setSelectedGroup(null); setSelectedProvider(null); }}
                                    className="text-slate-500 hover:text-primary transition-colors hover:underline"
                                >
                                    {selectedBank?.name}
                                </button>
                                {drillLevel >= 2 && <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <button
                                        onClick={() => { setDrillLevel(2); setSelectedGroup(null); setSelectedProvider(null); }}
                                        className="text-slate-500 hover:text-primary transition-colors hover:underline"
                                    >
                                        {selectedCompany?.name}
                                    </button>
                                </>}
                                {drillLevel >= 3 && <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <button
                                        onClick={() => { setDrillLevel(3); setSelectedProvider(null); }}
                                        className="text-slate-500 hover:text-primary transition-colors hover:underline"
                                    >
                                        {selectedGroup?.name}
                                    </button>
                                </>}
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
                                    <div key={bankName} className="animate-fade-in">
                                        <h3
                                            className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2 flex items-center justify-between cursor-pointer hover:text-primary transition-colors group px-1"
                                            onClick={() => setCollapsedBanks(prev => prev.includes(bankName) ? prev.filter(b => b !== bankName) : [...prev, bankName])}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className="text-slate-400 group-hover:text-primary" /> {bankName}
                                            </div>
                                            {collapsedBanks.includes(bankName) ? <ChevronDown size={16} className="text-slate-300" /> : <ChevronUp size={16} className="text-slate-300" />}
                                        </h3>

                                        {!collapsedBanks.includes(bankName) && (
                                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
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
                                                                <td className="p-3 text-center min-w-[200px]">
                                                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                                                        {isProposal && account.amount > 0 && (
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                                    title="Autorizar Banco"
                                                                                    onClick={(e) => { e.stopPropagation(); handleAuthorize(account.invoices); }}
                                                                                >
                                                                                    <CheckCircle2 size={16} />
                                                                                </button>
                                                                                <button
                                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                                    title="No autorizar Banco"
                                                                                    onClick={(e) => { e.stopPropagation(); handleReject(account.invoices); }}
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {isAuthorized && (
                                                                            <>
                                                                                <Badge status="success">AUTORIZADO</Badge>
                                                                                <button
                                                                                    className="mt-1 p-1.5 text-red-500 hover:bg-red-50 rounded flex items-center gap-1 text-[10px] font-bold"
                                                                                    title="Quitar Autorización"
                                                                                    onClick={(e) => { e.stopPropagation(); handleRevoke(account.invoices); }}
                                                                                >
                                                                                    <ArrowLeft size={12} /> REVERTIR
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {isRejected && (
                                                                            <Badge status="danger">RECHAZADO</Badge>
                                                                        )}
                                                                        {!isRejected && (
                                                                            <button
                                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                                title="Reasignar Saldo"
                                                                                onClick={(e) => { e.stopPropagation(); openReassignModal(account); }}
                                                                                disabled={account.amount <= 0}
                                                                            >
                                                                                <ArrowRightLeft size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
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
                                                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                                                        {drillLevel === 1 ? 'Ver Grupos de Pagos' :
                                                            drillLevel === 2 ? 'Ver Proveedores' :
                                                                'Ver Facturas'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {isProposal && item.amount > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                                                                title="Autorizar este nivel"
                                                                onClick={(e) => { e.stopPropagation(); handleAuthorize(item.invoices || []); }}
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                            <button
                                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn flex items-center justify-center"
                                                                title="No autorizar este nivel"
                                                                onClick={(e) => { e.stopPropagation(); handleReject(item.invoices || []); }}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isAuthorized && (
                                                        <>
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">AUTORIZADO</span>
                                                            <button
                                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                title="Quitar Autorización"
                                                                onClick={(e) => { e.stopPropagation(); handleRevoke(item.invoices || []); }}
                                                            >
                                                                <ArrowLeft size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {isRejected && (
                                                        <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">RECHAZADO</span>
                                                    )}
                                                    <ChevronRight size={18} className="text-slate-300" />
                                                </div>
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
                                String(inv.meta?.invoice || '').toLowerCase().includes(invoiceSearch.toLowerCase())
                            );

                            // Lógica de Ordenamiento Dinámico
                            const sortData = (data) => {
                                if (!sortConfig.key) return data;
                                return [...data].sort((a, b) => {
                                    const aVal = a.meta?.[sortConfig.key] ?? a[sortConfig.key];
                                    const bVal = b.meta?.[sortConfig.key] ?? b[sortConfig.key];

                                    if (aVal === bVal) return 0;

                                    // Manejo de nulos
                                    if (aVal === null || aVal === undefined) return 1;
                                    if (bVal === null || bVal === undefined) return -1;

                                    const result = aVal < bVal ? -1 : 1;
                                    return sortConfig.direction === 'asc' ? result : -result;
                                });
                            };

                            const sortedFiscal = sortData(filteredFiscal);
                            const sortedNonFiscal = sortData(nonFiscal);

                            // Lógica de Paginación
                            const totalPages = Math.ceil(sortedFiscal.length / ITEMS_PER_PAGE);
                            const paginatedFiscal = sortedFiscal.slice(
                                (invoicePage - 1) * ITEMS_PER_PAGE,
                                invoicePage * ITEMS_PER_PAGE
                            );

                            return (
                                <div className="space-y-8 animate-fade-in pb-12">
                                    {/* Sección Fiscales */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-2">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity"
                                                onClick={() => setIsFiscalExpanded(!isFiscalExpanded)}
                                            >
                                                <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg"><FileText size={18} /></div>
                                                <h3 className="font-bold text-slate-700">Facturas Fiscales (UUID)</h3>
                                                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{filteredFiscal.length}</span>
                                                {isFiscalExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
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

                                        {isFiscalExpanded && (filteredFiscal.length > 0 ? (
                                            <div className="bg-white border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse min-w-[1600px]">
                                                        <thead className="bg-emerald-50/50">
                                                            <tr className="text-xs uppercase text-slate-600 font-bold tracking-wider">
                                                                {[
                                                                    { label: 'Invoice', key: 'invoice' },
                                                                    { label: 'Posted', key: 'posted' },
                                                                    { label: 'Balance mn', key: 'balance_mn', align: 'right' },
                                                                    { label: 'New Balance MN', key: 'new_balance_mn', align: 'right' },
                                                                    { label: 'Due date', key: 'due_date' },
                                                                    { label: 'Currency code', key: 'currency_code', align: 'center' },
                                                                    { label: 'Open payable', key: 'openpayable' },
                                                                    { label: 'Description Tran Doc Type', key: 'description_tran_doc_type' },
                                                                    { label: 'Transac_ref_c', key: 'transac_ref_c' },
                                                                    { label: 'Transac_num_c', key: 'transac_num_c' },
                                                                    { label: 'Fiscal Folio', key: 'uuid' },
                                                                    { label: 'TAR Code', key: 'tar_code', align: 'center' },
                                                                    { label: 'HoldInvoice', key: 'holdinvoice', align: 'center' },
                                                                    { label: 'Hold Payments', key: 'hold_payments', align: 'center' },
                                                                    { label: 'MsgHoldPayment_c', key: 'msgholdpayment_c' }
                                                                ].map((col) => (
                                                                    <th
                                                                        key={col.key}
                                                                        className={`p-4 whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                                                                        onClick={() => {
                                                                            const dir = sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                                            setSortConfig({ key: col.key, direction: dir });
                                                                        }}
                                                                    >
                                                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                                                            {col.label}
                                                                            <ArrowUpDown size={12} className={sortConfig.key === col.key ? 'text-primary' : 'text-slate-300'} />
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                                <th className="p-4 text-center sticky right-0 bg-emerald-50/50">Acción</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-emerald-50 text-sm">
                                                            {paginatedFiscal.map(inv => (
                                                                <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${isRejected ? 'bg-red-50/60' : ''}`}>
                                                                    <td className="p-4 font-medium text-slate-700">{String(inv.meta?.invoice ?? '')}</td>
                                                                    <td className="p-4 font-mono text-xs">{String(inv.meta?.posted ?? '')}</td>
                                                                    <td className="p-4 text-right">{formatCurrency(inv.meta?.balance_mn)}</td>
                                                                    <td className="p-4 text-right font-bold">{formatCurrency(inv.meta?.new_balance_mn)}</td>
                                                                    <td className="p-4 whitespace-nowrap">{String(inv.meta?.due_date ?? '')}</td>
                                                                    <td className="p-4 text-center font-bold text-xs">{String(inv.meta?.currency_code ?? '')}</td>
                                                                    <td className="p-4 font-mono text-xs">{String(inv.meta?.openpayable ?? '')}</td>
                                                                    <td className="p-4 text-xs">{String(inv.meta?.description_tran_doc_type ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-500">{String(inv.meta?.transac_ref_c ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-500">{String(inv.meta?.transac_num_c ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-400">{String(inv.uuid ?? '')}</td>
                                                                    <td className="p-4 text-center">{String(inv.meta?.tar_code ?? '')}</td>
                                                                    <td className={`p-4 text-center font-semibold ${inv.meta?.isHoldInvoice ? 'text-red-600 bg-red-50' : ''}`}>
                                                                        {String(inv.meta?.holdinvoice ?? '')}
                                                                    </td>
                                                                    <td className={`p-4 text-center font-semibold ${inv.meta?.isHoldPayment ? 'text-red-600 bg-red-50' : ''}`}>
                                                                        {String(inv.meta?.hold_payments ?? '')}
                                                                    </td>
                                                                    <td className="p-4 text-xs italic text-slate-500 max-w-xs truncate" title={String(inv.meta?.msgholdpayment_c ?? '')}>
                                                                        {String(inv.meta?.msgholdpayment_c ?? '')}
                                                                    </td>
                                                                    <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 min-w-[180px]">
                                                                        {isProposal ? (
                                                                            <div className="flex items-center justify-center gap-1">
                                                                                <button onClick={() => handleAuthorize([inv])} className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded" title="Autorizar Factura"><CheckCircle2 size={16} /></button>
                                                                                <button onClick={() => handleExclude(inv.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50" title="Excluir"><X size={16} /></button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center">
                                                                                <Badge status="success">AUTORIZADO</Badge>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

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
                                        ))}
                                    </div>

                                    {/* Sección NO Fiscales */}
                                    <div className="space-y-3">
                                        <div
                                            className="flex items-center gap-2 mb-2 pt-4 border-t border-dashed border-slate-200 cursor-pointer group hover:opacity-80 transition-opacity"
                                            onClick={() => setIsNonFiscalExpanded(!isNonFiscalExpanded)}
                                        >
                                            <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg"><ShieldAlert size={18} /></div>
                                            <h3 className="font-bold text-slate-700">No Fiscales / Anticipos (TAR Code)</h3>
                                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{nonFiscal.length}</span>
                                            {isNonFiscalExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        </div>

                                        {isNonFiscalExpanded && (nonFiscal.length > 0 ? (
                                            <div className="bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse min-w-[1600px]">
                                                        <thead className="bg-amber-50/50">
                                                            <tr className="text-xs uppercase text-slate-600 font-bold tracking-wider">
                                                                {[
                                                                    { label: 'Invoice', key: 'invoice' },
                                                                    { label: 'Posted', key: 'posted' },
                                                                    { label: 'Balance mn', key: 'balance_mn', align: 'right' },
                                                                    { label: 'New Balance MN', key: 'new_balance_mn', align: 'right' },
                                                                    { label: 'Due date', key: 'due_date' },
                                                                    { label: 'Currency code', key: 'currency_code', align: 'center' },
                                                                    { label: 'Open payable', key: 'openpayable' },
                                                                    { label: 'Description Tran Doc Type', key: 'description_tran_doc_type' },
                                                                    { label: 'Transac_ref_c', key: 'transac_ref_c' },
                                                                    { label: 'Transac_num_c', key: 'transac_num_c' },
                                                                    { label: 'Fiscal Folio', key: 'uuid' },
                                                                    { label: 'TAR Code', key: 'tar_code', align: 'center' },
                                                                    { label: 'HoldInvoice', key: 'holdinvoice', align: 'center' },
                                                                    { label: 'Hold Payments', key: 'hold_payments', align: 'center' },
                                                                    { label: 'MsgHoldPayment_c', key: 'msgholdpayment_c' }
                                                                ].map((col) => (
                                                                    <th
                                                                        key={col.key}
                                                                        className={`p-4 whitespace-nowrap cursor-pointer hover:bg-amber-100/50 transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                                                                        onClick={() => {
                                                                            const dir = sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                                            setSortConfig({ key: col.key, direction: dir });
                                                                        }}
                                                                    >
                                                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                                                            {col.label}
                                                                            <ArrowUpDown size={12} className={sortConfig.key === col.key ? 'text-primary' : 'text-slate-300'} />
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                                <th className="p-4 text-center sticky right-0 bg-amber-50/50">Acción</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-amber-50 text-sm">
                                                            {sortedNonFiscal.map(inv => (
                                                                <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${isRejected ? 'bg-red-50/60' : ''}`}>
                                                                    <td className="p-4 font-medium text-slate-700">{String(inv.meta?.invoice ?? '')}</td>
                                                                    <td className="p-4 font-mono text-xs">{String(inv.meta?.posted ?? '')}</td>
                                                                    <td className="p-4 text-right">{formatCurrency(inv.meta?.balance_mn)}</td>
                                                                    <td className="p-4 text-right font-bold">{formatCurrency(inv.meta?.new_balance_mn)}</td>
                                                                    <td className="p-4 whitespace-nowrap">{String(inv.meta?.due_date ?? '')}</td>
                                                                    <td className="p-4 text-center font-bold text-xs">{String(inv.meta?.currency_code ?? '')}</td>
                                                                    <td className="p-4 font-mono text-xs">{String(inv.meta?.openpayable ?? '')}</td>
                                                                    <td className="p-4 text-xs">{String(inv.meta?.description_tran_doc_type ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-500">{String(inv.meta?.transac_ref_c ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-500">{String(inv.meta?.transac_num_c ?? '')}</td>
                                                                    <td className="p-4 font-mono text-[10px] text-slate-400">{String(inv.uuid ?? '')}</td>
                                                                    <td className="p-4 text-center">{String(inv.meta?.tar_code ?? '')}</td>
                                                                    <td className={`p-4 text-center font-semibold ${inv.meta?.isHoldInvoice ? 'text-red-600 bg-red-50' : ''}`}>
                                                                        {String(inv.meta?.holdinvoice ?? '')}
                                                                    </td>
                                                                    <td className={`p-4 text-center font-semibold ${inv.meta?.isHoldPayment ? 'text-red-600 bg-red-50' : ''}`}>
                                                                        {String(inv.meta?.hold_payments ?? '')}
                                                                    </td>
                                                                    <td className="p-4 text-xs italic text-slate-500 max-w-xs truncate" title={String(inv.meta?.msgholdpayment_c ?? '')}>
                                                                        {String(inv.meta?.msgholdpayment_c ?? '')}
                                                                    </td>
                                                                    <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-slate-50">
                                                                        <button onClick={() => handleExclude(inv.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"><X size={16} /></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic p-4 border border-dashed rounded-xl">No hay registros no fiscales.</div>
                                        ))}
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
