import { describe, it, expect } from 'vitest';
import { normalizeNodeId, validateComplexity } from './validation.js';

describe('Validation Service', () => {
    describe('normalizeNodeId', () => {
        it('should add default prefix if none exists', () => {
            expect(normalizeNodeId('main.ts')).toBe('file:main.ts');
        });

        it('should add specified default prefix if none exists', () => {
            expect(normalizeNodeId('myFunc', 'func')).toBe('func:myFunc');
        });

        it('should not modify already prefixed file IDs', () => {
            expect(normalizeNodeId('file:main.ts')).toBe('file:main.ts');
        });

        it('should not modify already prefixed func IDs', () => {
            expect(normalizeNodeId('func:myFunc')).toBe('func:myFunc');
        });

        it('should not modify already prefixed class IDs', () => {
            expect(normalizeNodeId('class:MyClass')).toBe('class:MyClass');
        });
    });

    describe('validateComplexity', () => {
        it('should return simple for valid input', () => {
            expect(validateComplexity('simple')).toBe('simple');
        });

        it('should return moderate for valid input', () => {
            expect(validateComplexity('moderate')).toBe('moderate');
        });

        it('should return complex for valid input', () => {
            expect(validateComplexity('complex')).toBe('complex');
        });

        it('should throw an error for invalid input', () => {
            expect(() => validateComplexity('hard')).toThrow('Invalid complexity: hard. Must be simple, moderate, or complex.');
        });
    });
});
