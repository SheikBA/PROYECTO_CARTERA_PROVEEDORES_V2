import { z } from 'zod';

// Helper para convertir textos booleanos de Excel (Verdadero/Falso)
const parseBoolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const v = val.trim().toUpperCase();
        return v === 'VERDADERO' || v === 'TRUE' || v === 'SI' || v === '1' || v === 'T';
    }
    return false;
};

// Helper para limpiar montos que vengan como texto "$ 1,200.00"
const parseAmount = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Eliminar todo lo que no sea número, punto o signo negativo
        const clean = val.replace(/[^0-9.-]+/g, '');
        return parseFloat(clean) || 0;
    }
    return 0;
};

// Helper para fechas
const parseDate = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    // Si viene de Excel numérico o string
    const d = new Date(val);
    return isNaN(d) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
};

// Helper para validar UUID (Formato Universal)
const isValidUUID = (val) => {
    if (!val || typeof val !== 'string') return false;
    // Regex estándar para UUID (8-4-4-4-12 caracteres hex)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(val.trim());
};

// Esquema para validar una sola fila del Excel
// Mapea las columnas normalizadas (snake_case) del script de Python
export const invoiceSchema = z.object({
    // Campos Core (Requeridos o críticos)
    // Mapeo directo de columnas del Excel (convertidas a minúsculas y guiones bajos)
    name: z.any().optional(),
    company: z.any().optional(),
    supplier_id: z.any().optional(),
    // Columnas para identificación de Banco (Cuenta Pagadora)
    bancos: z.any().optional(),
    banco: z.any().optional(),
    mxfiscalfolio: z.any().optional(), // Aseguramos captura de la columna exacta

    group_proveedor: z.any().optional(),
    description_grupo_proveedor: z.any().optional(),
    subgrupo_c: z.any().optional(),

    // Documento y Tipo
    tran_doc_type_id: z.any().optional(),
    description_tran_doc_type: z.any().optional(),
    invoice: z.any().optional(),
    fiscal_folio: z.any().optional(),
    debit_memo: z.any().optional(),
    "pre-payment": z.any().optional(), // Manejo de guión medio

    // Estatus y Bloqueos
    inactive: z.any().optional(),
    hold_payments: z.any().optional(),
    openpayable: z.any().optional(),
    posted: z.any().optional(),
    holdinvoice: z.any().optional(),
    msgholdpayment_c: z.any().optional(),

    // Importes y Moneda
    currency_code: z.any().optional().default('MXN'),
    exchange_rate: z.any().optional(),
    balance_mn: z.any().optional(),
    balance_usd: z.any().optional(),
    new_balance_mn: z.any().optional(),
    new_balance_usd: z.any().optional(),
    limit_topay_c: z.any().optional(),
    limittopay_c: z.any().optional(), // A veces Zod/Excel varía mayúsculas

    // Fechas y Términos
    due_date: z.any().optional(),
    invoice_date: z.any().optional(),
    fec_timbrado_c: z.any().optional(),
    terms: z.any().optional(),

    // Campos Fiscales MX
    mxpaidas_c: z.any().optional(),
    usocfdi_c: z.any().optional(),
    regfiscal_c: z.any().optional(),
    tar_code: z.any().optional(),
    uuidrel_c: z.any().optional(),
    tiporel_c: z.any().optional(),
    tipo_c: z.any().optional(),
    serv_c: z.any().optional(),
    tax_type: z.any().optional(),

    // Auditoría y Otros
    entered_by: z.any().optional(),
    expenseinterface: z.any().optional(),
    transac_ref_c: z.any().optional(),
    transac_num_c: z.any().optional(),

}).transform((data) => {
    // Lógica para determinar el monto real según la moneda
    const currency = data.currency_code?.trim().toUpperCase() || 'MXN';
    const rawAmount = currency === 'USD' ? data.balance_usd : data.balance_mn;
    const amount = parseAmount(rawAmount);

    // Lógica robusta para encontrar el nombre del proveedor
    const rawName = data.name || data.proveedor || data.description_grupo_proveedor || "Proveedor Desconocido";

    // --- VALIDACIONES DE NEGOCIO (REGLAS SOLICITADAS) ---

    // 1. Nota de Crédito (Columna J - Debit Memo)
    const isCreditMemo = parseBoolean(data.debit_memo);

    // 2. Proveedor Inactivo (Columna I - Inactive)
    const isProviderInactive = parseBoolean(data.inactive);

    // 3. Prepayment (Columna K - Pre-Payment) -> Si es FALSO, NO es prepayment.
    const isPrepayment = parseBoolean(data["pre-payment"]);

    // 4. Bloqueo de Pago (Columna L - Hold Payments)
    const isHoldPayment = parseBoolean(data.hold_payments);

    // 5. Posteada (Columna P - Posted) -> Si VERDADERO, susceptible a pago.
    const isPosted = parseBoolean(data.posted);

    // 6. Validación Fiscal Compleja (Columna AF - TAR Code y Columna AE - Fiscal Folio)
    const tarCodeVal = data.tar_code;
    // Tarcode es 1, '1' o Verdadero
    const isTarCode = tarCodeVal === 1 || tarCodeVal === '1' || parseBoolean(tarCodeVal);

    // Priorizamos mxfiscalfolio (Columna AR del Excel según tu indicación)
    const uuidSource = data.mxfiscalfolio || data.fiscal_folio;
    const hasValidUUID = isValidUUID(uuidSource);

    // REGLA: Es fiscal solo si tiene UUID y el TarCode NO es 1.
    const isFiscal = hasValidUUID && !isTarCode;

    // ERROR FISCAL: Si tiene UUID pero marcaron TarCode 1 (Inconsistencia de registro).
    const hasFiscalError = isTarCode && hasValidUUID;

    // 7. Bloqueo de Factura pero desbloqueable (Columna AC - HoldInvoice)
    const isHoldInvoice = parseBoolean(data.holdinvoice);

    // DETERMINACIÓN: ¿Es susceptible a pago?
    // Reglas: Debe estar posteada, NO tener hold payment, y NO tener error fiscal.
    // (Nota: Inactive Provider usualmente bloquea, pero la regla explicita fue sobre la columna L y AF)
    const isPayable = isPosted && !isHoldPayment && !hasFiscalError;

    return {
        // Estructura plana requerida por Payments.jsx
        id: uuidSource || `INV-${data.invoice || Math.random().toString(36).substr(2, 9)}`,
        uuid: uuidSource,
        providerName: String(rawName).trim(),
        amount: amount,
        currency: currency,
        dueDate: parseDate(data.due_date), // Columna Q
        status: 'pending',

        // Mapeo inteligente de Grupos (Si viene vacío, asignar default)
        // Usamos el ID del grupo si existe, si no 'G-001'
        group: data.group_proveedor || 'Sin Grupo',

        // Prioridad: Columna 'BANCO' > 'BANCOS' > Lógica por moneda (Fallback)
        // Normalizamos el ID quitando decimales de Excel
        bankId: (data.banco || data.bancos)
            ? String(data.banco || data.bancos).split('.')[0].trim()
            : (currency === 'USD' ? 'PENDIENTE-USD' : 'PENDIENTE-MXN'),

        // Guardamos TODA la data original en 'meta' por si se necesita ver detalle
        // Agregamos las banderas calculadas para usarlas fácilmente en el frontend (iconos, alertas, filtros)
        meta: {
            ...data,
            company: data.company, // Columna A
            tranDocType: data.tran_doc_type_id, // Columna G
            isCreditMemo,
            isProviderInactive,
            isPrepayment,
            isHoldPayment,
            isPosted,
            isHoldInvoice,
            isFiscal,
            hasFiscalError, // IMPORTANTE: Mostrar alerta si esto es true
            isPayable
        }
    };
});

export const invoicesArraySchema = z.array(invoiceSchema);