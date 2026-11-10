import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ACCOUNT_KINDS, Account, AccountKind, Hue } from '../types';
import { MAIN_ACCOUNT, accountLook, cleanText, normalizeDigits, parseAmount } from '../logic';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label } from '../ui/Field';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { EmojiPicker, HuePicker } from '../ui/PicturePicker';
import { tapLight } from '../ui/haptics';

export type AccountSheetMode = { kind: 'new'; accountKind: AccountKind } | { kind: 'edit'; account: Account; deletable: boolean } | null;
export type AccountDraft = Omit<Account, 'id' | 'createdAt'>;

/** A few more pictures that fit money kept somewhere. */
const ACCOUNT_EMOJIS = ['🏦', '💶', '💵', '👛', '💳', '🐷', '🏧', '📈', '🪙', '💰', '🏠', '🚗', '✈️', '🎁'];

/**
 * A new account, or one being changed (plan 30): its name, what kind it is,
 * picture and colour — and for a new one what is on it today, which becomes
 * this month's opening balance for it. The main account can be renamed but
 * not deleted; another only once nothing is booked on it.
 */
export function AccountSheet({ mode, t, onClose, onCreate, onSave, onDelete }: {
  mode: AccountSheetMode;
  t: Strings;
  onClose: () => void;
  /** `start`: what is on it today, in cents (null = nothing said). */
  onCreate: (draft: AccountDraft, start: number | null) => void;
  onSave: (id: string, patch: Partial<AccountDraft>) => void;
  onDelete: (account: Account) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.account : null;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('cash');
  const [emoji, setEmoji] = useState('💶');
  const [hue, setHue] = useState<Hue>('leaf');
  const [start, setStart] = useState('');
  const kindLabel: Record<AccountKind, string> = { bank: t.accountKindBank, cash: t.accountKindCash, savings: t.accountKindSavings };

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      const a = mode.account;
      setName(a.name || (a.id === MAIN_ACCOUNT ? t.accountMain : ''));
      setKind(a.kind); setEmoji(a.emoji); setHue(a.hue);
    } else {
      const look = accountLook(mode.accountKind);
      setKind(mode.accountKind);
      setName(mode.accountKind === 'bank' ? '' : kindLabel[mode.accountKind]);
      setEmoji(look.emoji); setHue(look.hue);
    }
    setStart('');
  }, [mode]);

  // A new account takes the kind's look until the user picks another.
  const pickKind = (k: AccountKind) => {
    tapLight();
    if (!editing) {
      const before = accountLook(kind);
      const look = accountLook(k);
      if (emoji === before.emoji) setEmoji(look.emoji);
      if (hue === before.hue) setHue(look.hue);
      if (!name.trim() || name === kindLabel[kind]) setName(k === 'bank' ? '' : kindLabel[k]);
    }
    setKind(k);
  };

  const clean = cleanText(name, 40);
  const negative = /^\s*[-−]/.test(start);
  const abs = start.trim() ? parseAmount(start.replace(/^\s*[-−]\s*/, ''), t.locale) : null;
  const startValue = abs === null ? null : negative ? -abs : abs;
  const startInvalid = start.trim() !== '' && abs === null;
  const canSave = !!clean && !startInvalid;
  const isMain = editing?.id === MAIN_ACCOUNT;

  const save = () => {
    if (!canSave) return;
    // The main account under its own name again is stored unnamed, so it follows the language.
    const stored = isMain && clean === t.accountMain ? '' : clean;
    if (editing) onSave(editing.id, { name: stored, kind, emoji, hue });
    else onCreate({ name: clean, kind, emoji, hue }, startValue);
    onClose();
  };

  return (
    <Sheet open={!!mode} title={editing ? t.accountEdit : t.accountNew} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        <div className="flex items-end gap-3">
          <Picture emoji={emoji} name={clean || '?'} hue={hue} size="lg" />
          <div className="flex-1 min-w-0">
            <Field label={t.accountName} value={name} onChange={setName} placeholder={kindLabel[kind]} maxLength={40} autoFocus={!editing} enterKeyHint="done" />
          </div>
        </div>
        <div role="radiogroup" aria-label={t.accountKind}>
          <Label>{t.accountKind}</Label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_KINDS.map(k => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => pickKind(k)}
                className={`min-h-tap px-4 rounded-full text-label border-[1.5px] transition-colors focus-visible:ring-focus ${
                  kind === k ? 'bg-accent-dim text-accent border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
              >
                {kindLabel[k]}
              </button>
            ))}
          </div>
        </div>
        {!editing && (
          <div>
            <Field
              label={t.accountStart}
              value={start}
              onChange={v => setStart(normalizeDigits(v))}
              placeholder="0,00"
              inputMode="decimal"
              enterKeyHint="done"
              trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
            />
            <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.accountStartHint}</p>
          </div>
        )}
        <div>
          <Label>{t.picture}</Label>
          <EmojiPicker value={emoji} emojis={ACCOUNT_EMOJIS} onChange={setEmoji} label={t.picture} />
        </div>
        <div>
          <Label>{t.colour}</Label>
          <HuePicker value={hue} onChange={setHue} label={t.colour} />
        </div>
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!canSave}>{editing ? t.save : t.add}</Button>
          {editing && !isMain && mode?.kind === 'edit' && (
            mode.deletable
              ? <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.accountDelete}</Button>
              : <p className="text-caption text-fg-mute px-1 wrap-prose">{t.accountDeleteBlocked}</p>
          )}
        </div>
      </form>
    </Sheet>
  );
}

