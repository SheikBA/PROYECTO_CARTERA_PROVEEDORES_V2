/**
 * MOTOR DE REGLAS DE NEGOCIO (Simulación de Stored Procedures)
 * Este archivo centraliza todas las validaciones y transformaciones
 * durante la carga de la fuente de datos.
 */

import { parseBoolean as sp_parse_boolean, parseAmount as sp_parse_amount, parseDateInput as sp_parse_date } from '../utils/parsers';

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
    // Lista de errores y advertencias detectados (Reglas de Negocio Epicor)
    const validationErrors = []; // Bloqueantes (406)
    const validationWarnings = []; // Informativos (202)

    // 1. Determinación de Moneda y Monto
    const currency = data.currency_code?.trim().toUpperCase() || 'MXN';
    // Buscar en orden de preferencia: balance (campo directo) → balance_mn/balance_usd → new_balance
    const rawAmount = currency === 'USD'
        ? (data.balance_usd || data.balance || data.new_balance_usd || data['balance.1'])
        : (data.balance_mn || data.balance || data.new_balance_mn || data['balance.1']);
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

    // --- VALIDACIÓN DE REGLAS DE NEGOCIO (AP_InvoiceEntry / AP_PaymentEntry) ---

    // Regla 0_2: Versión CFDI (Solo 4.0 en Facturación)
    const versionCfdi = data.version_cfdi || data.version_vfdi || '4.0';
    if (String(versionCfdi) === '3.3') validationErrors.push("Regla0_2: Solo se acepta CFDI 4.0");

    // Regla 0_4: Estado SAT
    // Priorizamos 'estado_vfdi' (nombre real del Excel) → 'estado_cfdi' → 'estado:cfdi' → 'sat_status'
    const currentSatStatus = String(data.estado_vfdi || data.estado_cfdi || data["estado:cfdi"] || data.sat_status || 'VIGENTE').trim().toUpperCase();
    if (currentSatStatus !== 'VIGENTE') {
        validationErrors.push(`Regla0_4: UUID con estado ${currentSatStatus} ante el SAT`);
    }

    // Regla 1_3: Saldo Mayor a Cero
    if (amount <= 0) validationErrors.push("Regla1_3: El saldo debe ser mayor a cero para programar pago");

    // Regla 2_7 y 2_8: Tipo de Cambio
    const exRate = parseFloat(data.exchange_rate) || 1;
    if (currency === 'MXN' && exRate !== 1) validationErrors.push("Regla2_7: Moneda MXN debe tener Tipo de Cambio 1");
    if (currency === 'USD' && exRate === 1) validationErrors.push("Regla2_8: Moneda USD requiere Tipo de Cambio distinto de 1");

    // Regla 2_6: Comparación de Montos (Epicor vs XML)
    const xmlTotal = sp_parse_amount(data.xml_total);
    if (xmlTotal > 0 && Math.abs(xmlTotal - amount) > 0.01) {
        validationErrors.push("Regla2_6: El total del XML no coincide con el saldo en Epicor");
    }

    // REGLA: Es fiscal solo si tiene UUID y el TarCode NO es 1.
    const isFiscal = hasValidUUID && !isTarCode && validationErrors.length === 0;
    // ERROR FISCAL: Inconsistencia entre TAR y UUID.
    const hasFiscalError = (isTarCode && hasValidUUID) || validationErrors.length > 0;

    // 5. Identificación de Origen (H2H / KISSFLOW)
    const isH2H = sp_parse_boolean(data.member_id);
    const isKissflow = sp_parse_boolean(data.solicitud_kissflow);

    // 5. Determinación de Susceptibilidad a Pago (isPayable)
    const isPayable = isPosted && !isHoldPayment && !hasFiscalError;

    // 6. Mapeo de Banco / Cuenta Pagadora
    const bankId = (data.banco || data.bancos)
        ? String(data.banco || data.bancos).split('.')[0].trim()
        : (currency === 'USD' ? 'PENDIENTE-USD' : 'PENDIENTE-MXN');

    // 7. Derivación de País — columna explícita del Excel o inferida por sufijo/prefijo de company
    const COMPANY_COUNTRY_MAP = {
        FOTUR: 'Mexico', GPFSERV: 'Mexico', HSPRO: 'Mexico',
        CABO77: 'Mexico', PTO85: 'Mexico', PTOHS: 'Mexico', PTOARENA: 'Mexico',
        HQPEN7: 'Mexico', HQPHOTO: 'Mexico', HQISLA: 'Mexico', PTOHSRD: 'Mexico',
        INSPRTRD: 'Mexico',
        FOTJMD: 'Jamaica', PELJAM: 'Jamaica', OHSGRLTD: 'Jamaica',
        OHSXCD: 'Granada',
    };
    const companyKey = String(data.company || '').trim().toUpperCase();
    // Priorizar: destino (nuevo) → pais (antiguo) → company map (fallback)
    const derivedPais = data.destino
        ? String(data.destino).trim()
        : (data.pais
            ? String(data.pais).trim()
            : (COMPANY_COUNTRY_MAP[companyKey] || 'Mexico'));

    return {
        id: uuidSource || `INV-${data.company}-${data.invoice || 'NO_NUM'}-${data.vendor_id || 'UNK'}`,
        uuid: uuidSource,
        providerName: String(rawName).trim(),
        amount: amount,
        currency: currency,
        dueDate: sp_parse_date(data.due_date),
        status: 'pending',
        group: data.group_proveedor || 'Sin Grupo',
        pais: derivedPais,
        bankId: bankId,

        // Mapeo de Referencias solicitado
        ref1: data.transac_ref_c || '',
        ref2: data.transac_num_c || '',

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
            isPayable,
            validationErrors,
            validationWarnings,
            isH2H,
            isKissflow
        }
    };
};