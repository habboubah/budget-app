import { Plus } from 'lucide-react';
import { Category, Rule } from '../types';
import { displayName } from '../logic';
import { Strings, fmt } from '../translations';
import { Screen, Empty, Group, Row, Dock } from '../ui/Screen';
import { Button } from '../ui/Button';

/**
 * Optionen → Haushaltsbuch → Regeln (pushed, plan 20): the import rules, to
 * edit or delete. Most rules come from the user's own corrections during an
 * import, so this screen is just for tidying up.
 */
export function RulesView({ rules, categories, language, t, onNew, onEdit, onBack }: {
  rules: Rule[];
  categories: Category[];
  language: string;
  t: Strings;
  onNew: () => void;
  onEdit: (r: Rule) => void;
  onBack: () => void;
}) {
  const byId = new Map(categories.map(c => [c.id, c]));
  const fieldLabel: Record<Rule['match']['field'], string> = { payee: t.rulePayee, name: t.ruleName, purpose: t.rulePurpose };

  const describe = (r: Rule): string => {
    const when = fmt(t.ruleWhenContains, { field: fieldLabel[r.match.field], text: r.match.contains });
    if ('skip' in r.set) return `${when} → ${t.ruleSkipShort}`;
    const cat = r.set.categoryId ? displayName(byId.get(r.set.categoryId)?.names, language) : '';
    const bits = [cat, r.set.name ? `„${r.set.name}“` : ''].filter(Boolean).join(', ');
    return `${when} → ${bits}`;
  };

  return (
    <>
      <Screen title={t.rulesTitle} onBack={onBack} backLabel={t.back} docked>
        {rules.length === 0 ? (
          <Empty emoji="📏" title={t.rulesEmpty} body={t.rulesEmptyBody} action={<Button icon={Plus} onClick={onNew}>{t.ruleNew}</Button>} />
        ) : (
          <Group footer={t.rulesFooter}>
            {[...rules].sort((a, b) => a.createdAt - b.createdAt).map(r => (
              <Row key={r.id} label={describe(r)} onClick={() => onEdit(r)} ariaLabel={describe(r)} />
            ))}
          </Group>
        )}
      </Screen>
      {rules.length > 0 && (
        <Dock><Button full size="lg" icon={Plus} onClick={onNew}>{t.ruleNew}</Button></Dock>
      )}
    </>
  );
}
