import { ChevronRight, Plus } from 'lucide-react';
import { ProjectStatus } from '../insights';
import { dayLabel, formatMoney, formatMoneyApprox, formatMoneyShort } from '../logic';
import { Strings, fmt } from '../translations';
import { Screen, Empty, Group, Row, Dock } from '../ui/Screen';
import { Button } from '../ui/Button';

/** A project in one line: what it has cost against its budget, its days, and what is left per day while it runs. */
export function projectLine(s: ProjectStatus, t: Strings): string {
  const p = s.project;
  const spent = p.budget
    ? fmt(t.budgetOf, { spent: formatMoney(s.spent, t.locale), limit: formatMoneyShort(p.budget, t.locale) })
    : formatMoney(s.spent, t.locale);
  const days = p.from && p.to ? `${dayLabel(p.from, t.locale)} – ${dayLabel(p.to, t.locale)}` : null;
  const state = p.closed ? t.projectClosed
    : s.left !== null && s.left < 0 ? fmt(t.budgetOver, { amount: formatMoney(-s.left, t.locale) })
      : s.perDay !== null ? fmt(t.perDay, { amount: formatMoneyApprox(s.perDay, t.locale) }) : null;
  return [spent, days, state].filter(Boolean).join(' · ');
}

function rows(list: ProjectStatus[], t: Strings, onEdit: (id: string) => void) {
  return list.map(s => {
    const sub = projectLine(s, t);
    return (
      <Row
        key={s.project.id}
        label={s.project.name}
        sub={<span className={s.left !== null && s.left < 0 && !s.project.closed ? 'text-neg' : undefined}>{sub}</span>}
        leading={<span className="emoji w-9 h-9 rounded-[10px] bg-surface-2 inline-flex items-center justify-center shrink-0 text-[20px]" aria-hidden="true">{s.project.emoji}</span>}
        trailing={<ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />}
        onClick={() => onEdit(s.project.id)}
        ariaLabel={`${fmt(t.editNamed, { name: s.project.name })}, ${sub}`}
      />
    );
  });
}

/**
 * Optionen → Haushaltsbuch → Reisen und Projekte (pushed, schema 28): a
 * holiday, a move, the baby's room — each a tag with a budget and dates. The
 * way in for the first one; Planen's card appears once there is one.
 */
export function ProjectsView({ overview, t, onBack, onNew, onEdit }: {
  overview: ProjectStatus[];
  t: Strings;
  onBack: () => void;
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  const open = overview.filter(s => !s.project.closed);
  const closed = overview.filter(s => s.project.closed);
  return (
    <>
      <Screen title={t.projectsTitle} onBack={onBack} backLabel={t.back} docked>
        {overview.length === 0 ? (
          <Empty emoji="🧳" title={t.projectsEmpty} body={t.projectsEmptyBody} action={<Button icon={Plus} onClick={onNew}>{t.projectAdd}</Button>} />
        ) : (
          <div className="space-y-6">
            {open.length > 0 && <Group footer={t.projectsFooter}>{rows(open, t, onEdit)}</Group>}
            {closed.length > 0 && <Group title={t.projectClosed}>{rows(closed, t, onEdit)}</Group>}
          </div>
        )}
      </Screen>
      {overview.length > 0 && <Dock><Button full size="lg" icon={Plus} onClick={onNew}>{t.projectAdd}</Button></Dock>}
    </>
  );
}

/** Reisen und Projekte on Planen: there only once one exists; the ones not closed, and the way to all of them. */
export function ProjectsCard({ overview, t, onOpen, onEdit }: {
  overview: ProjectStatus[];
  t: Strings;
  onOpen: () => void;
  onEdit: (id: string) => void;
}) {
  const open = overview.filter(s => !s.project.closed);
  const shown = (open.length ? open : overview).slice(0, 3);
  return (
    <section className="rounded-md bg-surface card-edge" aria-labelledby="projects-card-title">
      <div className="px-4 pt-4 flex items-center gap-3">
        <h3 id="projects-card-title" className="min-w-0 flex-1 text-heading font-semibold text-fg wrap-compound">{t.projectsTitle}</h3>
        <button type="button" onClick={onOpen} className="hit-44 shrink-0 text-label font-medium text-accent active:opacity-60 focus-visible:ring-focus rounded-sm">{t.goalsAll}</button>
      </div>
      <div className="mt-1">{rows(shown, t, onEdit)}</div>
    </section>
  );
}
