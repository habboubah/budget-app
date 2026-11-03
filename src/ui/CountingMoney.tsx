import { useCountUp } from './useCountUp';

/**
 * An amount that runs to its new value (see useCountUp). Purely visual: put
 * the final amount beside it for VoiceOver (`sr-only`) and hide this one.
 */
export function CountingMoney({ cents, money }: { cents: number; money: (c: number) => string }) {
  return <>{money(useCountUp(cents))}</>;
}
