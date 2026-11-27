import { Logo } from "@/components/Logo";
import { Hexagono } from "@/components/Hexagono";

export function CaixaAuth({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col bg-off">
      <header className="relative overflow-hidden bg-preto text-off">
        <Hexagono className="absolute -right-16 -top-20 w-64 text-laranja/25" />
        <div className="relative max-w-sm mx-auto px-5 pt-6 pb-16">
          <Logo href="/" claro tamanho="lg" />
          <h1 className="titulo text-3xl mt-8">{titulo}</h1>
        </div>
      </header>
      <div className="flex-1 px-4 -mt-10 pb-10">
        <div className="relative w-full max-w-sm mx-auto cartao p-5 sm:p-6 shadow-[0_24px_50px_-30px_rgba(17,17,17,.55)]">{children}</div>
      </div>
    </main>
  );
}
export function Mensagem({ estado }: { estado: { erro?: string; ok?: string } | null }) {
  if (!estado) return null;
  if (estado.erro) return <p role="alert" className="rounded-xl bg-[#fbeaea] px-3 py-2.5 text-vermelho font-semibold text-sm">{estado.erro}</p>;
  return <p role="status" className="rounded-xl bg-verde-claro px-3 py-2.5 text-verde font-semibold text-sm">{estado.ok}</p>;
}
