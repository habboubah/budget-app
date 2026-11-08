import { describe, expect, it } from 'vitest';
import { goalProgress, hasSavingsCategory, openGoals } from './goals';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry, Goal } from '../types';

const cats = defaultCategories();
let n = 0;
const e = (month: string, amount: number, paid: boolean, goalId?: string): Entry => ({
  id: `g${++n}`, month, categoryId: 'investment', name: 'Sparen', amount, paid, repeat: 'none', seriesId: `s${n}`, createdAt: 0, ...(goalId ? { goalId } : {}),
});
const goal = (over: Partial<Goal> = {}): Goal => ({ id: 'urlaub', name: 'Urlaub', emoji: '🏖️', hue: 'mint', target: 120000, createdAt: 0, ...over });
const data = (entries: Entry[], goals: Goal[] = [goal()]): AppData => ({ categories: cats, entries, months: [], goals });
const today = new Date(2026, 0, 15); // January 2026

describe('goalProgress (plan 12)', () => {
  it('counts a starting amount plus paid entries with the goalId', () => {
    const g = goal({ start: 20000 });
    const p = goalProgress(data([e('2026-01', 40000, true, 'urlaub'), e('2026-01', 10000, false, 'urlaub')], [g]), g, today);
    expect(p.saved).toBe(60000); // 200 start + 400 paid (the open 100 doesn't count yet)
    expect(p.left).toBe(60000);
    expect(p.reached).toBe(false);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });

  it('a recurring contribution: every paid copy counts', () => {
    const g = goal();
    const entries = ['2025-11', '2025-12', '2026-01'].map(m => e(m, 30000, true, 'urlaub'));
    const p = goalProgress(data(entries, [g]), g, today);
    expect(p.saved).toBe(90000);
  });

  it('money taken out is a negative-effect... handled as a separate entry; only matching goalIds count', () => {
    const g = goal();
    const p = goalProgress(data([e('2026-01', 50000, true, 'urlaub'), e('2026-01', 50000, true, 'other')], [g]), g, today);
    expect(p.saved).toBe(50000);
  });

  it('computes the monthly need to reach a due date, rounded up to whole euros', () => {
    const g = goal({ due: '2026-06', target: 120000 }); // Jan..Jun = 6 months
    const p = goalProgress(data([], [g]), g, today);
    expect(p.monthsLeft).toBe(5);
    expect(p.monthlyNeed).toBe(20000); // 1200 / 6 = 200 €
  });

  it('a goal past its date still shows but needs the whole remainder "now"', () => {
    const g = goal({ due: '2025-12', target: 120000 });
    const p = goalProgress(data([e('2026-01', 20000, true, 'urlaub')], [g]), g, today);
    expect(p.monthsLeft).toBe(0);
    expect(p.monthlyNeed).toBe(100000); // all of the remaining 1000 € this month
  });

  it('marks a reached goal and asks for no more monthly', () => {
    const g = goal({ due: '2026-06' });
    const p = goalProgress(data([e('2026-01', 120000, true, 'urlaub')], [g]), g, today);
    expect(p.reached).toBe(true);
    expect(p.left).toBe(0);
    expect(p.monthlyNeed).toBeNull();
  });

  it('openGoals skips closed ones; hasSavingsCategory sees Geldanlage', () => {
    const open = goal();
    const closed = goal({ id: 'alt', name: 'Alt', closedAt: 1 });
    expect(openGoals(data([], [open, closed])).map(g => g.id)).toEqual(['urlaub']);
    expect(hasSavingsCategory(data([]))).toBe(true); // Geldanlage ships with budget 'save'
  });
});
