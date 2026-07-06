import { CancellationPolicy } from './cancellation.policy';
import { FixedClock } from './clock';

describe('CancellationPolicy', () => {
  const now = new Date('2026-07-10T12:00:00.000Z');
  const policy = new CancellationPolicy(new FixedClock(now));

  it('classifies exactly 24h before start as EARLY (inclusive boundary, FR-16)', () => {
    const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(policy.evaluate(startAt)).toBe('early');
  });

  it('classifies 24h + 1 minute before start as EARLY', () => {
    const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 1000);
    expect(policy.evaluate(startAt)).toBe('early');
  });

  it('classifies 23h59m before start as LATE (FR-17)', () => {
    const startAt = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    expect(policy.evaluate(startAt)).toBe('late');
  });

  it('classifies 1 minute before start as LATE', () => {
    const startAt = new Date(now.getTime() + 60 * 1000);
    expect(policy.evaluate(startAt)).toBe('late');
  });

  it('classifies already-started slot as NOT_ALLOWED (UC-3 E1)', () => {
    const startAt = new Date(now.getTime() - 1000);
    expect(policy.evaluate(startAt)).toBe('not_allowed');
  });

  it('classifies slot starting exactly now as NOT_ALLOWED', () => {
    expect(policy.evaluate(now)).toBe('not_allowed');
  });
});
