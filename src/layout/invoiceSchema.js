import { z } from 'zod';

// Helper para convertir textos booleanos de Excel (Verdadero/Falso)
const parseBoolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const v = val.trim().toUpperCase();
        return v === 'VERDADERO' || v === 'TRUE' || v === 'SI' || v === '1';
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

// Esquema para validar una sola fila del Excel
// Mapea las columnas normalizadas (snake_case) del script de Python
export const invoiceSchema = z.object({
    // Campos Core (Requeridos o críticos)
    // Mapeo directo de columnas del Excel (convertidas a minúsculas y guiones bajos)
    name: z.any().optional(),
    company: z.any().optional(),
    supplier_id: z.any().optional(),
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
    // Asignación dinámica de Banco basada en la moneda del archivo
    const derivedBankId = currency === 'USD' ? 'B-002' : 'B-001';

    // Lógica robusta para encontrar el nombre del proveedor
    const rawName = data.name || data.proveedor || data.description_grupo_proveedor || "Proveedor Desconocido";

    return {
        // Estructura plana requerida por Payments.jsx
        id: data.fiscal_folio || `INV-${data.invoice || Math.random().toString(36).substr(2, 9)}`,
        uuid: data.fiscal_folio, // Útil para búsquedas
        providerName: String(rawName).trim(),
        amount: amount,
        currency: currency,
        dueDate: parseDate(data.due_date),
        status: 'pending',

        // Mapeo inteligente de Grupos (Si viene vacío, asignar default)
        // Usamos el ID del grupo si existe, si no 'G-001'
        group: data.group_proveedor || 'Sin Grupo',

        // Asignamos el banco derivado de la moneda
        bankId: derivedBankId,

        // Guardamos TODA la data original en 'meta' por si se necesita ver detalle
        meta: {
            ...data,
            // Normalizamos banderas booleanas para uso fácil en UI
            isInactive: parseBoolean(data.inactive),
            isPosted: parseBoolean(data.posted),
            isHold: parseBoolean(data.hold_payments)
        }
    };
});

export const invoicesArraySchema = z.array(invoiceSchema);