import { useMemo, useState } from 'react';
import { MoreHorizontal, Pencil, PiggyBank, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AppData, Goal } from '../types';
import { formatMoneyShort, monthLabel, normalizeDigits, parseAmount, currencySymbol } from '../logic';
import { GoalProgress, goalProgress } from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty, Dock } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';

/**
 * Optionen is wrong — this is *Planen › Spartöpfe* (pushed, plan 12): one card
 * per goal with a progress ring, create, edit, take money out, reach, close
 * and delete. Deleting keeps the entries (they stay savings) and only drops
 * the link.
 */
export function GoalsView({ data, t, today, onNew, onEdit, onClose: onCloseGoal, onReopen, onWithdraw, onDelete, onBack }: {
  data: AppData;
  t: Strings;
  today: Date;
  onNew: () => void;
  onEdit: (g: Goal) => void;
  onClose: (g: Goal) => void;
  onReopen: (g: Goal) => void;
  onWithdraw: (g: Goal, amount: number) => void;
  onDelete: (g: Goal) => void;
  onBack: () => void;
}) {
  const goals = data.goals ?? [];
  const open = goals.filter(g => !g.closedAt);
  const closed = goals.filter(g => g.closedAt);
  const progress = useMemo(() => new Map(goals.map(g => [g.id, goalProgress(data, g, today)])), [data, goals, today]);
  const [menuFor, setMenuFor] = useState<{ goal: Goal; anchor: HTMLElement } | null>(null);
  const [withdrawFor, setWithdrawFor] = useState<Goal | null>(null);

  const card = (g: Goal) => {
    const p = progress.get(g.id)!;
    return (
      <section key={g.id} data-hue={g.hue} className="rounded-md bg-surface card-edge p-[16px] flex items-center gap-4">
        <GoalRing fraction={p.fraction} reached={p.reached} emoji={g.emoji} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 text-body font-semibold text-fg wrap-compound">{g.name}</h3>
            <IconButton
              label={`${t.more} — ${g.name}`}
              icon={MoreHorizontal}
              onClick={e => setMenuFor({ goal: g, anchor: e.currentTarget })}
            />
          </div>
          <p className="text-label text-fg mt-0.5 tabular-nums wrap-prose">
            {fmt(t.goalSaved, { saved: formatMoneyShort(p.saved, t.locale), target: formatMoneyShort(g.target, t.locale) })}
          </p>
          <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">
            {p.reached ? t.goalReached
              : p.monthlyNeed !== null && g.due
                ? fmt(t.goalMonthly, { amount: formatMoneyShort(p.monthlyNeed, t.locale), month: monthLabel(g.due, t.locale, 'name') })
                : fmt(t.goalLeft, { amount: formatMoneyShort(p.left, t.locale) })}
          </p>
        </div>
      </section>
    );
  };

  return (
    <>
      <Screen title={t.goalsTitle} onBack={onBack} backLabel={t.back} docked>
        {goals.length === 0 ? (
          <Empty emoji="🎯" title={t.goalsEmpty} body={t.goalsEmptyBody} action={<Button icon={Plus} onClick={onNew}>{t.goalNew}</Button>} />
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">{open.map(card)}</div>
            {closed.length > 0 && (
              <div>
                <h2 className="px-[16px] pb-1.5 eyebrow text-fg-mute">{t.goalsClosed}</h2>
                <div className="space-y-3 opacity-70">{closed.map(card)}</div>
              </div>
            )}
          </div>
        )}
      </Screen>

      {goals.length > 0 && (
        <Dock>
          <Button full size="lg" icon={Plus} onClick={onNew}>{t.goalNew}</Button>
        </Dock>
      )}

      <Menu
        anchor={menuFor?.anchor ?? null}
        label={menuFor?.goal.name ?? ''}
        groups={menuFor ? [
          [
            { key: 'edit', label: t.goalEdit, icon: Pencil, onSelect: () => onEdit(menuFor.goal) },
            { key: 'withdraw', label: t.goalWithdraw, icon: PiggyBank, onSelect: () => setWithdrawFor(menuFor.goal) },
            menuFor.goal.closedAt
              ? { key: 'reopen', label: t.goalReopen, icon: RotateCcw, onSelect: () => onReopen(menuFor.goal) }
              : { key: 'close', label: t.goalClose, icon: RotateCcw, onSelect: () => onCloseGoal(menuFor.goal) },
          ],
          [{ key: 'delete', label: t.goalDelete, icon: Trash2, destructive: true, onSelect: () => onDelete(menuFor.goal) }],
        ] : []}
        onClose={() => setMenuFor(null)}
      />

      <WithdrawSheet goal={withdrawFor} t={t} onClose={() => setWithdrawFor(null)} onWithdraw={onWithdraw} />
    </>
  );
}

/** A circular progress ring with the goal's emoji in the middle. */
function GoalRing({ fraction, reached, emoji }: { fraction: number; reached: boolean; emoji: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[64px] h-[64px] shrink-0" role="img" aria-label={`${Math.round(fraction * 100)}%`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-hue-bg" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className={reached ? 'stroke-pos' : 'stroke-hue-chart'}
          strokeDasharray={c} strokeDashoffset={c * (1 - fraction)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center emoji text-[24px]" aria-hidden="true">{emoji}</span>
    </div>
  );
}

/** A one-field sheet to take money out of a goal. */
function WithdrawSheet({ goal, t, onClose, onWithdraw }: {
  goal: Goal | null;
  t: Strings;
  onClose: () => void;
  onWithdraw: (g: Goal, amount: number) => void;
}) {
  const [text, setText] = useState('');
  const amount = parseAmount(text, t.locale);
  const save = () => {
    if (!goal || amount === null || amount <= 0) return;
    onWithdraw(goal, amount);
    onClose();
  };
  return (
    <Sheet open={!!goal} title={t.goalWithdraw} closeLabel={t.cancel} onClose={() => { setText(''); onClose(); }}
      action={{ label: t.save, onClick: save, disabled: amount === null || amount <= 0 }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">{goal ? fmt(t.goalWithdrawBody, { name: goal.name }) : ''}</p>
        <Field
          label={t.amount}
          value={text}
          onChange={v => setText(normalizeDigits(v))}
          inputMode="decimal"
          autoFocus
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
        />
      </form>
    </Sheet>
  );
}

/** A GoalProgress passthrough so callers importing from here stay tidy. */
export type { GoalProgress };
