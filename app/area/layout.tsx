import Link from "next/link";
import { Logo } from "@/components/Logo";
import { alunoAtual } from "@/lib/aluno";

export default async function LayoutArea({ children }: { children: React.ReactNode }) {
  const { perfil } = await alunoAtual();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-preto text-off sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <Logo href="/area" claro />
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/area" className="opacity-80 hover:opacity-100">Painel</Link>
            <Link href="/area/conta" className="opacity-80 hover:opacity-100">Minha conta</Link>
            {perfil.is_admin && <Link href="/admin" className="text-laranja font-semibold">Admin</Link>}
            <form action="/auth/sair" method="post"><button className="opacity-60 hover:opacity-100">Sair</button></form>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="text-xs text-cinza px-4 py-6 text-center">
        Revisando · Proibida a reprodução, cópia, venda ou distribuição, total ou parcial, deste material sem autorização (Lei 9.610/98).
      </footer>
    </div>
  );
}
