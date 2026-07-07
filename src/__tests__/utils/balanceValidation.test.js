import { describe, expect, it } from 'vitest';
import { BALANCE_VALIDATION_STAGES, getBalanceValidationHit } from '../../utils/balanceValidation.js';

const demoInvoice = {
    id: 'internal-id',
    providerName: 'ULINE SHIPPING SUPPLIES S DE R.L. DE C.V.',
    meta: {
        invoice: 'F80F3C',
    },
};

describe('balanceValidation', () => {
    it('detects the demo invoice even when the provider has punctuation', () => {
        const hit = getBalanceValidationHit([demoInvoice], BALANCE_VALIDATION_STAGES.ADD_TO_BATCH);

        expect(hit).toMatchObject({
            invoice: 'F80F3C',
            originalBalance: 45256.91,
            currentBalance: 40000,
        });
    });

    it('returns the simulated balance for each proposal stage', () => {
        expect(getBalanceValidationHit([demoInvoice], BALANCE_VALIDATION_STAGES.ADD_TO_BATCH).currentBalance).toBe(40000);
        expect(getBalanceValidationHit([demoInvoice], BALANCE_VALIDATION_STAGES.AUTHORIZE_PROPOSAL).currentBalance).toBe(34000);
        expect(getBalanceValidationHit([demoInvoice], BALANCE_VALIDATION_STAGES.SEND_PROPOSAL).currentBalance).toBe(25000);
    });

    it('does not flag unrelated invoices', () => {
        const hit = getBalanceValidationHit([
            { providerName: 'OTRO PROVEEDOR', meta: { invoice: 'F80F3C' } },
        ], BALANCE_VALIDATION_STAGES.ADD_TO_BATCH);

        expect(hit).toBeNull();
    });
});
