import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icone } from "@/components/Icone";
import { MenuBase, MenuTopo, type ItemMenu } from "@/components/Menu";
import { alunoAtual } from "@/lib/aluno";

const ITENS: ItemMenu[] = [
  { href: "/area", rotulo: "Início", icone: "casa", ativoEm: ["/area"] },
  { href: "/area/cronograma", rotulo: "Cronograma", icone: "calendario", ativoEm: ["/area/cronograma"] },
  { href: "/area/materiais", rotulo: "Materiais", icone: "pilha", ativoEm: ["/area/materiais", "/area/produto", "/area/ler"] },
  { href: "/area/simulados", rotulo: "Simulados", icone: "alvo", ativoEm: ["/area/simulado"] },
  { href: "/area/conta", rotulo: "Conta", icone: "usuario", ativoEm: ["/area/conta"] },
];

export default async function LayoutArea({ children }: { children: React.ReactNode }) {
  const { perfil } = await alunoAtual();
  const inicial = (perfil.nome ?? perfil.email).trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-preto text-off sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-[76px] md:h-[120px] flex items-center gap-6">
          <Logo href="/area" claro />
          <MenuTopo itens={ITENS} />
          <div className="ml-auto flex items-center gap-2">
            {perfil.is_admin && (
              <Link href="/admin" className="btn btn-pequeno bg-laranja/15 text-laranja hover:bg-laranja/25">
                <Icone nome="escudo" className="size-4" /> Admin
              </Link>
            )}
            <Link href="/area/conta" aria-label="Minha conta" className="grid place-items-center size-9 rounded-full bg-white/10 font-bold text-sm hover:bg-white/20">
              {inicial}
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 pb-24 md:pb-10">{children}</div>
      <footer className="hidden md:block text-xs text-cinza px-4 py-6 text-center border-t border-linha">
        Revisando · Proibida a reprodução, cópia, venda ou distribuição, total ou parcial, deste material sem autorização (Lei 9.610/98).
      </footer>
      <MenuBase itens={ITENS} />
    </div>
  );
}
