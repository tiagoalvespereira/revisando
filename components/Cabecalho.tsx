import Link from "next/link";
import { Hexagono } from "@/components/Hexagono";
import { Icone } from "@/components/Icone";

/** Faixa escura de título de página, com o hexágono da marca ao fundo. */
export function Cabecalho({ sobretitulo, titulo, children, voltar }: { sobretitulo?: string; titulo: string; children?: React.ReactNode; voltar?: { href: string; rotulo: string } }) {
  return (
    <section className="relative overflow-hidden bg-preto text-off">
      <Hexagono className="absolute -right-16 -top-10 w-72 text-laranja/25" />
      <Hexagono className="absolute right-40 top-24 w-24 text-white/10 hidden sm:block" />
      <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-8">
        {voltar && (
          <Link href={voltar.href} className="inline-flex items-center gap-1.5 text-sm text-off/60 hover:text-off mb-3">
            <Icone nome="voltar" className="size-4" /> {voltar.rotulo}
          </Link>
        )}
        {sobretitulo && <p className="sobretitulo mb-2">{sobretitulo}</p>}
        <h1 className="titulo text-3xl sm:text-4xl max-w-3xl">{titulo}</h1>
        {children}
      </div>
    </section>
  );
}

export function Vazio({ icone, titulo, texto, children }: { icone: string; titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="cartao p-8 text-center">
      <span className="mx-auto grid place-items-center size-14 rounded-2xl bg-laranja-claro text-laranja mb-4"><Icone nome={icone} className="size-7" /></span>
      <p className="titulo text-lg">{titulo}</p>
      <p className="text-cinza mt-1 max-w-md mx-auto">{texto}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
