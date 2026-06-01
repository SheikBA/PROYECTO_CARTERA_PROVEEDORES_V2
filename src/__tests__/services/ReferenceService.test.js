import { describe, it, expect } from 'vitest';
import { calcularReferencia, TipoReferencia } from '../../services/ReferenceService.js';

describe('ReferenceService.calcularReferencia', () => {

    // TP1-009 — referencia numérica = payment_id
    it('TP1-009 — referencia NUMERICA = paymentId', () => {
        const result = calcularReferencia({ tipoReferencia: TipoReferencia.NUMERICA, paymentId: '45001' });
        expect(result).toBe('45001');
    });

    // TP1-010 — referencia alfanumérica = RFC+payment+ID_empresa
    it('TP1-010 — referencia ALFANUMERICA = RFC+paymentId+empresaIdCorto', () => {
        const result = calcularReferencia({
            tipoReferencia: TipoReferencia.ALFANUMERICA,
            paymentId: '45001',
            rfc: 'PSA800101AAA',
            empresaIdCorto: 'HS',
        });
        expect(result).toBe('PSA800101AAA45001HS');
    });

    it('lanza error si ALFANUMERICA sin RFC', () => {
        expect(() => calcularReferencia({
            tipoReferencia: TipoReferencia.ALFANUMERICA,
            paymentId: '45001',
            empresaIdCorto: 'HS',
        })).toThrow('RN-003');
    });

    it('lanza error si ALFANUMERICA sin empresaIdCorto', () => {
        expect(() => calcularReferencia({
            tipoReferencia: TipoReferencia.ALFANUMERICA,
            paymentId: '45001',
            rfc: 'PSA800101AAA',
        })).toThrow('RN-003');
    });

    it('lanza error para tipo de referencia desconocido', () => {
        expect(() => calcularReferencia({ tipoReferencia: 'INVALIDO', paymentId: '45001' })).toThrow();
    });
});
