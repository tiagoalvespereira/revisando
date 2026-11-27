import { Logo } from "@/components/Logo";
import { MenuBase, MenuTopo, type ItemMenu } from "@/components/Menu";
import { exigirAdmin } from "@/lib/admin";

export const metadata = { title: "Admin" };

const ITENS: ItemMenu[] = [
  { href: "/admin", rotulo: "Métricas", icone: "trofeu", ativoEm: ["/admin$"] },
  { href: "/admin/alunos", rotulo: "Alunos", icone: "usuario", ativoEm: ["/admin/alunos"] },
  { href: "/admin/produtos", rotulo: "Produtos", icone: "pilha", ativoEm: ["/admin/produtos"] },
  { href: "/admin/leads", rotulo: "Leads", icone: "alvo", ativoEm: ["/admin/leads"] },
  { href: "/area", rotulo: "Área", icone: "casa", ativoEm: [] },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-preto text-off sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-[76px] md:h-[120px] flex items-center gap-6">
          <Logo href="/admin" claro />
          <span className="selo bg-laranja text-preto">Admin</span>
          <div className="ml-auto"><MenuTopo itens={ITENS} /></div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 pb-28 md:pb-10">{children}</main>
      <MenuBase itens={ITENS} />
    </div>
  );
}
