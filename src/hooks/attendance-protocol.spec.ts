import { describe, it, expect } from 'vitest';

/**
 * Simulates the protocol generation logic from useAttendanceCadastro.ts
 */
function generateProtocol(patientId: string, existingOrdersCount: number, originCode: string | number): string {
  // Logic copied from src/hooks/useAttendanceCadastro.ts
  const patientNum = patientId.replace(/\D/g, '') || 
    (Math.abs(patientId.split('').reduce((a: any, b: any) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)) % 1000).toString();
  
  const sequence = existingOrdersCount + 1;
  const origin = String(originCode || '00').replace(/\D/g, '').padStart(2, '0');
  
  return `${patientNum}-${sequence}-${origin}`;
}

describe('Protocol Generation Patterns', () => {
  it('should generate a purely numeric protocol for numeric patient IDs', () => {
    const protocol = generateProtocol('123', 0, '01');
    expect(protocol).toBe('123-1-01');
    expect(protocol).toMatch(/^\d+-\d+-\d+$/);
  });

  it('should strip letters from patient IDs', () => {
    const protocol = generateProtocol('pat123abc', 5, '00');
    expect(protocol).toBe('123-6-00');
    expect(protocol).toMatch(/^\d+-\d+-\d+$/);
  });

  it('should strip letters from origin codes', () => {
    const protocol = generateProtocol('456', 2, 'origin99');
    expect(protocol).toBe('456-3-99');
    expect(protocol).toMatch(/^\d+-\d+-\d+$/);
  });

  it('should handle UUID-like IDs by hashing them into numbers', () => {
    const uuid = 'a5e6dc80-1-00';
    const protocol = generateProtocol(uuid, 0, '00');
    
    // Should be numeric parts only
    const parts = protocol.split('-');
    expect(parts.length).toBe(3);
    parts.forEach(part => {
      expect(part).toMatch(/^\d+$/);
    });
  });

  it('should increment the sequence correctly', () => {
    const p1 = generateProtocol('1', 0, '00');
    const p2 = generateProtocol('1', 1, '00');
    const p3 = generateProtocol('1', 2, '00');
    
    expect(p1).toBe('1-1-00');
    expect(p2).toBe('1-2-00');
    expect(p3).toBe('1-3-00');
  });

  it('should default origin to 00 if missing or invalid', () => {
    // @ts-ignore - testing runtime resilience
    const p1 = generateProtocol('7', 0, null);
    // @ts-ignore
    const p2 = generateProtocol('7', 1, undefined);
    const p3 = generateProtocol('7', 2, '');
    const p4 = generateProtocol('7', 3, 'ABC');
    
    expect(p1).toBe('7-1-00');
    expect(p2).toBe('7-2-00');
    expect(p3).toBe('7-3-00');
    expect(p4).toBe('7-4-00');
  });
});
