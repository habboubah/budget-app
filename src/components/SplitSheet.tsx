import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { amountToInput, cleanText, displayName, formatMoney, normalizeDigits, parseAmount, withAmounts, currencySymbol } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

interface Part { categoryId: string; name: string; amount: string }

/**
 * Split one payment into parts (plan 21): "Lidl 48,20 €" into "Lebensmittel
 * 35,10 € · Drogerie 13,10 €". The parts must add up to the original; the
 * sheet shows how much is still unassigned. The parts become normal entries
 * sharing a splitId, so every total and budget stays right.
 */
export function SplitSheet({ entry, categories, language, t, onClose, onSplit }: {
  entry: Entry | null;
  categories: Category[];
  language: string;
  t: Strings;
  onClose: () => void;
  onSplit: (id: string, parts: { categoryId: string; name: string; amount: number }[]) => void;
}) {
  // Offer categories of the same kind as the original (an expense splits into expenses).
  const kind = categories.find(c => c.id === entry?.categoryId)?.kind ?? 'expense';
  const options = categories.filter(c => c.kind === kind);
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    if (!entry) return;
    // Start with two parts: the first keeps the whole amount, the second empty.
    setParts([
      { categoryId: entry.categoryId, name: entry.name, amount: amountToInput(entry.amount, t.locale) },
      { categoryId: entry.categoryId, name: entry.name, amount: '' },
    ]);
  }, [entry]);

  const amounts = parts.map(p => parseAmount(p.amount, t.locale) ?? 0);
  const assigned = amounts.reduce((s, a) => s + a, 0);
  const remaining = (entry?.amount ?? 0) - assigned;
  const valid = !!entry && parts.length >= 2 && parts.every(p => (parseAmount(p.amount, t.locale) ?? 0) > 0) && remaining === 0;

  const setPart = (i: number, p: Partial<Part>) => setParts(prev => prev.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const addPart = () => setParts(prev => [...prev, { categoryId: entry?.categoryId ?? categories[0].id, name: entry?.name ?? '', amount: remaining > 0 ? amountToInput(remaining, t.locale) : '' }]);
  const removePart = (i: number) => setParts(prev => prev.filter((_, k) => k !== i));

  const save = () => {
    if (!valid || !entry) return;
    onSplit(entry.id, parts.map(p => ({ categoryId: p.categoryId, name: cleanText(p.name) || entry.name, amount: parseAmount(p.amount, t.locale)! })));
    onClose();
  };

  return (
    <Sheet open={!!entry} title={t.splitPayTitle} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: save, disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
        <p className="text-label text-fg-mute wrap-prose">
          {entry && fmt(t.splitPayBody, { name: entry.name, amount: formatMoney(entry.amount, t.locale) })}
        </p>
        <div className="space-y-3">
          {parts.map((p, i) => {
            const c = categories.find(x => x.id === p.categoryId);
            return (
              <div key={i} className="rounded-md bg-surface-2 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="relative flex-1 min-w-0 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 min-h-[40px] focus-within:ring-focus">
                    <span className="emoji text-[15px]" aria-hidden="true">{c?.emoji}</span>
                    <span className="min-w-0 truncate text-label text-fg">{c ? displayName(c.names, language) : ''}</span>
                    <select aria-label={t.category} value={p.categoryId} onChange={e => setPart(i, { categoryId: e.target.value })} className="absolute inset-0 w-full opacity-0 appearance-none">
                      {options.map(x => <option key={x.id} value={x.id}>{displayName(x.names, language)}</option>)}
                    </select>
                  </label>
                  {parts.length > 2 && (
                    <button type="button" onClick={() => removePart(i)} aria-label={t.deleteEntry} className="h-tap w-tap inline-flex items-center justify-center text-neg active:scale-[0.92] transition-transform focus-visible:ring-focus">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Field label={t.whatFor} hideLabel value={p.name} onChange={v => setPart(i, { name: v })} placeholder={entry?.name} maxLength={80} />
                  <div className="w-[9rem] shrink-0">
                    <Field label={t.amount} hideLabel value={p.amount} onChange={v => setPart(i, { amount: normalizeDigits(v) })} inputMode="decimal"
                      trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" full icon={Plus} onClick={addPart}>{t.splitPayAdd}</Button>
        {/* What is left to split follows the parts being typed: shown even while amounts are hidden (plan 06). */}
        <p className={`text-label font-medium tabular-nums wrap-prose ${remaining === 0 ? 'text-pos' : 'text-warn'}`}>
          {remaining === 0 ? t.splitPayBalanced : fmt(remaining > 0 ? t.splitPayRemaining : t.splitPayOver, { amount: withAmounts(() => formatMoney(Math.abs(remaining), t.locale)) })}
        </p>
        <Button type="submit" full size="lg" disabled={!valid}>{t.save}</Button>
      </form>
    </Sheet>
  );
}
