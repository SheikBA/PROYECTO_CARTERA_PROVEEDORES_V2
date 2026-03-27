/**
 * MOTOR DE REGLAS DE NEGOCIO (Simulación de Stored Procedures)
 * Este archivo centraliza todas las validaciones y transformaciones
 * durante la carga de la fuente de datos.
 */

// SP_Helper: Convertir textos booleanos de Excel
export const sp_parse_boolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const v = val.trim().toUpperCase();
        return v === 'VERDADERO' || v === 'TRUE' || v === 'SI' || v === '1' || v === 'T';
    }
    return false;
};

// SP_Helper: Limpiar montos monetarios
export const sp_parse_amount = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const clean = val.replace(/[^0-9.-]+/g, '');
        return parseFloat(clean) || 0;
    }
    return 0;
};

// SP_Helper: Normalización de Fechas
export const sp_parse_date = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    const d = new Date(val);
    return isNaN(d) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
};

// SP_Helper: Validación de UUID
export const sp_is_valid_uuid = (val) => {
    if (!val || typeof val !== 'string') return false;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(val.trim());
};

/**
 * SP_PROCESS_INVOICE_DATA
 * Simula el procesamiento de una fila de factura como un procedimiento almacenado.
 */
export const sp_process_invoice_data = (data) => {
    // 1. Determinación de Moneda y Monto
    const currency = data.currency_code?.trim().toUpperCase() || 'MXN';
    const rawAmount = currency === 'USD' ? data.balance_usd : data.balance_mn;
    const amount = sp_parse_amount(rawAmount);

    // 2. Identificación de Proveedor
    const rawName = data.name || data.proveedor || data.description_grupo_proveedor || "Proveedor Desconocido";

    // 3. Evaluación de Banderas de Negocio
    const isCreditMemo = sp_parse_boolean(data.debit_memo);
    const isProviderInactive = sp_parse_boolean(data.inactive);
    const isPrepayment = sp_parse_boolean(data["pre-payment"]);
    const isHoldPayment = sp_parse_boolean(data.hold_payments);
    const isPosted = sp_parse_boolean(data.posted);
    const isHoldInvoice = sp_parse_boolean(data.holdinvoice);

    // 4. Lógica Fiscal (TAR Code y UUID)
    const tarCodeVal = data.tar_code;
    const isTarCode = tarCodeVal === 1 || tarCodeVal === '1' || sp_parse_boolean(tarCodeVal);
    const uuidSource = data.mxfiscalfolio || data.fiscal_folio;
    const hasValidUUID = sp_is_valid_uuid(uuidSource);

    // REGLA: Es fiscal solo si tiene UUID y el TarCode NO es 1.
    const isFiscal = hasValidUUID && !isTarCode;
    // ERROR FISCAL: Inconsistencia entre TAR y UUID.
    const hasFiscalError = isTarCode && hasValidUUID;

    // 5. Determinación de Susceptibilidad a Pago (isPayable)
    const isPayable = isPosted && !isHoldPayment && !hasFiscalError;

    // 6. Mapeo de Banco / Cuenta Pagadora
    const bankId = (data.banco || data.bancos)
        ? String(data.banco || data.bancos).split('.')[0].trim()
        : (currency === 'USD' ? 'PENDIENTE-USD' : 'PENDIENTE-MXN');

    return {
        id: uuidSource || `INV-${data.invoice || Math.random().toString(36).substr(2, 9)}`,
        uuid: uuidSource,
        providerName: String(rawName).trim(),
        amount: amount,
        currency: currency,
        dueDate: sp_parse_date(data.due_date),
        status: 'pending',
        group: data.group_proveedor || 'Sin Grupo',
        bankId: bankId,

        // Encapsulamos el resultado de la "ejecución del SP" en meta
        meta: {
            ...data,
            company: data.company,
            tranDocType: data.tran_doc_type_id,
            isCreditMemo,
            isProviderInactive,
            isPrepayment,
            isHoldPayment,
            isPosted,
            isHoldInvoice,
            isFiscal,
            hasFiscalError,
            isPayable
        }
    };
};