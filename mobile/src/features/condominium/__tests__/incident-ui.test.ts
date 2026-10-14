/**
 * incident-ui.test.ts — linha do tempo e metadados das ocorrências (lógica pura).
 */
import { timelineSteps, categoryMeta, statusTone, relativeDate } from '../incident-ui';

describe('timelineSteps', () => {
  it('marks only the first step for a new incident', () => {
    expect(timelineSteps('Aberta').map((s) => s.done)).toEqual([true, false, false]);
  });

  it('marks progress when in andamento', () => {
    expect(timelineSteps('EmAndamento').map((s) => s.done)).toEqual([true, true, false]);
  });

  it('ends in Resolvida when resolved', () => {
    const steps = timelineSteps('Resolvida');
    expect(steps.map((s) => s.key)).toEqual(['Aberta', 'EmAndamento', 'Resolvida']);
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it('ends in Recusada when rejected', () => {
    const steps = timelineSteps('Recusada');
    expect(steps[2].key).toBe('Recusada');
    expect(steps.every((s) => s.done)).toBe(true);
  });
});

describe('meta helpers', () => {
  it('maps category to label and icon', () => {
    expect(categoryMeta('Barulho')).toEqual({ label: 'Barulho', icon: 'volume-high-outline' });
  });

  it('maps status to a theme tone', () => {
    expect(statusTone('Aberta')).toBe('accent');
    expect(statusTone('Resolvida')).toBe('verified');
    expect(statusTone('Recusada')).toBe('danger');
  });

  it('formats recent dates in Portuguese', () => {
    expect(relativeDate(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('há 5 min');
    expect(relativeDate(new Date(Date.now() - 26 * 3_600_000).toISOString())).toBe('ontem');
  });
});
