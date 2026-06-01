/**
 * MatchService
 * HU-009 | RN-013, RN-014
 * Evalúa si un comprobante coincide con un grupo de pago por 4 parámetros.
 * Regla especial Granada (pais_id='GD'): acepta comprobante no oficial
 * si los 4 parámetros están presentes.
 */

const TOLERANCIA_MONTO = 0.005; // < 1 centavo de tolerancia

/**
 * @param {{ fecha: string, proveedorId: string, monto: number, concepto: string, oficial: boolean, paisId: string }} comprobante
 * @param {{ fecha: string, proveedorId: string, montoTotal: number, concepto: string, estado: string }} grupo
 * @returns {{ matcheado: boolean, parametros: { fecha: boolean, proveedor: boolean, monto: boolean, concepto: boolean } }}
 */
export const evaluar = (comprobante, grupo) => {
    const parametros = {
        fecha: comprobante.fecha === grupo.fecha,
        proveedor: comprobante.proveedorId === grupo.proveedorId,
        monto: Math.abs(comprobante.monto - grupo.montoTotal) <= TOLERANCIA_MONTO,
        concepto: String(comprobante.concepto).trim().toLowerCase() === String(grupo.concepto).trim().toLowerCase(),
    };

    const todosPresentes = Object.values(parametros).every(Boolean);

    // RN-013: Granada acepta no oficial solo si los 4 parámetros coinciden
    const esOficialOGranada = comprobante.oficial || comprobante.paisId === 'GD';

    const matcheado = todosPresentes && esOficialOGranada;

    return { matcheado, parametros };
};
