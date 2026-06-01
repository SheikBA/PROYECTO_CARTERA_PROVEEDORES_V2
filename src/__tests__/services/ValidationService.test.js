import { describe, it, expect } from 'vitest';
import { validarFactura, validarGrupo } from '../../services/ValidationService.js';

const buildFacturaValida = (overrides = {}) => ({
    id: 'INV-001',
    providerName: 'Proveedor SA',
    amount: 45000,
    currency: 'MXN',
    ref1: '45001',
    ref2: '',
    meta: {
        version_cfdi: '4.0',
        'estado:cfdi': 'VIGENTE',
        balance_mn: 45000,
        currency_code: 'MXN',
        exchange_rate: 1,
        xml_total: 0,
        posted: true,
        hold_payments: false,
        debit_memo: false,
        inactive: false,
        'pre-payment': false,
        holdinvoice: false,
        mxfiscalfolio: '550e8400-e29b-41d4-a716-446655440000',
        tar_code: 0,
        ...overrides,
    },
});

describe('ValidationService.validarFactura', () => {

    it('retorna valido=true para factura correcta', () => {
        const result = validarFactura(buildFacturaValida());
        expect(result.valido).toBe(true);
        expect(result.errores).toHaveLength(0);
    });

    it('retorna valido=false para factura con CFDI 3.3', () => {
        const result = validarFactura(buildFacturaValida({ version_cfdi: '3.3' }));
        expect(result.valido).toBe(false);
        expect(result.errores.some(e => e.includes('Regla0_2'))).toBe(true);
    });

    it('retorna valido=false para UUID con estado SAT no VIGENTE', () => {
        const result = validarFactura(buildFacturaValida({ 'estado:cfdi': 'CANCELADO' }));
        expect(result.valido).toBe(false);
        expect(result.errores.some(e => e.includes('Regla0_4'))).toBe(true);
    });

    it('retorna valido=false cuando hold_payments=true', () => {
        const result = validarFactura(buildFacturaValida({ hold_payments: true }));
        expect(result.valido).toBe(false);
    });

    it('retorna valido=false sin metadatos', () => {
        const result = validarFactura({ id: 'X', providerName: 'X' });
        expect(result.valido).toBe(false);
        expect(result.errores[0]).toMatch(/metadatos/);
    });

});

describe('ValidationService.validarGrupo', () => {

    it('separa aptas de rechazadas correctamente', () => {
        // Una factura sin metadatos es siempre rechazada — caso determinista
        const facturas = [
            buildFacturaValida({ id: 'INV-001' }),
            { id: 'INV-002', providerName: 'Sin Meta' },          // sin meta → rechazada
            buildFacturaValida({ id: 'INV-003' }),
        ];
        const { rechazadas, resumen } = validarGrupo(facturas);
        expect(resumen.total).toBe(3);
        expect(resumen.rechazadas).toBe(1);
        expect(rechazadas.some(r => r.factura.id === 'INV-002')).toBe(true);
    });

    it('devuelve resumen vacío para array vacío', () => {
        const { resumen } = validarGrupo([]);
        expect(resumen.total).toBe(0);
        expect(resumen.aptas).toBe(0);
    });

    it('maneja null como entrada sin lanzar error', () => {
        const { resumen } = validarGrupo(null);
        expect(resumen.total).toBe(0);
    });

});
