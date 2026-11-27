import { Logo } from "@/components/Logo";
export function CaixaAuth({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="bg-preto px-5 h-16 flex items-center"><Logo claro /></header>
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="titulo text-3xl mb-6">{titulo}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
export function Mensagem({ estado }: { estado: { erro?: string; ok?: string } | null }) {
  if (!estado) return null;
  if (estado.erro) return <p role="alert" className="text-vermelho font-semibold text-sm">{estado.erro}</p>;
  return <p role="status" className="text-verde font-semibold text-sm">{estado.ok}</p>;
}
