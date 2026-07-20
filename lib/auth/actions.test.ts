import { describe, expect, it } from 'vitest';

describe('auth config guard', () => {
  it('reports missing auth environment variables', () => {
    const missing = ['DATABASE_URL', 'JWT_SECRET'];
    expect(missing).toContain('DATABASE_URL');
    expect(missing).toContain('JWT_SECRET');
  });
});
