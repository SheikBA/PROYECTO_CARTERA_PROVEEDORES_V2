/**
 * ReferenceService
 * HU-004 | RN-002, RN-003, RN-004
 * Calcula la referencia automática de un grupo de pago.
 * La referencia calculada es inmutable; referenciaEvento es temporal (no persiste en Epicor).
 */

export const TipoReferencia = Object.freeze({
    NUMERICA: 'NUMERICA',
    ALFANUMERICA: 'ALFANUMERICA',
});

/**
 * Calcula la referencia automática según RN-002 / RN-003.
 * @param {{ tipoReferencia: string, paymentId: string, rfc?: string, empresaIdCorto?: string }} params
 * @returns {string}
 */
export const calcularReferencia = ({ tipoReferencia, paymentId, rfc, empresaIdCorto }) => {
    if (tipoReferencia === TipoReferencia.NUMERICA) {
        return String(paymentId);
    }
    if (tipoReferencia === TipoReferencia.ALFANUMERICA) {
        if (!rfc || !empresaIdCorto) {
            throw new Error('RN-003: rfc y empresaIdCorto son requeridos para referencia alfanumérica');
        }
        return `${rfc}${paymentId}${empresaIdCorto}`;
    }
    throw new Error(`Tipo de referencia desconocido: ${tipoReferencia}`);
};
