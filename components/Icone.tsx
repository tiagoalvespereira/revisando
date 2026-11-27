// Ícones em SVG (sem emoji, conforme a identidade visual).
const caminhos: Record<string, string> = {
  livro: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm2 14h12M8 7h6",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  alvo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  balanca: "M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7Zm12 0-3 7a3 3 0 0 0 6 0l-3-7Z",
  raio: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  trofeu: "M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4M12 13v4m-4 4h8m-6-4h4",
  documento: "M6 2h8l4 4v16H6zM14 2v4h4M9 12h6M9 16h6",
  cadeado: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  download: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
  olho: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  seta: "M5 12h14m-5-5 5 5-5 5",
  check: "M5 13l4 4L19 7",
};
export function Icone({ nome, className = "size-6" }: { nome: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={caminhos[nome] ?? caminhos.livro} />
    </svg>
  );
}
export const ICONES = Object.keys(caminhos).filter((k) => !["cadeado", "download", "olho", "seta", "check"].includes(k));
