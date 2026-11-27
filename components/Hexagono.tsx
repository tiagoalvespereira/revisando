/** Hexágono do brasão Revisando, usado como elemento decorativo nas faixas escuras. */
export function Hexagono({ className = "", cheio = false }: { className?: string; cheio?: boolean }) {
  return (
    <svg viewBox="0 0 100 115" className={className} aria-hidden="true">
      <polygon points="50,2 98,30 98,85 50,113 2,85 2,30" fill={cheio ? "#111111" : "none"} stroke="currentColor" strokeWidth="2.5" />
      <polygon points="50,9 92,33.5 92,81.5 50,106 8,81.5 8,33.5" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
    </svg>
  );
}

/** Ícone R✓ (marca). */
export function IconeMarca({ className = "size-9" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/marca/revisando-icone-laranja.svg" alt="" className={`${className} rounded-[10px]`} width={36} height={36} />;
}
