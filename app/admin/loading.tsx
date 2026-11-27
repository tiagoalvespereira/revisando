/** Aparece na hora em que o aluno toca num link, enquanto a página carrega. */
export default function Carregando() {
  return (
    <main aria-busy="true" aria-label="Carregando">
      <div className="bg-preto">
        <div className="max-w-6xl mx-auto px-4 pt-7 pb-9 space-y-3">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-10 w-72 max-w-full rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="esqueleto h-28" />)}
      </div>
    </main>
  );
}
