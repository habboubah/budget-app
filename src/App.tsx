/** Placeholder until the month screen lands — proves tokens, fonts and the build. */
export default function App() {
  return (
    <div className="font-sans text-fg min-h-screen bg-bg safe-top">
      <div className="mx-auto max-w-xl px-5 pt-10 space-y-5">
        <h1 className="display text-title font-extrabold">Spartopf</h1>
        <div className="rounded-lg bg-hero text-hero-ink p-5 shadow-e2">
          <p className="eyebrow text-hero-mute">Jetzt auf dem Konto</p>
          <p className="display text-display font-bold num mt-2">0,00 €</p>
        </div>
      </div>
    </div>
  );
}
