/**
 * ValidationService
 * BRECHA-02 — Validación DLL ejecutada en momento correcto: pre-envío.
 * REQ-008 | RN-009, RN-010 | INV-006
 *
 * Envuelve sp_process_invoice_data (Reglas_Negocio.js) para re-validar
 * facturas individuales justo antes de procesar H2H o Manual,
 * capturando cambios post-carga (edición de referencias, cambio de banco).
 */

import { sp_process_invoice_data } from '../logic/Reglas_Negocio.js';

/**
 * Valida una factura individual contra las 75 reglas DLL.
 * @param {object} invoice — objeto factura del state (ya procesado por invoiceSchema)
 * @returns {{ valido: boolean, errores: string[], advertencias: string[] }}
 */
export const validarFactura = (invoice) => {
    if (!invoice?.meta) {
        return { valido: false, errores: ['Factura sin metadatos — no puede validarse'], advertencias: [] };
    }

    // Re-ejecutar el motor de reglas sobre los metadatos crudos actuales
    const resultado = sp_process_invoice_data(invoice.meta);

    return {
        valido: resultado.meta.isPayable && !resultado.meta.hasFiscalError,
        errores: resultado.meta.validationErrors ?? [],
        advertencias: resultado.meta.validationWarnings ?? [],
    };
};

/**
 * Valida un array de facturas y retorna un resumen agregado.
 * @param {object[]} facturas
 * @returns {{ aptas: object[], rechazadas: { factura: object, errores: string[] }[], resumen: { total: number, aptas: number, rechazadas: number } }}
 */
export const validarGrupo = (facturas) => {
    const aptas = [];
    const rechazadas = [];

    (facturas ?? []).forEach(factura => {
        const resultado = validarFactura(factura);
        if (resultado.valido) {
            aptas.push(factura);
        } else {
            rechazadas.push({ factura, errores: resultado.errores });
        }
    });

    return {
        aptas,
        rechazadas,
        resumen: {
            total: facturas?.length ?? 0,
            aptas: aptas.length,
            rechazadas: rechazadas.length,
        },
    };
};
