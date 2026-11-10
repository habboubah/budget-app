import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeftRight, Check, Plus } from 'lucide-react';
import { Account, Entry } from '../types';
import { ALL_ACCOUNTS, AccountView, MAIN_ACCOUNT, accountName, dayLabel, formatMoney, spoken } from '../logic';
import { Strings, fmt } from '../translations';
import { rise } from '../ui/stagger';
import { tapLight } from '../ui/haptics';

/**
 * A month's transfers between accounts (plan 30), below its categories:
 * money that only changed place — neither income nor expense, so it has a
 * card of its own and never a category's. For one account each transfer
 * shows with its sign (out −, in +); for *Alle Konten* once, without one.
 * Tapping the circle ticks both sides, tapping the row opens the transfer.
 */
export function TransfersCard({ transfers, sides, accounts, account, t, onToggle, onEdit, onNew }: {
  /** The month's transfer entries the shown account takes part in (`monthTransfers`). */
  transfers: Entry[];
  /** Every transfer entry of the month, whichever account: where each one goes to or comes from. */
  sides: Entry[];
  accounts: Account[];
  account: AccountView;
  t: Strings;
  onToggle: (pairId: string, paid: boolean) => void;
  onEdit: (pairId: string) => void;
  onNew: () => void;
}) {
  const byId = new Map(accounts.map(a => [a.id, a]));
  const nameOf = (id: string | undefined) => {
    const a = byId.get(id ?? MAIN_ACCOUNT);
    return a ? accountName(a, t.accountMain) : '?';
  };
  // Every account at once: each transfer once, by its outgoing side (or the side there is).
  const rows = account === ALL_ACCOUNTS
    ? transfers.filter(e => e.transfer!.direction === 'out' || !transfers.some(o => o.transfer!.pairId === e.transfer!.pairId && o.transfer!.direction === 'out'))
    : transfers;
  const pairOf = (e: Entry) => sides.filter(o => o.transfer!.pairId === e.transfer!.pairId);
  const signed = (e: Entry) => (account === ALL_ACCOUNTS ? 0 : e.transfer!.direction === 'in' ? e.amount : -e.amount);
  const net = rows.reduce((s, e) => s + signed(e), 0);

  return (
    <motion.section variants={rise} data-hue="sky" className="rounded-md bg-surface card-edge overflow-hidden" aria-labelledby="transfers-title">
      <div className="ps-[16px] pe-4 pt-3.5 pb-2 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-hue-bg text-hue-ink inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </span>
        <h2 id="transfers-title" className="min-w-0 flex-1 text-body font-semibold text-fg wrap-compound">{t.transfers}</h2>
        {account !== ALL_ACCOUNTS && net !== 0 && (
          <span className="shrink-0"><span className="block rounded-num text-body font-semibold text-fg">{formatMoney(net, t.locale, 'exceptZero')}</span></span>
        )}
      </div>
      <p className="px-[16px] pb-1 text-caption text-fg-mute wrap-prose">{t.transferHint}</p>
      <ul className="divide-hairline-inset" style={{ '--sep': '52px' } as React.CSSProperties}>
        {rows.map(e => {
          const pair = pairOf(e);
          const out = pair.find(o => o.transfer!.direction === 'out');
          const into = pair.find(o => o.transfer!.direction === 'in');
          const route = fmt(t.transferFromTo, { from: out ? nameOf(out.accountId) : '?', to: into ? nameOf(into.accountId) : '?' });
          const amount = account === ALL_ACCOUNTS ? formatMoney(e.amount, t.locale) : formatMoney(signed(e), t.locale, 'exceptZero');
          const toggle = `${e.paid ? t.markOpen : t.markPaid} — ${e.name}`;
          return (
            <li key={e.id} className="flex items-stretch min-h-[56px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={e.paid}
                aria-label={toggle}
                title={toggle}
                onClick={() => { tapLight(); onToggle(e.transfer!.pairId, !e.paid); }}
                className="w-[52px] shrink-0 flex items-center justify-center active:bg-surface-2 transition-colors focus-visible:ring-focus"
              >
                <span
                  className={`w-[24px] h-[24px] rounded-full inline-flex items-center justify-center transition-colors duration-200 ${
                    e.paid ? 'bg-hue-chart text-chart-label' : 'border-[1.75px] border-fg-faint'}`}
                  aria-hidden="true"
                >
                  {e.paid && <Check className="w-[15px] h-[15px]" strokeWidth={3.25} />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { tapLight(); onEdit(e.transfer!.pairId); }}
                aria-label={`${fmt(t.editNamed, { name: e.name })}, ${route}, ${spoken(amount, t.amountHidden)}, ${e.paid ? t.paidState : t.open}`}
                className="flex-1 min-w-0 py-2.5 pe-4 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body text-fg wrap-compound">{e.name}</span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-caption text-fg-mute mt-0.5">
                    {e.date && <><span className="whitespace-nowrap">{dayLabel(e.date, t.locale)}</span><span aria-hidden="true">·</span></>}
                    <span className="wrap-compound">{route}</span>
                    {!e.paid && <><span aria-hidden="true">·</span><span className="font-medium text-warn">{t.open}</span></>}
                  </span>
                </span>
                <span className={`shrink-0 text-body font-medium num ${e.paid ? 'text-fg' : 'text-fg-mute'}`}>{amount}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => { tapLight(); onNew(); }}
        className="w-full min-h-[48px] px-[16px] flex items-center gap-2 text-body text-accent border-t border-hairline active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <Plus className="w-5 h-5" aria-hidden="true" />
        {t.transferNew}
      </button>
    </motion.section>
  );
}
