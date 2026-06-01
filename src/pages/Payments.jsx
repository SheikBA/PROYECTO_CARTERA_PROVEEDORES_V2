import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, DollarSign, Clock, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft, RefreshCw, Building2, Layers, Users, X, Plus, ArrowRightLeft, Briefcase, FileText, ShieldAlert, ChevronUp, ChevronDown, Lock, Landmark, Send, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
// Ya no importamos CATALOG_... fijos, los recibiremos por props

const Payments = ({ rawInvoices, setRawInvoices, setProposalInvoices, authorizedInvoices, setAuthorizedInvoices, finalizedInvoices, setFinalizedInvoices, setRejectedInvoices, availableInvoices, setAvailableInvoices, trackingData, setTrackingData, catalogs, activeBatch, setActiveBatch, currentUser, mode = 'proposal', subMode = '' }) => {
    const isProposal = mode === 'proposal';
    const isAuthorized = mode === 'authorized';
    const isRejected = mode === 'rejected';
    // El sistema se bloquea en Gestión si hay un Batch ya finalizado
    const isLocked = isProposal && activeBatch?.status === 'finalized';
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

    // Helper formatting functions - Actualizado para soportar USD
    const formatCurrency = (amount, currency = 'MXN') =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount || 0);

    // Helper para obtener info del banco y manejadores de campos editables
    const getBankInfo = (bankId) => {
        const bank = CATALOG_BANCOS.find(b => b.id === bankId);
        return { name: bank?.bank || 'Sin Banco', swift: bank?.swift || '—' };
    };

    const handleRef1Change = (id, val) => updateInvoiceProperty(id, 'ref1', val);
    const handleRef2Change = (id, val) => updateInvoiceProperty(id, 'ref2', val);
    const handleEtiquetaChange = (id, val) => updateInvoiceProperty(id, 'etiqueta', val);
    const updateInvoiceProperty = (id, field, value) => {
        const update = (prev) => (prev || []).map(inv => inv.id === id ? { ...inv, [field]: value } : inv);
        setRawInvoices(update);
        if (setAuthorizedInvoices) setAuthorizedInvoices(update);
    };
    const handlePayInvoices = (invoices) => alert(`Procesando pago de ${invoices.length} facturas...`);
    const handleRejectProviderGroup = (name) => alert(`Rechazando grupo: ${name}`);

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

    // 1. Calculate adjusted KPIs based on the new data model
    const kpis = useMemo(() => {
        const list = displayInvoices || [];
        const TIPO_CAMBIO = 18.50; // Valor base para cálculos equivalentes

        const totals = { mxn: 0, usd: 0 };
        const companyData = {}; // Agrupación por compañía
        const bankData = {};    // Agrupación por banco
        const typeData = { H2H: { mxn: 0, usd: 0 }, MANUAL: { mxn: 0, usd: 0 } };

        list.forEach(inv => {
            const mMXN = Number(inv.montoMXN || 0);
            const mUSD = Number(inv.montoUSD || 0);
            const co = inv.company || 'OTRO';
            const bk = inv.banco || 'SIN BANCO';
            const tp = inv.tipoPago || 'MANUAL';

            // Totales Generales
            totals.mxn += mMXN;
            totals.usd += mUSD;

            // Por Compañía
            if (!companyData[co]) companyData[co] = { mxn: 0, usd: 0 };
            companyData[co].mxn += mMXN;
            companyData[co].usd += mUSD;

            // Por Banco
            if (!bankData[bk]) bankData[bk] = { mxn: 0, usd: 0 };
            bankData[bk].mxn += mMXN;
            bankData[bk].usd += mUSD;

            // Por Tipo de Pago
            if (typeData[tp]) {
                typeData[tp].mxn += mMXN;
                typeData[tp].usd += mUSD;
            }
        });

        return {
            totals,
            companyData,
            bankData,
            typeData,
            xr: TIPO_CAMBIO,
            fiscalErrors: list.filter(inv => inv.meta?.hasFiscalError).length
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
    // LIFTED HOOKS: Todos los hooks deben ejecutarse antes de cualquier return condicional
    // --------------------------------------------------------------------------------

    // Lógica para agrupar el tracking (Rechazados / Procesando)
    const processedGroups = useMemo(() => {
        const providerMap = {};
        const lowerSearch = groupSearchTerm.toLowerCase();
        const mainLowerSearch = searchTerm.toLowerCase();

        // En modo REJECTED usamos rawInvoices (que vienen de App.jsx), de lo contrario trackingData
        const sourceData = isRejected ? rawInvoices : trackingData;

        const currentItems = (sourceData || []).filter(item => {
            if (isRejected) {
                const isH2H = item.meta?.isH2H || item.member_id === 1 || item.member_id === '1';
                const matchesSubMode = subMode === 'h2h' ? isH2H : !isH2H;
                if (!matchesSubMode) return false;
            } else {
                const isCurrentBatch = activeBatch?.id && item.batchId === activeBatch.id;
                const isJustFinished = hasJustFinished && (item.status === 'PROCESANDO PAGO' || item.status === 'RECHAZADO MANUAL');
                if (!(isCurrentBatch || isJustFinished)) return false;
            }

            const term = isRejected ? mainLowerSearch : lowerSearch;
            if (!term) return true;

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

    // Datos para la vista de Autorizados
    const authorizedSourceData = useMemo(() => {
        if (!isAuthorized) return [];
        return (finalizedInvoices && finalizedInvoices.length > 0) ? finalizedInvoices : (rawInvoices || []);
    }, [isAuthorized, finalizedInvoices, rawInvoices]);

    const authTotals = useMemo(() => {
        if (!isAuthorized) return { mxn: 0, usd: 0 };
        const mxn = authorizedSourceData.filter(i => i.currency !== 'USD').reduce((s, i) => s + (i.amount || 0), 0);
        const usd = authorizedSourceData.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount || 0), 0);
        return { mxn, usd };
    }, [isAuthorized, authorizedSourceData]);

    const filteredAuthorized = useMemo(() => {
        if (!isAuthorized) return [];
        const term = invoiceSearch.toLowerCase();
        return authorizedSourceData.filter(inv =>
            !term ||
            String(inv.providerName || '').toLowerCase().includes(term) ||
            String(inv.meta?.invoice || '').toLowerCase().includes(term)
        );
    }, [isAuthorized, authorizedSourceData, invoiceSearch]);

    const paginatedAuthorized = useMemo(() => {
        if (!isAuthorized) return [];
        return filteredAuthorized.slice((invoicePage - 1) * ITEMS_PER_PAGE, invoicePage * ITEMS_PER_PAGE);
    }, [isAuthorized, filteredAuthorized, invoicePage]);

    // --------------------------------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------------------------------

    const handleTypeChange = (invoiceId, newType) => {
        const updateFn = (prev) => (prev || []).map(inv =>
            inv.id === invoiceId
                ? { ...inv, meta: { ...(inv.meta || {}), paymentMethod: newType } }
                : inv
        );
        if (setFinalizedInvoices) setFinalizedInvoices(updateFn);
        if (setRawInvoices) setRawInvoices(updateFn);
    };

    const handleBankChange = (invoiceId, newBankId) => {
        const updateFn = (prev) => (prev || []).map(inv =>
            inv.id === invoiceId ? { ...inv, bankId: newBankId } : inv
        );
        if (setFinalizedInvoices) setFinalizedInvoices(updateFn);
        if (setRawInvoices) setRawInvoices(updateFn);
    };

    // Acción para procesar y descargar el archivo H2H agrupado
    const handleSendH2H = () => {
        const h2hInvoices = (authorizedSourceData || []).filter(inv =>
            (inv.meta?.paymentMethod || (inv.meta?.isH2H ? 'H2H' : 'Manual')) === 'H2H'
        );

        if (h2hInvoices.length === 0) return alert("No hay facturas marcadas con ruta H2H para procesar.");

        // Agrupación por Proveedor para el Template H2H
        const templateH2H = h2hInvoices.reduce((acc, inv) => {
            const pName = inv.providerName || 'Desconocido';
            if (!acc[pName]) acc[pName] = { proveedor: pName, total_a_pagar: 0, documentos: [] };
            acc[pName].total_a_pagar += inv.amount;
            acc[pName].documentos.push({ factura: inv.meta?.invoice, monto: inv.amount, uuid: inv.uuid });
            return acc;
        }, {});

        const blob = new Blob([JSON.stringify(Object.values(templateH2H), null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `H2H_BATCH_${activeBatch?.id || 'MANUAL'}_${new Date().getTime()}.json`;
        link.click();
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

    // Helper para renderizar la vista de autorizados (para evitar returns tempranos con hooks)
    const renderAuthorizedView = () => {
        const totalAuthPages = Math.ceil(filteredAuthorized.length / ITEMS_PER_PAGE);
        return (
            <div className="p-6 h-full flex flex-col gap-4 animate-fade-in-up overflow-y-auto bg-slate-50/50">
                <div className="shrink-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Propuesta de Pagos – Tesorería</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control de dispersión y métodos de pago</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeBatch && (
                            <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                <Layers size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-blue-700 font-mono uppercase">{activeBatch.id}</span>
                            </div>
                        )}
                        <Button variant="secondary" icon={Download} size="sm">Exportar Reporte</Button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="p-3 border-l-4 border-l-indigo-500">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Total Autorizado MXN</p>
                            <p className="text-lg font-black text-slate-800">{formatCurrency(authTotals.mxn)}</p>
                        </Card>
                        <Card className="p-3 border-l-4 border-l-blue-500">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Total Autorizado USD</p>
                            <p className="text-lg font-black text-blue-700">{formatCurrency(authTotals.usd).replace('$', 'US$ ')}</p>
                        </Card>
                        <Card className="p-3 border-l-4 border-l-emerald-500 flex flex-col justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Rutas H2H</p>
                            <Badge status="success">{filteredAuthorized.filter(i => (i.meta?.paymentMethod || (i.meta?.isH2H ? 'H2H' : 'Manual')) === 'H2H').length} Docs</Badge>
                        </Card>
                        <Card className="p-3 border-l-4 border-l-amber-500 flex flex-col justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Rutas Manual</p>
                            <Badge status="pending">{filteredAuthorized.filter(i => (i.meta?.paymentMethod || (i.meta?.isH2H ? 'H2H' : 'Manual')) === 'Manual').length} Docs</Badge>
                        </Card>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                            <div className="relative w-80">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Filtrar por proveedor o factura..." className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="sticky top-0 z-10 font-black uppercase text-[9px] tracking-widest bg-slate-800 text-white">
                                    <tr>
                                        <th className="px-4 py-4">Proveedor / Empresa</th>
                                        <th className="px-4 py-4">Factura / UUID</th>
                                        <th className="px-4 py-4 text-right">Importe</th>
                                        <th className="px-4 py-4">Banco Pagador</th>
                                        <th className="px-4 py-4">Ruta de Pago</th>
                                        <th className="px-4 py-4 text-right">Monto MXN</th>
                                        <th className="px-4 py-4 text-right">Monto USD</th>
                                        <th className="px-4 py-4">SWIFT</th>
                                        <th className="px-4 py-4">Ref 1</th>
                                        <th className="px-4 py-4">Ref 2</th>
                                        <th className="px-4 py-4">Etiqueta</th>
                                        <th className="px-4 py-4">Destino</th>
                                        <th className="px-4 py-4">Estado</th>
                                        <th className="px-4 py-4 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedAuthorized.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-800 uppercase">{inv.providerName}</div>
                                                <div className="text-[10px] text-slate-400 font-medium italic">{inv.meta?.company}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-mono font-bold text-slate-700">{inv.meta?.invoice}</div>
                                                <div className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]">{inv.uuid}</div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-slate-800">
                                                {formatCurrency(inv.amount)}
                                                <div className="text-[9px] text-slate-400">{inv.currency}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={inv.bankId || ''}
                                                    onChange={(e) => handleBankChange(inv.id, e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    {CATALOG_BANCOS.map(b => (
                                                        <option key={b.id} value={b.id}>{b.bank} ({b.currency_code})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={inv.paymentMethod || (inv.meta?.isH2H ? 'H2H' : 'Manual')}
                                                    onChange={(e) => handleTypeChange(inv.id, e.target.value)}
                                                    className={`w-full border rounded px-2 py-1 text-[10px] font-black uppercase tracking-tighter outline-none focus:ring-1 ${(inv.meta?.paymentMethod || (inv.meta?.isH2H ? 'H2H' : 'Manual')) === 'H2H'
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                                        }`}
                                                >
                                                    <option value="H2H">Ruta: H2H</option>
                                                    <option value="Manual">Ruta: Manual</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-slate-800">
                                                {inv.currency === 'MXN' ? formatCurrency(inv.amount) : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-blue-700">
                                                {inv.currency === 'USD' ? formatCurrency(inv.amount, 'USD') : '—'}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-slate-600">
                                                {getBankInfo(inv.bankId).swift}
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={inv.ref1 || ''}
                                                    onChange={(e) => handleRef1Change(inv.id, e.target.value, true)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={inv.ref2 || ''}
                                                    onChange={(e) => handleRef2Change(inv.id, e.target.value, true)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={inv.etiqueta || ''}
                                                    onChange={(e) => handleEtiquetaChange(inv.id, e.target.value, true)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {inv.meta?.pais || inv.meta?.destino || '—'}
                                            </td>
                                            <td className="px-4 py-4 text-center"><Badge status="valid">LISTO</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-lg">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Selección</p>
                            <p className="text-xs font-bold text-slate-700">Se enviarán a procesar {filteredAuthorized.length} documentos.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" icon={X} onClick={() => alert("Función para desarmar grupos en desarrollo.")}>Cerrar Día</Button>
                            <Button variant="primary" icon={Send} onClick={handleSendH2H} className="bg-gradient-to-r from-indigo-600 to-blue-600 animate-pulse border-none">Enviar Pagos H2H</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 animate-fade-in-up">
            {isAuthorized ? renderAuthorizedView() : (
                <>
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
                        <div className="flex items-center">
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                                    {isProposal ? 'Gestión de Pagos' : isAuthorized ? 'Pagos Autorizados' : 'Historial de Rechazos'}
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {isProposal ? 'Etapa 1: Refinamiento y autorización.' : 'Etapa 2: Control de dispersión.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
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
                        <Button
                            variant="secondary"
                            icon={isSidebarOpen ? PanelLeftClose : PanelLeftOpen}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            title={isSidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
                        >
                            {isSidebarOpen ? 'Ocultar Stats' : 'Mostrar Stats'}
                        </Button>
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

                    {/* Alerta Crítica de Errores Fiscales */}
                    {kpis.fiscalErrors > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-red-600" size={24} />
                                <p className="text-sm text-red-800 font-medium">Se han detectado <b>{kpis.fiscalErrors}</b> facturas con inconsistencias fiscales. Por favor, revíselas antes de procesar el pago.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-1 gap-6 overflow-hidden">
                        {/* SECCIÓN IZQUIERDA: KPIs y Estadísticas (Toggleable) */}
                        {isSidebarOpen && (
                            <aside className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 animate-fade-in-left shrink-0">
                                {/* CARD 1: TOTAL POR COMPAÑIA */}
                                <Card className="min-h-[250px] flex flex-col p-0 overflow-hidden border-t-4 border-t-indigo-500 shadow-md">
                                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total por Compañía</span>
                                        <Building2 size={14} className="text-indigo-500" />
                                    </div>
                                    <div className="p-4 space-y-4 flex-1">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase">Total MXN</p>
                                                <p className="text-xs font-black text-slate-800">{formatCurrency(kpis.totals.mxn)}</p>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase">Total USD</p>
                                                <p className="text-xs font-black text-blue-600">{formatCurrency(kpis.totals.usd, 'USD')}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pt-2 border-t border-slate-100">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-700">HQPEN7</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic tracking-tighter">* Incluye USD al TC {kpis.xr}</p>
                                                </div>
                                                <p className="text-xs font-black text-indigo-600">
                                                    {formatCurrency((kpis.companyData['HQPEN7']?.mxn || 0) + ((kpis.companyData['HQPEN7']?.usd || 0) * kpis.xr))}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-700">HQISLA17</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase italic tracking-tighter">* Incluye USD al TC {kpis.xr}</p>
                                                </div>
                                                <p className="text-xs font-black text-indigo-600">
                                                    {formatCurrency((kpis.companyData['HQISLA17']?.mxn || 0) + ((kpis.companyData['HQISLA17']?.usd || 0) * kpis.xr))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* CARD 2: TOTAL POR BANCO */}
                                <Card className="min-h-[200px] flex flex-col p-0 overflow-hidden border-t-4 border-t-amber-500 shadow-md">
                                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total por Banco</span>
                                        <Landmark size={14} className="text-amber-500" />
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {['BANAMEX', 'BANORTE', 'SANTANDER'].map(bank => (
                                            <div key={bank} className="flex justify-between items-end border-b border-slate-50 pb-2 last:border-0">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-700">{bank}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">MXN / USD</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-800">{formatCurrency(kpis.bankData[bank]?.mxn || 0)}</p>
                                                    <p className="text-[9px] font-black text-blue-600">{formatCurrency(kpis.bankData[bank]?.usd || 0, 'USD')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* CARD 3: H2H vs MANUAL */}
                                <Card className="p-4 border-t-4 border-t-blue-500 shadow-md">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">H2H vs Manual</span>
                                        <Users size={14} className="text-blue-500" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                            <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">H2H Por Pagar</p>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-xs font-black text-slate-700">{formatCurrency(kpis.typeData.H2H.mxn)}</span>
                                                <span className="text-[10px] font-black text-blue-600">{formatCurrency(kpis.typeData.H2H.usd, 'USD')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Sin H2H (Manual)</p>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-xs font-black text-slate-700">{formatCurrency(kpis.typeData.MANUAL.mxn)}</span>
                                                <span className="text-[10px] font-black text-blue-600">{formatCurrency(kpis.typeData.MANUAL.usd, 'USD')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </aside>
                        )}

                        {/* SECCIÓN DERECHA: Contenido Principal (Árbol de Navegación y Facturas) */}
                        <main className="flex-1 flex flex-col min-w-0">
                            <div className="flex-1 bg-surface border border-slate-200 shadow-sm rounded-xl flex flex-col z-10 overflow-hidden">
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
                                                                                    <th className="p-4">Compañía</th>
                                                                                    <th className="p-4">Banco</th>
                                                                                    <th className="p-4">Grupo de Pago</th>
                                                                                    <th className="p-4">Tipo de Pago</th>
                                                                                    <th className="p-4 text-right">Monto MXN</th>
                                                                                    <th className="p-4 text-right">Monto USD</th>
                                                                                    <th className="p-4">SWIFT</th>
                                                                                    <th className="p-4">Ref 1</th>
                                                                                    <th className="p-4">Ref 2</th>
                                                                                    <th className="p-4">Etiqueta</th>
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
                                                                                        <th className="p-4">Compañía</th>
                                                                                        <th className="p-4">Banco</th>
                                                                                        <th className="p-4">Grupo de Pago</th>
                                                                                        <th className="p-4">Tipo de Pago</th>
                                                                                        <th className="p-4 text-right">Monto MXN</th>
                                                                                        <th className="p-4 text-right">Monto USD</th>
                                                                                        <th className="p-4">SWIFT</th>
                                                                                        <th className="p-4">Ref 1</th>
                                                                                        <th className="p-4">Ref 2</th>
                                                                                        <th className="p-4">Etiqueta</th>
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
                                                                                                <td className="p-4 text-slate-700">{inv.meta?.company}</td>
                                                                                                <td className="p-4 text-slate-700">{getBankInfo(inv.bankId).name}</td>
                                                                                                <td className="p-4 text-slate-700">{inv.group}</td>
                                                                                                <td className="p-4 text-slate-700">{inv.paymentMethod || (inv.meta?.isH2H ? 'H2H' : 'MANUAL')}</td>
                                                                                                <td className="p-4 text-right font-bold text-slate-700">
                                                                                                    {inv.currency === 'MXN' ? formatCurrency(inv.amount) : '—'}
                                                                                                </td>
                                                                                                <td className="p-4 text-right font-bold text-blue-700">
                                                                                                    {inv.currency === 'USD' ? formatCurrency(inv.amount, 'USD') : '—'}
                                                                                                </td>
                                                                                                <td className="p-4 font-mono text-slate-600">
                                                                                                    {getBankInfo(inv.bankId).swift}
                                                                                                </td>
                                                                                                <td className="p-4">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={inv.ref1 || ''}
                                                                                                        onChange={(e) => handleRef1Change(inv.id, e.target.value, inv._status === 'authorized')}
                                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="p-4">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={inv.ref2 || ''}
                                                                                                        onChange={(e) => handleRef2Change(inv.id, e.target.value, inv._status === 'authorized')}
                                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="p-4">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={inv.etiqueta || ''}
                                                                                                        onChange={(e) => handleEtiquetaChange(inv.id, e.target.value, inv._status === 'authorized')}
                                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                                                                                    />
                                                                                                </td>
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
                        </main>
                    </div>
                </>
            )}

            {/* Modales */}
            {
                showGroupsView && <Modal isOpen={true} onClose={() => setShowGroupsView(false)} title="LISTA DE GRUPOS DE PROVEEDOR" size="lg">
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
                </Modal>
            }
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

        </div >
    );
};

export default Payments;