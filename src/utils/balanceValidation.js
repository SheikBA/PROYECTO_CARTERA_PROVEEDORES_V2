export const BALANCE_VALIDATION_STAGES = {
    ADD_TO_BATCH: 'ADD_TO_BATCH',
    AUTHORIZE_PROPOSAL: 'AUTHORIZE_PROPOSAL',
    SEND_PROPOSAL: 'SEND_PROPOSAL',
};

const DEMO_BALANCE_RULE = {
    provider: 'ULINE SHIPPING SUPPLIES S DE RL DE CV',
    invoice: 'F80F3C',
    originalBalance: 45256.91,
    balancesByStage: {
        [BALANCE_VALIDATION_STAGES.ADD_TO_BATCH]: {
            label: 'Agregar al batch',
            currentBalance: 40000,
        },
        [BALANCE_VALIDATION_STAGES.AUTHORIZE_PROPOSAL]: {
            label: 'Autorizar propuesta',
            currentBalance: 34000,
        },
        [BALANCE_VALIDATION_STAGES.SEND_PROPOSAL]: {
            label: 'Enviar propuesta',
            currentBalance: 25000,
        },
    },
};

const normalizeText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const compactText = (value) => normalizeText(value).replace(/[^A-Z0-9]/g, '');

const matchesText = (left, right) =>
    normalizeText(left) === normalizeText(right) || compactText(left) === compactText(right);

const getInvoiceProvider = (invoice) => {
    const meta = invoice?.meta || {};
    return invoice?.providerName
        || meta.name
        || meta.provider
        || meta.proveedor
        || meta.supplier_name
        || meta.vendor_name
        || '';
};

const getInvoiceNumber = (invoice) => {
    const meta = invoice?.meta || {};
    return meta.invoice
        || invoice?.invoice
        || invoice?.invoiceNumber
        || invoice?.folio
        || invoice?.id
        || '';
};

const isDemoBalanceInvoice = (invoice) =>
    matchesText(getInvoiceProvider(invoice), DEMO_BALANCE_RULE.provider)
    && matchesText(getInvoiceNumber(invoice), DEMO_BALANCE_RULE.invoice);

export const getBalanceValidationHit = (invoices, stage) => {
    const stageConfig = DEMO_BALANCE_RULE.balancesByStage[stage];
    if (!stageConfig) return null;

    const invoiceList = Array.isArray(invoices) ? invoices : [invoices].filter(Boolean);
    const matchedInvoice = invoiceList.find(isDemoBalanceInvoice);
    if (!matchedInvoice) return null;

    const currentBalance = stageConfig.currentBalance;
    const originalBalance = DEMO_BALANCE_RULE.originalBalance;

    return {
        stage,
        stageLabel: stageConfig.label,
        provider: DEMO_BALANCE_RULE.provider,
        invoice: DEMO_BALANCE_RULE.invoice,
        originalBalance,
        currentBalance,
        difference: currentBalance - originalBalance,
        matchedInvoice,
    };
};

export const formatBalanceValidationMessage = (validation, formatCurrency) => {
    if (!validation) return '';

    return [
        `Validacion de balance ERP - ${validation.stageLabel}`,
        `Proveedor: ${validation.provider}`,
        `Factura: ${validation.invoice}`,
        `Balance factura original: ${formatCurrency(validation.originalBalance, 'MXN')}`,
        `Balance ERP simulado: ${formatCurrency(validation.currentBalance, 'MXN')}`,
        `Diferencia detectada: ${formatCurrency(validation.difference, 'MXN')}`,
        '',
        'El balance cambio desde la consulta inicial. Esta validacion es confirmativa, no limitante.',
    ].join('\n');
};
