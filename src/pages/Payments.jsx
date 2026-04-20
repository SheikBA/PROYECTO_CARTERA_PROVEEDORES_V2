import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, DollarSign, Clock, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft, RefreshCw, Building2, Layers, Users, X, Plus, ArrowRightLeft, Briefcase, FileText, ShieldAlert, ChevronUp, ChevronDown, Lock, Landmark } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
// Ya no importamos CATALOG_... fijos, los recibiremos por props

const Payments = ({ rawInvoices, setRawInvoices, setProposalInvoices, authorizedInvoices, setAuthorizedInvoices, setFinalizedInvoices, setRejectedInvoices, availableInvoices, setAvailableInvoices, trackingData, setTrackingData, catalogs, activeBatch, setActiveBatch, currentUser, mode = 'proposal', subMode = '' }) => {
    const isProposal = mode === 'proposal';
    const isAuthorized = mode === 'authorized';
    const isRejected = mode === 'rejected';
    // El sistema se bloquea en Gestión si hay un Batch ya finalizado
    const isLocked = isProposal && activeBatch?.status === 'finalized';

    // Desempaquetamos los catálogos con máxima seguridad para evitar errores de tipo
    const CATALOG_BANCOS = Array.isArray(catalogs?.banks) ? catalogs.banks : [];
    const CATALOG_COMPANIAS = Array.isArray(catalogs?.companies) ? catalogs.companies : [];
    const CATALOG_GRUPOS = Array.isArray(catalogs?.groups) ? catalogs.groups : [];

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

    // Estado para la nueva funcionalidad de Grupos de Pagos Procesados
    const [showGroupsView, setShowGroupsView] = useState(false);
    const [hasJustFinished, setHasJustFinished] = useState(false);
    const [groupSearchTerm, setGroupSearchTerm] = useState(''); // New state for modal search

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignSourceBank, setReassignSourceBank] = useState(null);
    const [reassignTargetBank, setReassignTargetBank] = useState('');

    const [searchUuid, setSearchUuid] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // Estados para Secciones Colapsables (Nivel 4)
    const [isFiscalExpanded, setIsFiscalExpanded] = useState(true);
    const [isNonFiscalExpanded, setIsNonFiscalExpanded] = useState(true);

    // Pagination & Local Search State (Level 4)
    const [invoicePage, setInvoicePage] = useState(1);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const ITEMS_PER_PAGE = 10;

    // Helper formatting functions
    const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    // --------------------------------------------------------------------------------
    // CORE LOGIC: Derived State from rawInvoices
    // --------------------------------------------------------------------------------

    // Combinamos facturas para la visualización en modo propuesta para que no desaparezcan al autorizar
    const displayInvoices = useMemo(() => {
        const invoicesArray = Array.isArray(rawInvoices) ? rawInvoices : [];
        const authorizedArray = Array.isArray(authorizedInvoices) ? authorizedInvoices : [];

        if (isProposal) {
            // Para refinar la propuesta, necesitamos ver tanto lo pendiente como lo autorizado.
            const pending = invoicesArray.map(inv => ({ ...inv, _status: 'pending' }));
            const authorized = authorizedArray.map(inv => ({ ...inv, _status: 'authorized' }));
            return [...pending, ...authorized];
        }
        return invoicesArray;
    }, [rawInvoices, authorizedInvoices, isProposal]);

    // 1. Calculate general KPIs
    const kpis = useMemo(() => {
        const pendingArr = Array.isArray(rawInvoices) ? rawInvoices : [];
        const authArr = Array.isArray(authorizedInvoices) ? authorizedInvoices : [];
        const allInvoices = [...pendingArr, ...authArr];

        const companyTotals = {};
        const bankCompanyTotals = {};

        allInvoices.forEach(inv => {
            const co = inv.meta?.company || inv.company || 'Sin Empresa';
            const bkId = inv.bankId || 'Sin Banco';
            const cur = inv.currency || 'MXN';
            const amt = inv.amount || 0;

            const bMeta = CATALOG_BANCOS.find(b => String(b.id) === String(bkId));
            const bkName = bMeta ? bMeta.bank : bkId;

            // Agrupación por Compañía
            if (!companyTotals[co]) companyTotals[co] = { MXN: 0, USD: 0 };
            companyTotals[co][cur] = (companyTotals[co][cur] || 0) + amt;

            // Agrupación por Banco + Compañía
            if (!bankCompanyTotals[bkName]) bankCompanyTotals[bkName] = { MXN: 0, USD: 0, companies: {} };
            bankCompanyTotals[bkName][cur] += amt;

            if (!bankCompanyTotals[bkName].companies[co]) bankCompanyTotals[bkName].companies[co] = { MXN: 0, USD: 0 };
            bankCompanyTotals[bkName].companies[co][cur] += amt;
        });

        const getTotals = (arr) => ({
            MXN: arr.filter(i => i.currency === 'MXN').reduce((s, i) => s + i.amount, 0),
            USD: arr.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0)
        });

        // H2H Logic
        const h2hPending = pendingArr.filter(inv => inv.meta?.isH2H || inv.member_id === 1 || inv.member_id === '1');
        const h2hAuth = authArr.filter(inv => inv.meta?.isH2H || inv.member_id === 1 || inv.member_id === '1');

        // Non-H2H Logic
        const nonH2hPending = pendingArr.filter(inv => !(inv.meta?.isH2H || inv.member_id === 1 || inv.member_id === '1'));
        const nonH2hAuth = authArr.filter(inv => !(inv.meta?.isH2H || inv.member_id === 1 || inv.member_id === '1'));

        const fiscalErrors = allInvoices.filter(inv => inv.meta?.hasFiscalError).length;

        return {
            companyTotals,
            bankCompanyTotals,
            h2h: {
                pending: getTotals(h2hPending),
                applied: getTotals(h2hAuth)
            },
            nonH2h: {
                pending: getTotals(nonH2hPending),
                applied: getTotals(nonH2hAuth)
            },
            totalToPay: allInvoices.reduce((s, i) => s + i.amount, 0),
            companiesCount: Object.keys(companyTotals).length,
            fiscalErrors,
        };
    }, [rawInvoices, authorizedInvoices, trackingData, isProposal, CATALOG_BANCOS]);

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

        const invoicesToProcess = displayInvoices;

        invoicesToProcess.forEach(inv => {
            // Nivel 1: Banco
            const bankMatch = CATALOG_BANCOS.find(b =>
                b && inv && String(b.id).trim() === String(inv.bankId).trim()
            );

            let bankNode;
            if (bankMatch) {
                bankNode = treeMap.get(bankMatch.id);
            } else {
                // Fallback a los nodos genéricos
                bankNode = inv.currency === 'USD' ? unassignedUSD : unassignedMXN;
            }

            if (bankNode && Array.isArray(bankNode.items)) {
                bankNode.amount += inv.amount;
                // Aseguramos que el banco tenga la factura para acciones de nivel 0
                bankNode.invoices.push(inv);

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

                // Inicializar arreglo de facturas en compañía si no existe
                if (!compNode.invoices) compNode.invoices = [];

                // Ajuste de Jerarquía: Saltamos nivel visual de Compañía si es necesario para ir directo a Grupo
                // Pero mantenemos la estructura interna.
                if (compNode) {
                    compNode.amount += inv.amount;
                    compNode.invoices.push(inv); // Aseguramos facturas en nivel compañía

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
    }, [displayInvoices, CATALOG_BANCOS, CATALOG_COMPANIAS, CATALOG_GRUPOS]);

    // Helper function for recursive filtering of the bankTree
    // Los montos se recalculan correctamente en base a los nodos/facturas que sobreviven el filtro
    const filterTreeRecursively = (nodes, term) => {
        if (!term) return nodes;
        const lowerTerm = term.toLowerCase();

        return nodes.map(node => {
            const nodeMatches =
                String(node.name || '').toLowerCase().includes(lowerTerm) ||
                String(node.account || '').toLowerCase().includes(lowerTerm) ||
                String(node.description || '').toLowerCase().includes(lowerTerm) ||
                String(node.country || '').toLowerCase().includes(lowerTerm);

            // Filtrar facturas directas del nodo
            const matchedInvoices = (node.invoices || []).filter(inv =>
                String(inv.meta?.invoice || '').toLowerCase().includes(lowerTerm) ||
                String(inv.uuid || '').toLowerCase().includes(lowerTerm) ||
                String(inv.providerName || '').toLowerCase().includes(lowerTerm) ||
                (lowerTerm.includes('h2h') && inv.meta?.isH2H) ||
                (lowerTerm.includes('kissflow') && inv.meta?.isKissflow)
            );

            // Filtrar hijos recursivamente
            const filteredChildren = filterTreeRecursively(node.items || [], term);

            if (!nodeMatches && matchedInvoices.length === 0 && filteredChildren.length === 0) return null;

            // Recalcular monto: suma de facturas filtradas + suma de hijos filtrados
            const invoicesAmount = matchedInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
            const childrenAmount = filteredChildren.reduce((s, c) => s + (c.amount || 0), 0);

            return {
                ...node,
                invoices: matchedInvoices,
                items: filteredChildren,
                amount: invoicesAmount + childrenAmount,
            };
        }).filter(Boolean);
    };

    // Global filtered bank tree based on searchTerm
    const filteredGlobalBankTree = useMemo(() => {
        return filterTreeRecursively(bankTree, searchTerm);
    }, [bankTree, searchTerm]);

    // Paginación de Bancos (Lógica faltante que causaba el error)
    const filteredBanks = useMemo(() => {
        const list = (filteredGlobalBankTree || []).filter(b => { // Use filteredGlobalBankTree here
            // REQUERIMIENTO: En modo Autorizados, solo mostrar bancos que tengan facturas (monto > 0)
            if (isAuthorized) {
                return b.amount > 0;
            }
            return true;
        });

        // Ordenamos por nombre de banco para agrupar visualmente "por banco"
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [filteredGlobalBankTree, isAuthorized, isRejected]);

    // Reset pagination when provider changes
    useEffect(() => {
        setInvoicePage(1);
        setInvoiceSearch('');
    }, [selectedProvider]);


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

    // --- LOGICA DE BATCH (FINALIZAR PROCESO) ---
    const handleFinalizeBatch = () => {
        if (authorizedInvoices.length === 0) {
            alert("No hay facturas autorizadas para finalizar la propuesta.");
            return;
        }

        const confirmFinalize = window.confirm("¿Está seguro de finalizar esta propuesta de pago? Una vez finalizada, se generará un lote para el módulo de Pagos Autorizados.");

        if (confirmFinalize) {
            const batchId = `BCH-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

            // CREAR SNAPSHOT: Enviamos la información actual a la lista definitiva de Pagos Autorizados
            if (setFinalizedInvoices) {
                setFinalizedInvoices([...authorizedInvoices]);
            }

            setActiveBatch({
                id: batchId,
                status: 'finalized',
                createdAt: new Date().toISOString()
            });
            alert(`Propuesta finalizada con éxito. ID de Lote: ${batchId}`);
        }
    };

    const handleEditBatch = () => {
        setActiveBatch(prev => ({ ...prev, status: 'editing' }));
    };

    const handleDeleteBatch = () => {
        const confirmDelete = window.confirm("¡ADVERTENCIA! Si elimina el Batch, todas las facturas autorizadas se liberarán y volverán al panel de Gestión. ¿Desea continuar?");

        if (confirmDelete) {
            // Liberar facturas: Mover de authorizedInvoices a rawInvoices
            if (setProposalInvoices) {
                setProposalInvoices(prev => [...prev, ...authorizedInvoices]);
            }
            if (setAuthorizedInvoices) {
                setAuthorizedInvoices([]);
            }
            setActiveBatch(null);
            alert("Batch eliminado. Las facturas han sido liberadas.");
        }
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

        // Limpiar de ambas listas posibles en Gestión
        setRawInvoices(prev => (prev || []).filter(inv => !ids.includes(inv.id)));
        if (setAuthorizedInvoices) {
            setAuthorizedInvoices(prev => (prev || []).filter(inv => !ids.includes(inv.id)));
        }

        if (setRejectedInvoices) {
            setRejectedInvoices(prev => [...prev, ...invoicesToMove]);
        }
    };

    const handleRevoke = (invoicesToMove) => {
        if (!invoicesToMove || invoicesToMove.length === 0) return;
        const ids = invoicesToMove.map(inv => inv.id);

        // 1. Quitar de la lista de Autorizados
        if (setAuthorizedInvoices) {
            setAuthorizedInvoices(prev => (prev || []).filter(inv => !ids.includes(inv.id)));
        }

        // 2. Devolver a pendientes (rawInvoices)
        if (setProposalInvoices) {
            setProposalInvoices(prev => [...prev, ...invoicesToMove]);
        }
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

            // REGLA FISCAL: tiene UUID = Fiscal, sin UUID = No Fiscal
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

    // Confirm Global Payment - sends everything to tracking
    const handleGlobalConfirm = () => {
        const inputAmount = parseFloat(globalAmountInput) || 0;
        const totalExpected = kpis.totalToPay;

        if (Math.abs(inputAmount - totalExpected) > 0.01) {
            alert(`Error de Validación: El importe ingresado (${formatCurrency(inputAmount)}) debe ser IGUAL al Monto Total Autorizado (${formatCurrency(totalExpected)}) para proceder con la dispersión.`);
            return;
        }

        if (confirm(`¿Estás seguro de confirmar el pago masivo por ${formatCurrency(kpis.totalToPay)}?`)) {

            // REQUERIMIENTO: Transformar a estatus "PROCESANDO PAGO" y agregar log inicial para trazabilidad
            const newTracking = (rawInvoices || []).map(inv => ({
                ...inv,
                trackingId: `TRK-${Math.floor(Math.random() * 10000 + 1000)}`,
                processedDate: new Date().toISOString().split('T')[0],
                status: 'PROCESANDO PAGO',
                batchId: activeBatch?.id || 'MANUAL',
                auditLog: [{
                    event: 'DISPERSION_ERP',
                    timestamp: new Date().toISOString(),
                    user: currentUser?.name || 'Sistema',
                    details: `Pago enviado a cola de procesamiento ERP por ${currentUser?.name || 'usuario desconocido'}`
                }]
            }));

            setTrackingData(prev => [...prev, ...newTracking]);

            // Limpieza y cambio de estado visual
            setRawInvoices([]);
            setHasJustFinished(true);

            setSelectedBank(null);
            setSelectedCompany(null);
            setSelectedGroup(null);
            setSelectedProvider(null);
            setDrillLevel(0);
            if (setActiveBatch) setActiveBatch(null);
        }
    };

    // Nueva acción: Devolver factura rechazada a la gestión de pagos (Reprocesar)
    const handleRestoreProviderGroup = (providerName) => {
        if (window.confirm(`¿Deseas devolver al proveedor "${providerName}" a la gestión de pagos? Las facturas volverán a estar pendientes de autorización.`)) {
            // 1. Identificamos las facturas de este proveedor en la lista de rechazados
            const toRestore = rawInvoices.filter(inv => inv.providerName === providerName);

            // 2. Quitamos del bucket de rechazados
            if (setRejectedInvoices) {
                setRejectedInvoices(prev => prev.filter(inv => inv.providerName !== providerName));
            }

            // 3. Devolvemos a la propuesta original (Gestión) marcándolas como pendientes
            if (setProposalInvoices) {
                setProposalInvoices(prev => [
                    ...prev,
                    ...toRestore.map(inv => ({
                        ...inv,
                        status: 'pending',
                        _status: 'pending'
                    }))
                ]);
            }
        }
    };

    // --- FUNCIÓN HELPER PARA RENDERIZAR EL ACORDEÓN DE PROVEEDOR (EXTRAÍDA DEL RENDER) ---
    const renderProviderAccordion = (group, idx) => (
        <details key={idx} className="group border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 list-none">
                <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${group.isH2H ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            {group.name}
                            {group.isH2H && (
                                <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-sm font-black shadow-sm ring-1 ring-indigo-700/50 uppercase tracking-tighter">
                                    H2H
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-slate-500">{group.count} facturas procesadas</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className={`font-bold ${group.invoices.every(i => i.status === 'RECHAZADO MANUAL') ? 'text-red-400 line-through' : 'text-slate-900'}`}>
                            {formatCurrency(group.total)}
                        </p>
                        <Badge
                            status={group.invoices.every(i => i.status === 'RECHAZADO MANUAL') ? 'danger' : 'info'}
                            className="text-[10px] py-0"
                        >
                            {group.invoices.every(i => i.status === 'RECHAZADO MANUAL') ? 'RECHAZADO' : 'PROCESANDO PAGO'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Botón de Rechazo (Solo en modo procesamiento) */}
                        {!isRejected && group.invoices.some(i => i.status === 'PROCESANDO PAGO') && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRejectProviderGroup(group.name); }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Rechazar grupo de pago"
                            >
                                <ShieldAlert size={18} />
                            </button>
                        )}
                        {/* Botón de Restaurar (Solo en modo Historial de Rechazos) */}
                        {isRejected && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreProviderGroup(group.name); }}
                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                title="Devolver a Gestión de Pagos"
                            >
                                <RefreshCw size={18} />
                            </button>
                        )}
                        <ChevronRight size={18} className="text-slate-300 group-open:rotate-90 transition-transform" />
                    </div>
                </div>
            </summary>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[500px]">
                    <thead>
                        <tr className="text-slate-400 font-bold uppercase tracking-tighter border-b border-slate-200">
                            <th className="pb-2">Factura</th>
                            <th className="pb-2">ID Tracking</th>
                            <th className="pb-2">Fecha Proc.</th>
                            <th className="pb-2 text-right">Importe</th>
                            <th className="pb-2 text-center">Estatus ERP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {group.invoices.map((inv, i) => (
                            <tr key={i} className="text-slate-700">
                                <td className="py-2 font-medium">
                                    <div className="flex items-center gap-2">
                                        {inv.meta?.invoice}
                                        {inv.meta?.isKissflow && (
                                            <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-sm font-black shadow-sm ring-1 ring-purple-700/50 uppercase tracking-tighter">
                                                KISSFLOW
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-2 font-mono text-slate-400">{inv.trackingId}</td>
                                <td className="py-2">{inv.processedDate}</td>
                                <td className="py-2 text-right font-bold">{formatCurrency(inv.amount)}</td>
                                <td className="py-2 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'RECHAZADO MANUAL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                        {inv.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );

    // Nueva acción: Rechazar grupo de pago completo desde la vista de procesamiento
    const handleRejectProviderGroup = (providerName) => {
        if (window.confirm(`¿Estás seguro de rechazar el grupo de pago para el proveedor: ${providerName}? Esta acción quedará registrada en el log.`)) {
            setTrackingData(prev => prev.map(inv => {
                if (inv.providerName === providerName && (inv.status === 'PROCESANDO PAGO' || inv.status === 'pending')) {
                    return {
                        ...inv,
                        status: 'RECHAZADO MANUAL',
                        rejectedAt: new Date().toISOString(),
                        auditLog: [
                            ...(inv.auditLog || []),
                            {
                                event: 'RECHAZO_MANUAL_GRUPO',
                                timestamp: new Date().toISOString(),
                                user: currentUser?.name || 'Sistema',
                                details: 'El usuario rechazó el grupo de pago completo desde la vista de grupos.'
                            }
                        ]
                    };
                }
                return inv;
            }));
        }
    };

    // Lógica para agrupar el tracking filtrando solo lo del BATCH ACTUAL
    const processedGroups = useMemo(() => {
        const providerMap = {};
        const lowerSearch = groupSearchTerm.toLowerCase();
        const mainLowerSearch = searchTerm.toLowerCase();

        // En modo REJECTED usamos rawInvoices (que vienen de App.jsx), de lo contrario trackingData
        const sourceData = isRejected ? rawInvoices : trackingData;

        // Filtramos de forma más inclusiva para evitar que la pantalla se quede en blanco
        const currentItems = (sourceData || []).filter(item => {
            if (isRejected) {
                // Filtrado por subMode (H2H o General) en el módulo de rechazados
                const isH2H = item.meta?.isH2H || item.member_id === 1 || item.member_id === '1';
                const matchesSubMode = subMode === 'h2h' ? isH2H : !isH2H;
                if (!matchesSubMode) return false;
            } else {
                const isCurrentBatch = activeBatch?.id && item.batchId === activeBatch.id;
                const isJustFinished = hasJustFinished && (item.status === 'PROCESANDO PAGO' || item.status === 'RECHAZADO MANUAL');
                if (!(isCurrentBatch || isJustFinished)) return false;
            }

            // Aplicamos búsqueda (usamos searchTerm si es el módulo principal de rechazados)
            const term = isRejected ? mainLowerSearch : lowerSearch;
            if (!term) return true;

            // Búsqueda por proveedor, factura o tracking ID
            return (
                String(item.providerName || '').toLowerCase().includes(term) ||
                String(item.meta?.invoice || '').toLowerCase().includes(term) ||
                String(item.trackingId || '').toLowerCase().includes(term)
            );
        });

        currentItems.forEach(item => {
            if (!providerMap[item.providerName]) {
                providerMap[item.providerName] = {
                    name: item.providerName,
                    total: 0,
                    count: 0,
                    invoices: [],
                    isH2H: false
                };
            }
            providerMap[item.providerName].total += item.amount;
            providerMap[item.providerName].count += 1;
            providerMap[item.providerName].invoices.push(item);

            // Aseguramos detección de H2H
            if (item.meta?.isH2H || item.member_id === 1 || item.member_id === '1') {
                providerMap[item.providerName].isH2H = true;
            }
        });

        const allGroups = Object.values(providerMap);
        return {
            h2h: allGroups.filter(g => g.isH2H),
            general: allGroups.filter(g => !g.isH2H)
        };
    }, [rawInvoices, trackingData, activeBatch, hasJustFinished, groupSearchTerm, searchTerm, isRejected, subMode]);

    // ─── PAGOS: Layout limpio para el módulo de facturas autorizadas ───
    if (isAuthorized) {
        const totalMXN = (rawInvoices || []).filter(i => i.currency !== 'USD').reduce((s, i) => s + (i.amount || 0), 0);
        const totalUSD = (rawInvoices || []).filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount || 0), 0);
        const uniqueCompanies = new Set((rawInvoices || []).map(i => i.meta?.company || i.company).filter(Boolean));
        const uniqueBanks = new Set((rawInvoices || []).map(i => i.bankId).filter(Boolean));

        const filteredAuthorized = (rawInvoices || []).filter(inv => {
            if (!invoiceSearch) return true;
            const term = invoiceSearch.toLowerCase();
            return String(inv.providerName || '').toLowerCase().includes(term)
                || String(inv.meta?.invoice || '').toLowerCase().includes(term)
                || String(inv.uuid || '').toLowerCase().includes(term);
        });

        const totalAuthPages = Math.ceil(filteredAuthorized.length / ITEMS_PER_PAGE);
        const paginatedAuthorized = filteredAuthorized.slice(
            (invoicePage - 1) * ITEMS_PER_PAGE,
            invoicePage * ITEMS_PER_PAGE
        );

        const getBankName = (bankId) => {
            const b = CATALOG_BANCOS.find(b => String(b.id) === String(bankId));
            return b ? b.bank : bankId;
        };

        return (
            <div className="p-6 h-full flex flex-col gap-4 animate-fade-in-up overflow-y-auto">

                {/* HEADER */}
                <div className="shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">PAGOS</h1>
                            <p className="text-xs text-slate-400 mt-0.5">Etapa 2: Control de dispersión a ERP</p>
                        </div>
                        <Button variant="secondary" icon={Download} size="sm">Exportar</Button>
                    </div>

                    {/* SUB-HEADER: ID de lote / multi-batch */}
                    {activeBatch && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote</span>
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                                    {activeBatch.id}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-slate-200" />
                            <span className="text-xs text-slate-500">{(rawInvoices || []).length} facturas autorizadas</span>
                            <div className="h-4 w-px bg-slate-200" />
                            <span className="text-xs text-slate-500">
                                Creado: {activeBatch.createdAt ? new Date(activeBatch.createdAt).toLocaleDateString('es-MX') : '—'}
                            </span>
                            <div className="ml-auto">
                                <Badge status="success">LOTE ACTIVO</Badge>
                            </div>
                        </div>
                    )}
                </div>

                {/* KPIs Grid - Rediseño Aplicado a Pantalla PAGOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    {/* CARD 1: TOTAL POR COMPAÑIA */}
                    <Card className="h-64 flex flex-col p-0 overflow-hidden border-t-4 border-t-indigo-500 shadow-sm">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total por Compañía</span>
                            <Building2 size={14} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-[10px] text-left">
                                <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm">
                                    <tr className="text-slate-400 font-bold">
                                        <th className="p-2">Compañía</th>
                                        <th className="p-2 text-right">MXN</th>
                                        <th className="p-2 text-right">USD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Object.entries(kpis.companyTotals).map(([name, totals]) => (
                                        <tr key={name} className="hover:bg-slate-50/50">
                                            <td className="p-2 font-bold text-slate-700 truncate max-w-[80px]" title={name}>{name}</td>
                                            <td className="p-2 text-right font-mono text-slate-600">{formatCurrency(totals.MXN).replace('$', '')}</td>
                                            <td className="p-2 text-right font-mono text-blue-600">{totals.USD > 0 ? formatCurrency(totals.USD).replace('$', '') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* CARD 2: TOTAL POR BANCO Y COMPAÑIA */}
                    <Card className="h-64 flex flex-col p-0 overflow-hidden border-t-4 border-t-amber-500 shadow-sm">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Banco / Co.</span>
                            <Landmark size={14} className="text-amber-500" />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-[9px] text-left">
                                <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm">
                                    <tr className="text-slate-400 font-bold">
                                        <th className="p-2">Banco / Co.</th>
                                        <th className="p-2 text-right">MXN</th>
                                        <th className="p-2 text-right">USD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Object.entries(kpis.bankCompanyTotals).map(([bkName, data]) => (
                                        <React.Fragment key={bkName}>
                                            <tr className="bg-slate-50/80 font-black text-slate-800">
                                                <td className="p-2 uppercase">{bkName}</td>
                                                <td className="p-2 text-right">{formatCurrency(data.MXN).replace('$', '')}</td>
                                                <td className="p-2 text-right">{data.USD > 0 ? formatCurrency(data.USD).replace('$', '') : '—'}</td>
                                            </tr>
                                            {Object.entries(data.companies).map(([coName, coTotals]) => (
                                                <tr key={coName} className="text-slate-500 italic">
                                                    <td className="p-1 pl-4 truncate max-w-[80px]">{coName}</td>
                                                    <td className="p-1 text-right">{formatCurrency(coTotals.MXN).replace('$', '')}</td>
                                                    <td className="p-1 text-right">{coTotals.USD > 0 ? formatCurrency(coTotals.USD).replace('$', '') : '—'}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* CARD 3: TOTAL HSH (H2H) */}
                    <Card className="h-64 flex flex-col justify-between border-t-4 border-t-blue-500 shadow-sm">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total HSH (H2H)</span>
                                <Users size={14} className="text-blue-500" />
                            </div>
                            <div className="space-y-3">
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total por Pagar H2H</p>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-slate-500">MXN</span><span className="font-bold">{formatCurrency(kpis.h2h.pending.MXN)}</span></div>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-blue-500">USD</span><span className="font-bold text-blue-600">{formatCurrency(kpis.h2h.pending.USD).replace('$', 'US$ ')}</span></div>
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Total Aplicado H2H</p>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-emerald-500">MXN</span><span className="font-bold text-emerald-700">{formatCurrency(kpis.h2h.applied.MXN)}</span></div>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-emerald-500">USD</span><span className="font-bold text-emerald-700">{formatCurrency(kpis.h2h.applied.USD).replace('$', 'US$ ')}</span></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* CARD 4: TOTAL SIN HSH */}
                    <Card className="h-64 flex flex-col justify-between border-t-4 border-t-slate-400 shadow-sm">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Sin HSH</span>
                                <DollarSign size={14} className="text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total por Pagar Sin H2H</p>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-slate-500">MXN</span><span className="font-bold">{formatCurrency(kpis.nonH2h.pending.MXN)}</span></div>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-blue-500">USD</span><span className="font-bold text-blue-600">{formatCurrency(kpis.nonH2h.pending.USD).replace('$', 'US$ ')}</span></div>
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Total Aplicado Sin H2H</p>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-emerald-500">MXN</span><span className="font-bold text-emerald-700">{formatCurrency(kpis.nonH2h.applied.MXN)}</span></div>
                                    <div className="flex justify-between font-mono text-[10px]"><span className="text-emerald-500">USD</span><span className="font-bold text-emerald-700">{formatCurrency(kpis.nonH2h.applied.USD).replace('$', 'US$ ')}</span></div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* TABLA DE FACTURAS AUTORIZADAS */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm overflow-hidden min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                        <div>
                            <h2 className="font-bold text-slate-700">Facturas Autorizadas</h2>
                            <p className="text-xs text-slate-400">{filteredAuthorized.length} registros</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar proveedor, factura o UUID..."
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/20"
                                value={invoiceSearch}
                                onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredAuthorized.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-16">
                                <CheckCircle2 size={40} className="opacity-20" />
                                <p className="text-sm font-medium">
                                    {(rawInvoices || []).length === 0
                                        ? 'No hay facturas en este lote.'
                                        : 'Sin resultados para la búsqueda.'}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr className="text-[10px] text-slate-500 font-black uppercase tracking-wide">
                                        <th className="px-4 py-3">Proveedor</th>
                                        <th className="px-4 py-3">Empresa</th>
                                        <th className="px-4 py-3">Factura</th>
                                        <th className="px-4 py-3 hidden lg:table-cell">UUID</th>
                                        <th className="px-4 py-3">Banco</th>
                                        <th className="px-4 py-3 text-center">Moneda</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                        <th className="px-4 py-3 hidden sm:table-cell">Vencimiento</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedAuthorized.map((inv, idx) => (
                                        <tr key={inv.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="truncate max-w-[160px]" title={inv.providerName}>{inv.providerName}</span>
                                                    <div className="flex gap-1">
                                                        {inv.meta?.isH2H && <span className="bg-indigo-600 text-white text-[8px] px-1 py-0.5 rounded-sm font-black uppercase">H2H</span>}
                                                        {inv.meta?.isKissflow && <span className="bg-purple-600 text-white text-[8px] px-1 py-0.5 rounded-sm font-black uppercase">KF</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{inv.meta?.company || inv.company || '—'}</td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{inv.meta?.invoice || '—'}</td>
                                            <td className="px-4 py-3 font-mono text-slate-400 hidden lg:table-cell">
                                                <span className="truncate max-w-[180px] block" title={inv.uuid}>
                                                    {inv.uuid ? `${inv.uuid.substring(0, 16)}…` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-[10px]">{getBankName(inv.bankId)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge status={inv.currency === 'USD' ? 'success' : 'info'}>{inv.currency || 'MXN'}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(inv.amount)}</td>
                                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{inv.dueDate || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge status="success">AUTORIZADA</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Paginación */}
                    {totalAuthPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 shrink-0 bg-white">
                            <span className="text-xs text-slate-400">
                                {((invoicePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(invoicePage * ITEMS_PER_PAGE, filteredAuthorized.length)} de {filteredAuthorized.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                                    disabled={invoicePage === 1}
                                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} className="text-slate-500" />
                                </button>
                                <span className="text-xs font-bold text-slate-600 px-2">{invoicePage} / {totalAuthPages}</span>
                                <button
                                    onClick={() => setInvoicePage(p => Math.min(totalAuthPages, p + 1))}
                                    disabled={invoicePage === totalAuthPages}
                                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={16} className="text-slate-500" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal: grupos de pago post-dispersión */}
                {showGroupsView && (
                    <Modal isOpen={true} onClose={() => setShowGroupsView(false)} title="GRUPOS DE PAGOS" size="lg">
                        <div className="p-4 space-y-3">
                            {processedGroups.h2h.concat(processedGroups.general).map((group, idx) => renderProviderAccordion(group, idx))}
                        </div>
                    </Modal>
                )}
            </div>
        );
    }

    return (

        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in-up">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                        {isProposal ? 'Gestión de Pagos' : isAuthorized ? 'Pagos Autorizados' : 'Historial de Rechazos'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        <p className="text-slate-500">
                            {isProposal ? 'Etapa 1: Refinamiento y autorización.' : 'Etapa 2: Control de dispersión.'}
                        </p>
                        {isLocked && (
                            <Badge status="info" className="animate-pulse">
                                <Lock size={12} className="mr-1" /> PROPUESTA BLOQUEADA (BATCH ACTIVO)
                            </Badge>
                        )}
                        {activeBatch && (
                            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Batch Activo:</span>
                                <span className="text-xs font-mono font-bold text-primary">{activeBatch.id}</span>
                                {isProposal && (
                                    <div className="flex gap-1 ml-2 border-l pl-2 border-slate-300">
                                        {activeBatch.status === 'finalized' ? (
                                            <button onClick={handleEditBatch} className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline">EDITAR</button>
                                        ) : (
                                            <span className="text-emerald-600 text-[10px] font-bold uppercase animate-pulse">Editando...</span>
                                        )}
                                        <button onClick={handleDeleteBatch} className="text-red-600 hover:text-red-800 text-[10px] font-bold underline">ELIMINAR</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    {isProposal && !isLocked && (
                        <>
                            <Button
                                variant="primary"
                                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-blue-200 animate-pulse border-none text-white"
                                onClick={handleFinalizeBatch}
                            >
                                FINALIZAR PROCESO
                            </Button>
                            <Button
                                variant="success"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                icon={CheckCircle2}
                                onClick={() => handleAuthorize(rawInvoices)}
                                disabled={rawInvoices.length === 0}
                            >
                                Autorizar Todo
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Alerta Crítica de Errores Fiscales */}
            {kpis.fiscalErrors > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-600" size={24} />
                        <p className="text-sm text-red-800 font-medium">Se han detectado <b>{kpis.fiscalErrors}</b> facturas con inconsistencias fiscales. Por favor, revíselas antes de procesar el pago.</p>
                    </div>
                </div>
            )}

            {/* KPIs Grid - Rediseñado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: TOTAL POR COMPAÑIA */}
                <Card className="h-64 flex flex-col p-0 overflow-hidden border-t-4 border-t-indigo-500">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total por Compañía</span>
                        <Building2 size={14} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-[10px] text-left">
                            <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm">
                                <tr className="text-slate-400 font-bold">
                                    <th className="p-2">Compañía</th>
                                    <th className="p-2 text-right">MXN</th>
                                    <th className="p-2 text-right">USD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(kpis.companyTotals).map(([name, totals]) => (
                                    <tr key={name} className="hover:bg-slate-50/50">
                                        <td className="p-2 font-bold text-slate-700 truncate max-w-[80px]" title={name}>{name}</td>
                                        <td className="p-2 text-right font-mono text-slate-600">{formatCurrency(totals.MXN).replace('$', 'MX$ ')}</td>
                                        <td className="p-2 text-right font-mono text-blue-600">{totals.USD > 0 ? formatCurrency(totals.USD).replace('$', 'US$ ') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* CARD 2: TOTAL POR BANCO Y COMPAÑIA */}
                <Card className="h-64 flex flex-col p-0 overflow-hidden border-t-4 border-t-amber-500">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Banco / Compañía</span>
                        <Landmark size={14} className="text-amber-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-[9px] text-left">
                            <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm">
                                <tr className="text-slate-400 font-bold">
                                    <th className="p-2">Banco / Co.</th>
                                    <th className="p-2 text-right">MXN</th>
                                    <th className="p-2 text-right">USD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(kpis.bankCompanyTotals).map(([bkName, data]) => (
                                    <React.Fragment key={bkName}>
                                        <tr className="bg-slate-50/80 font-black text-slate-800">
                                            <td className="p-2 uppercase">{bkName}</td>
                                            <td className="p-2 text-right">{formatCurrency(data.MXN).replace('$', '')}</td>
                                            <td className="p-2 text-right">{data.USD > 0 ? formatCurrency(data.USD).replace('$', 'US$ ') : '—'}</td>
                                        </tr>
                                        {Object.entries(data.companies).map(([coName, coTotals]) => (
                                            <tr key={coName} className="text-slate-500 italic">
                                                <td className="p-1 pl-4 truncate max-w-[80px]">{coName}</td>
                                                <td className="p-1 text-right">{formatCurrency(coTotals.MXN).replace('$', '')}</td>
                                                <td className="p-1 text-right">{coTotals.USD > 0 ? formatCurrency(coTotals.USD).replace('$', '') : '—'}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* CARD 3: TOTAL HSH (H2H) */}
                <Card className="h-64 flex flex-col justify-between border-t-4 border-t-blue-500">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total HSH (H2H)</span>
                            <Users size={14} className="text-blue-500" />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Total por Pagar H2H</p>
                                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1">
                                    <span className="text-[10px] font-bold text-slate-500">MXN</span>
                                    <span className="text-sm font-black text-slate-700 font-mono">{formatCurrency(kpis.h2h.pending.MXN)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1">
                                    <span className="text-[10px] font-bold text-blue-500">USD</span>
                                    <span className="text-sm font-black text-blue-700 font-mono">{formatCurrency(kpis.h2h.pending.USD).replace('MXN', 'USD')}</span>
                                </div>
                            </div>

                            <div className="space-y-1 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Total Aplicado (Autorizado)</p>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-emerald-500">MXN</span>
                                    <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(kpis.h2h.applied.MXN)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-emerald-500">USD</span>
                                    <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(kpis.h2h.applied.USD).replace('MXN', 'USD')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* CARD 4: TOTAL SIN HSH (SIN H2H) */}
                <Card className="h-64 flex flex-col justify-between border-t-4 border-t-slate-400">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Sin HSH (General)</span>
                            <DollarSign size={14} className="text-slate-400" />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Total por Pagar Sin H2H</p>
                                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1">
                                    <span className="text-[10px] font-bold text-slate-500">MXN</span>
                                    <span className="text-sm font-black text-slate-700 font-mono">{formatCurrency(kpis.nonH2h.pending.MXN)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-slate-100 pb-1">
                                    <span className="text-[10px] font-bold text-blue-500">USD</span>
                                    <span className="text-sm font-black text-blue-700 font-mono">{formatCurrency(kpis.nonH2h.pending.USD).replace('MXN', 'USD')}</span>
                                </div>
                            </div>

                            <div className="space-y-1 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Total Aplicado (Autorizado)</p>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-emerald-500">MXN</span>
                                    <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(kpis.nonH2h.applied.MXN)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-emerald-500">USD</span>
                                    <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(kpis.nonH2h.applied.USD).replace('MXN', 'USD')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tree Section */}
            <div className="flex-1 bg-surface border border-slate-200 shadow-sm rounded-xl flex flex-col z-10 overflow-hidden min-h-[500px]">
                {isRejected ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-white shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Grupos Rechazados {subMode === 'h2h' ? 'H2H' : 'General'}</h2>
                                <p className="text-xs text-slate-500">Facturas detenidas que pueden ser restauradas a la gestión.</p>
                            </div>
                            <div className="relative w-full sm:w-80">
                                <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Buscar proveedor rechazado..." className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <div className="max-w-5xl mx-auto space-y-4">
                                {processedGroups.h2h.length + processedGroups.general.length > 0 ? (
                                    subMode === 'h2h' ? processedGroups.h2h.map((group, idx) => renderProviderAccordion(group, idx)) : processedGroups.general.map((group, idx) => renderProviderAccordion(group, idx))
                                ) : (
                                    <div className="text-center py-32 bg-white border border-dashed border-slate-200 rounded-2xl">
                                        <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-500 font-medium">No hay grupos rechazados en esta categoría.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
                            {drillLevel > 0 ? (
                                <div className="flex items-center gap-3">
                                    <button onClick={goBack} className="px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-2 bg-slate-50 border border-slate-200 text-sm"><ArrowLeft size={16} /> Atrás</button>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <div className="flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap">
                                        <button onClick={() => { setDrillLevel(0); setSelectedBank(null); setSelectedCompany(null); setSelectedGroup(null); setSelectedProvider(null); }} className="text-slate-500 hover:text-primary transition-colors hover:underline">Bancos</button>
                                        <ChevronRight size={14} className="text-slate-300" />
                                        <button onClick={() => { setDrillLevel(1); setSelectedCompany(null); setSelectedGroup(null); setSelectedProvider(null); }} className="text-slate-500 hover:text-primary transition-colors hover:underline">{selectedBank?.name}</button>
                                        {drillLevel >= 2 && <><ChevronRight size={14} className="text-slate-300" /><button onClick={() => { setDrillLevel(2); setSelectedGroup(null); setSelectedProvider(null); }} className="text-slate-500 hover:text-primary transition-colors hover:underline">{selectedCompany?.name}</button></>}
                                        {drillLevel >= 3 && <><ChevronRight size={14} className="text-slate-300" /><button onClick={() => { setDrillLevel(3); setSelectedProvider(null); }} className="text-slate-500 hover:text-primary transition-colors hover:underline">{selectedGroup?.name}</button></>}
                                        {drillLevel >= 4 && <><ChevronRight size={14} className="text-slate-300" /><span className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{selectedProvider?.name}</span></>}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                                    <div className="flex items-center gap-2">
                                        <Button variant="secondary" icon={Download} size="sm" disabled={isProposal && isLocked}>Exportar</Button>
                                        {isProposal && !isLocked && <Button variant="dark" icon={Plus} size="sm" onClick={() => setIsAddModalOpen(true)}>Añadir Factura</Button>}
                                    </div>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input type="text" placeholder="Buscar en todos los niveles..." className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1 bg-slate-50/50 p-4">
                            {drillLevel === 0 && (
                                <div className="max-w-7xl mx-auto pb-4">
                                    <h2 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-200/50">Lista cuentas pagadoras</h2>
                                    {(bankTree || []).length === 0 ? (
                                        <div className="p-12 text-center text-slate-500">
                                            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No hay catálogos cargados.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 mt-4">
                                            {Object.entries(filteredBanks.reduce((acc, bank) => { const key = bank.name || 'Desconocido'; if (!acc[key]) acc[key] = []; acc[key].push(bank); return acc; }, {})).map(([bankName, accounts]) => (
                                                <div key={bankName} className="animate-fade-in">
                                                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2 flex items-center justify-between cursor-pointer hover:text-primary transition-colors group px-1" onClick={() => setCollapsedBanks(prev => prev.includes(bankName) ? prev.filter(b => b !== bankName) : [...prev, bankName])}>
                                                        <div className="flex items-center gap-2"><Building2 size={16} className="text-slate-400 group-hover:text-primary" /> {bankName}</div>
                                                        {collapsedBanks.includes(bankName) ? <ChevronDown size={16} className="text-slate-300" /> : <ChevronUp size={16} className="text-slate-300" />}
                                                    </h3>
                                                    {!collapsedBanks.includes(bankName) && (
                                                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="bg-slate-50/80">
                                                                    <tr className="text-xs text-slate-500 font-semibold">
                                                                        <th className="p-3 w-1/4">Banco</th><th className="p-3 w-1/4">Cuenta</th><th className="p-3">Moneda</th><th className="p-3 text-right">Saldo Propuesta</th><th className="p-3 text-center">Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {accounts.map(account => (
                                                                        <tr key={account.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => { setSelectedBank(account); setDrillLevel(1); }}>
                                                                            <td className="p-3 font-medium text-slate-800">{account.name}</td>
                                                                            <td className="p-3 font-mono text-slate-600">{account.account}</td>
                                                                            <td className="p-3"><Badge status={account.currency === 'USD' ? 'success' : 'info'}>{account.currency}</Badge></td>
                                                                            <td className={`p-3 text-right font-bold ${account.amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{formatCurrency(account.amount)}</td>
                                                                            <td className="p-3 text-center">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    {isProposal && !isLocked && <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={(e) => { e.stopPropagation(); handleAuthorize(account.invoices); }}><CheckCircle2 size={18} /></button>}
                                                                                    <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg" onClick={(e) => { e.stopPropagation(); openReassignModal(account); }}><ArrowRightLeft size={16} /></button>
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
                                    )}
                                </div>
                            )}
                            {[1, 2, 3].includes(drillLevel) && (
                                <div className="max-w-6xl mx-auto animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                            {drillLevel === 1 ? 'Selecciona una Compañía' : drillLevel === 2 ? 'Selecciona un Grupo' : 'Lista de Proveedores'}
                                        </h2>
                                        <div className="relative w-64">
                                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input type="text" placeholder="Filtrar en este nivel..." className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(() => {
                                            const baseList = drillLevel === 1 ? selectedBank?.items : drillLevel === 2 ? selectedCompany?.items : selectedGroup?.items;
                                            // FILTRADO DINÁMICO: Aplicamos el término de búsqueda al nivel actual
                                            const currentList = (baseList || []).filter(item =>
                                                String(item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                            );

                                            return currentList.map((item, idx) => (
                                                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between" onClick={() => { if (drillLevel === 1) { setSelectedCompany(item); setDrillLevel(2); } else if (drillLevel === 2) { setSelectedGroup(item); setDrillLevel(3); } else { setSelectedProvider(item); setDrillLevel(4); } }}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white ${drillLevel === 1 ? 'bg-indigo-500' : drillLevel === 2 ? 'bg-emerald-500' : 'bg-amber-500'}`}><Briefcase size={20} /></div>
                                                        <div><h4 className="font-bold text-slate-800">{item.name}</h4><p className="text-xs text-slate-500">{(item.items || []).length || (item.invoices || []).length} elementos</p></div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        <div><p className="font-bold text-lg text-slate-800">{formatCurrency(item.amount)}</p></div>
                                                        <ChevronRight size={18} className="text-slate-300" />
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                            {drillLevel === 4 && selectedProvider && (
                                (() => {
                                    const { fiscal, nonFiscal } = getSegmentedInvoices(selectedProvider);
                                    // Filtros locales de facturas (fiscal y no-fiscal)
                                    const filteredFiscal = fiscal.filter(inv =>
                                        invoiceSearch === '' ||
                                        String(inv.meta?.invoice || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                        String(inv.uuid || '').toLowerCase().includes(invoiceSearch.toLowerCase())
                                    );
                                    const filteredNonFiscal = nonFiscal.filter(inv =>
                                        invoiceSearch === '' ||
                                        String(inv.meta?.invoice || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                        String(inv.uuid || '').toLowerCase().includes(invoiceSearch.toLowerCase())
                                    );

                                    return (
                                        <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto">
                                            {/* SECCIÓN FISCALES */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsFiscalExpanded(!isFiscalExpanded)}>
                                                        <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg"><FileText size={18} /></div>
                                                        <h3 className="font-bold text-slate-700">Facturas Fiscales (UUID)</h3>
                                                        {isFiscalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                    <div className="relative w-64">
                                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                                        <input type="text" placeholder="Buscar factura o UUID..." className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                                                    </div>
                                                </div>

                                                {isFiscalExpanded && (
                                                    <div className="bg-white border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-emerald-50/50 text-slate-600 font-bold uppercase">
                                                                <tr>
                                                                    <th className="p-4">Factura</th>
                                                                    <th className="p-4">UUID (Folio Fiscal)</th>
                                                                    <th className="p-4 text-right">Monto</th>
                                                                    <th className="p-4 text-center">Acción</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-emerald-50">
                                                                {filteredFiscal.map(inv => (
                                                                    <tr key={inv.id} className="hover:bg-slate-50">
                                                                        <td className="p-4 font-bold text-slate-700">
                                                                            <div className="flex items-center gap-2">
                                                                                {inv.meta?.invoice}
                                                                                {inv.meta?.isH2H && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black shadow-sm uppercase">H2H</span>}
                                                                                {inv.meta?.isKissflow && <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black shadow-sm uppercase">KISSFLOW</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 font-mono text-slate-400">{inv.uuid}</td>
                                                                        <td className="p-4 text-right font-bold">{formatCurrency(inv.amount)}</td>
                                                                        <td className="p-4 text-center">
                                                                            <div className="flex justify-center gap-2">
                                                                                {isAuthorized ? (
                                                                                    <button onClick={() => handlePayInvoices([inv])} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded hover:bg-emerald-700 transition-all shadow-sm uppercase tracking-tighter">
                                                                                        <DollarSign size={12} /> PAGAR
                                                                                    </button>
                                                                                ) : inv._status === 'authorized' ? (
                                                                                    <Badge status="success">AUTORIZADO</Badge>
                                                                                ) : (
                                                                                    <>
                                                                                        <button onClick={() => handleAuthorize([inv])} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-colors"><CheckCircle2 size={14} /></button>
                                                                                        <button onClick={() => handleReject([inv])} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"><X size={14} /></button>
                                                                                    </>
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

                                            {/* SECCIÓN NO FISCALES */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsNonFiscalExpanded(!isNonFiscalExpanded)}>
                                                        <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg"><FileText size={18} /></div>
                                                        <h3 className="font-bold text-slate-700">Facturas No Fiscales (Sin UUID)</h3>
                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{filteredNonFiscal.length}</span>
                                                        {isNonFiscalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </div>

                                                {isNonFiscalExpanded && (
                                                    <div className="bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                                                        {filteredNonFiscal.length === 0 ? (
                                                            <p className="p-6 text-center text-slate-400 italic text-sm">Sin facturas no-fiscales para este proveedor.</p>
                                                        ) : (
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-amber-50/50 text-slate-600 font-bold uppercase">
                                                                    <tr>
                                                                        <th className="p-4">Factura</th>
                                                                        <th className="p-4">Observación</th>
                                                                        <th className="p-4 text-right">Monto</th>
                                                                        <th className="p-4 text-center">Acción</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-amber-50">
                                                                    {filteredNonFiscal.map(inv => (
                                                                        <tr key={inv.id} className="hover:bg-slate-50">
                                                                            <td className="p-4 font-bold text-slate-700">
                                                                                <div className="flex items-center gap-2">
                                                                                    {inv.meta?.invoice}
                                                                                    {inv.meta?.isKissflow && <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black shadow-sm uppercase">KISSFLOW</span>}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4 text-amber-700 text-xs font-medium">
                                                                                {inv.meta?.validationErrors?.[0] || 'Sin UUID / No fiscal'}
                                                                            </td>
                                                                            <td className="p-4 text-right font-bold">{formatCurrency(inv.amount)}</td>
                                                                            <td className="p-4 text-center">
                                                                                <div className="flex justify-center gap-2">
                                                                                    {isAuthorized ? (
                                                                                        <button onClick={() => handlePayInvoices([inv])} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded hover:bg-emerald-700 transition-all shadow-sm uppercase tracking-tighter">
                                                                                            <DollarSign size={12} /> PAGAR
                                                                                        </button>
                                                                                    ) : inv._status === 'authorized' ? (
                                                                                        <Badge status="success">AUTORIZADO</Badge>
                                                                                    ) : (
                                                                                        <>
                                                                                            <button onClick={() => handleAuthorize([inv])} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-colors" title="Autorizar"><CheckCircle2 size={14} /></button>
                                                                                            <button onClick={() => handleReject([inv])} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors" title="Rechazar"><X size={14} /></button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-center mt-4">
                                                <Button variant="secondary" size="sm" onClick={goBack}>Regresar a la lista</Button>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modales */}
            {showGroupsView && <Modal isOpen={true} onClose={() => setShowGroupsView(false)} title="LISTA DE GRUPOS DE PROVEEDOR" size="lg">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-slate-500">Resumen de dispersión segmentado.</p>
                        <div className="relative w-64">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            <input type="text" placeholder="Buscar en el lote..." className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg" value={groupSearchTerm} onChange={(e) => setGroupSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {processedGroups.h2h.concat(processedGroups.general).map((group, idx) => renderProviderAccordion(group, idx))}
                    </div>
                </div>
            </Modal>}
            {/* Modal: Búsqueda de facturas en ERP */}
            <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setSearchUuid(''); setSearchResult(null); }} title="Búsqueda de Facturas en ERP" size="md">
                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-500">Ingresa el UUID del folio fiscal para buscarlo en las facturas disponibles del ERP.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="UUID — folio fiscal CFDI..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchUuid}
                            onChange={(e) => setSearchUuid(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                        />
                        <Button variant="primary" icon={Search} onClick={handleSearchInvoice}>Buscar</Button>
                    </div>
                    {searchResult ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg space-y-2">
                            <p className="text-xs font-bold text-emerald-700 uppercase">Factura encontrada</p>
                            <p className="font-bold text-slate-800">{searchResult.providerName}</p>
                            <p className="text-xs text-slate-500 font-mono">{searchResult.uuid}</p>
                            <p className="font-bold text-lg text-slate-700">{formatCurrency(searchResult.amount || 0)}</p>
                            <Button variant="success" icon={Plus} className="w-full justify-center" onClick={handleAddFoundInvoice}>
                                Agregar a la Propuesta
                            </Button>
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-sm">
                            Los resultados aparecerán aquí
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal: Reasignación de banco */}
            <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reasignar Saldo de Banco" size="sm">
                <div className="p-6 space-y-4">
                    {reassignSourceBank && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Cuenta Origen</p>
                            <p className="font-bold text-slate-700">{reassignSourceBank.description}</p>
                            <p className="text-slate-500 font-mono text-xs">{reassignSourceBank.account}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuenta Destino</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            value={reassignTargetBank}
                            onChange={(e) => setReassignTargetBank(e.target.value)}
                        >
                            <option value="">— Selecciona una cuenta —</option>
                            {CATALOG_BANCOS
                                .filter(b => b.id !== reassignSourceBank?.id)
                                .map(b => (
                                    <option key={b.id} value={b.id}>{b.bank} ({b.currency_code})</option>
                                ))
                            }
                        </select>
                    </div>
                    <Button variant="primary" className="w-full justify-center" onClick={handleConfirmReassign}>
                        Confirmar Reasignación
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Payments;