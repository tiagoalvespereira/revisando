import Link from "next/link";
import { Logo } from "@/components/Logo";
import { exigirAdmin } from "@/lib/admin";

export const metadata = { title: "Admin" };

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="min-h-dvh">
      <header className="bg-preto text-off">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Logo href="/admin" claro />
          <span className="text-xs uppercase tracking-widest text-laranja">Admin</span>
          <nav className="flex flex-wrap gap-4 text-sm ml-auto">
            <Link href="/admin">Métricas</Link>
            <Link href="/admin/alunos">Alunos</Link>
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/admin/leads">Leads</Link>
            <Link href="/area" className="opacity-70">Área do aluno</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
