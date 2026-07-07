import { z } from 'zod';
import { sp_process_invoice_data } from '../logic/Reglas_Negocio';

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
    banco_id: z.any().optional(),
    nombre_de_banco: z.any().optional(),
    mxfiscalfolio: z.any().optional(), // Aseguramos captura de la columna exacta

    // Nuevas Columnas de Origen
    member_id: z.any().optional(),
    solicitud_kissflow: z.any().optional(),

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

    // Columna B del Excel — País/Destino del proveedor (aceptar ambos nombres)
    pais: z.any().optional(),
    destino: z.any().optional(),

    // Columnas de Simulación de Reglas Epicor
    version_cfdi: z.any().optional().default('4.0'),
    version_vfdi: z.any().optional().default('4.0'), // Alternativo (Excel tiene VERSIÓN_CFDI → version_vfdi por typo)
    sat_status: z.any().optional().default('VIGENTE'),
    estado_cfdi: z.any().optional(), // Alias
    estado_vfdi: z.any().optional(), // Columna real del Excel (ESTADO_CFDI → estado_vfdi)
    "estado:cfdi": z.any().optional(), // Alias alternativo
    xml_total: z.any().optional(),
    xml_retenciones: z.any().optional(),

}).transform((data) => {
    // Invocamos el SP de negocio para procesar los datos
    return sp_process_invoice_data(data);
});

export const invoicesArraySchema = z.array(invoiceSchema);