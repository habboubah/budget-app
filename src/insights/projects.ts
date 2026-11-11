import { AppData, Project } from '../types';
import { isoDay } from '../logic';

/*
 * Trips and projects (schema 28): what everything tagged with a project's
 * tag comes to, against its budget and its days. Pure, in cents.
 */

export interface ProjectStatus {
  project: Project;
  /** Paid and open together; refunds come off, income and transfers don't count. */
  spent: number;
  paid: number;
  open: number;
  /** How many entries carry the tag. */
  count: number;
  /** What is left of the budget (below zero: over); null without a budget. */
  left: number | null;
  /** Its days, when it has both dates: how many, and how many of them are gone (today counts as gone). */
  days: { total: number; gone: number } | null;
  /** While it runs and something is left: per day until its last day, today included. Rounded down. */
  perDay: number | null;
  /** Between its dates today — or, without dates, simply not closed. */
  active: boolean;
}

const dayNumber = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000); };

/** Whether the entry sheet offers a project today: not closed, and inside its dates when it has any. */
export function isActiveProject(p: Project, today = new Date()): boolean {
  if (p.closed) return false;
  const now = isoDay(today);
  return (!p.from || now >= p.from) && (!p.to || now <= p.to);
}

export function projectStatus(data: AppData, project: Project, today = new Date()): ProjectStatus {
  const expense = new Set(data.categories.filter(c => c.kind === 'expense').map(c => c.id));
  let paid = 0;
  let open = 0;
  let count = 0;
  for (const e of data.entries) {
    if (e.transfer || !e.tags?.includes(project.tag) || !expense.has(e.categoryId)) continue;
    count++;
    if (e.paid) paid += e.amount; else open += e.amount;
  }
  const spent = paid + open;
  const left = project.budget ? project.budget - spent : null;
  const active = isActiveProject(project, today);
  let days: ProjectStatus['days'] = null;
  let perDay: number | null = null;
  if (project.from && project.to) {
    const total = dayNumber(project.to) - dayNumber(project.from) + 1;
    const gone = Math.max(0, Math.min(total, dayNumber(isoDay(today)) - dayNumber(project.from) + 1));
    days = { total, gone };
    // What is left, over the days still to come — today among them.
    const ahead = total - gone + (active ? 1 : 0);
    if (active && left !== null && left > 0 && ahead > 0) perDay = Math.floor(left / ahead);
  }
  return { project, spent, paid, open, count, left, days, perDay, active };
}

/** Every project's status: the running ones first, then those still to come, the closed last; newest first within each. */
export function projectsOverview(data: AppData, today = new Date()): ProjectStatus[] {
  const rank = (s: ProjectStatus) => (s.project.closed ? 2 : s.active ? 0 : 1);
  return (data.projects ?? []).map(p => projectStatus(data, p, today))
    .sort((a, b) => rank(a) - rank(b) || b.project.createdAt - a.project.createdAt);
}

/** An amount typed in a project's currency, in the book's: 450 TRY at 38,5 → 11,69 €. */
export function fromProjectCurrency(cents: number, project: Pick<Project, 'rate'>): number {
  return project.rate && project.rate > 0 ? Math.round(cents / project.rate) : cents;
}
