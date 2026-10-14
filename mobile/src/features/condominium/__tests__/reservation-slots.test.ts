/**
 * reservation-slots.test.ts
 *
 * Verifies (pure logic, no RN render):
 *  - bookableDays labels and the maxAdvanceDays/cap limits
 *  - startSlots hides past hours, respects the daily window, minAdvanceHours and busy ranges
 *  - durationOptions stops at closing time / maxDurationMinutes and disables overlaps
 */
import {
  bookableDays,
  startSlots,
  durationOptions,
  formatDuration,
  parseHHmm,
  atMinutes,
  type AreaRules,
} from '../reservation-slots';

const rules = (overrides: Partial<AreaRules> = {}): AreaRules => ({
  openTime: '08:00:00',
  closeTime: '22:00:00',
  minAdvanceHours: 0,
  maxAdvanceDays: 30,
  maxDurationMinutes: null,
  ...overrides,
});

// Terça, 13/10/2026 10:30 (hora local), amanhã = quarta 14/10.
const now = new Date(2026, 9, 13, 10, 30);
const tomorrow = new Date(2026, 9, 14);
const busy = (day: Date, fromMin: number, toMin: number) => ({
  startUtc: atMinutes(day, fromMin).toISOString(),
  endUtc: atMinutes(day, toMin).toISOString(),
});

describe('bookableDays', () => {
  it('starts today with friendly labels', () => {
    const days = bookableDays(now, 5);
    expect(days).toHaveLength(6);
    expect(days[0].topLabel).toBe('Hoje');
    expect(days[1].topLabel).toBe('Amanhã');
    expect(days[2].topLabel).toBe('Qui');
    expect(days[1].bottomLabel).toBe('14 out');
    expect(days[1].key).toBe('2026-10-14');
  });

  it('caps the strip length', () => {
    expect(bookableDays(now, 90, 30)).toHaveLength(31);
  });
});

describe('startSlots', () => {
  it('covers the daily window leaving room for 1h', () => {
    const slots = startSlots(tomorrow, rules(), [], now);
    expect(slots[0].label).toBe('08:00');
    expect(slots[slots.length - 1].label).toBe('21:00');
    expect(slots.every((s) => !s.disabled)).toBe(true);
  });

  it('hides hours that already passed today', () => {
    const today = new Date(2026, 9, 13);
    const slots = startSlots(today, rules(), [], now);
    expect(slots[0].label).toBe('11:00');
  });

  it('disables slots inside minAdvanceHours', () => {
    const today = new Date(2026, 9, 13);
    const slots = startSlots(today, rules({ minAdvanceHours: 3 }), [], now);
    expect(slots.find((s) => s.label === '13:00')?.disabled).toBe(true);
    expect(slots.find((s) => s.label === '14:00')?.disabled).toBe(false);
  });

  it('disables busy slots', () => {
    const slots = startSlots(tomorrow, rules(), [busy(tomorrow, 20 * 60, 22 * 60)], now);
    expect(slots.find((s) => s.label === '19:00')?.disabled).toBe(false);
    expect(slots.find((s) => s.label === '20:00')?.disabled).toBe(true);
    expect(slots.find((s) => s.label === '21:00')?.disabled).toBe(true);
  });

  it('uses the whole day when the area has no window', () => {
    const slots = startSlots(tomorrow, rules({ openTime: null, closeTime: null }), [], now);
    expect(slots[0].label).toBe('00:00');
    expect(slots[slots.length - 1].label).toBe('23:00');
  });
});

describe('durationOptions', () => {
  it('stops at closing time', () => {
    const opts = durationOptions(tomorrow, 20 * 60, rules(), []);
    expect(opts.map((o) => o.minutes)).toEqual([30, 60, 90, 120]);
  });

  it('respects maxDurationMinutes, adding the exact max', () => {
    const opts = durationOptions(tomorrow, 10 * 60, rules({ maxDurationMinutes: 150 }), []);
    expect(opts.map((o) => o.minutes)).toEqual([30, 60, 90, 120, 150]);
  });

  it('disables durations that run into a booking', () => {
    const opts = durationOptions(tomorrow, 18 * 60, rules(), [busy(tomorrow, 20 * 60, 21 * 60)]);
    expect(opts.find((o) => o.minutes === 120)?.disabled).toBe(false);
    expect(opts.find((o) => o.minutes === 180)?.disabled).toBe(true);
  });
});

describe('helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h30');
  });

  it('parses HH:mm:ss with fallback', () => {
    expect(parseHHmm('07:30:00', 0)).toBe(450);
    expect(parseHHmm(null, 1440)).toBe(1440);
  });
});
