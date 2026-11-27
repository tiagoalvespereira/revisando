"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/Icone";

export type ItemMenu = { href: string; rotulo: string; icone: string; ativoEm: string[] };

// "/area" e "/admin$" só valem para a página exata; os demais valem para tudo que começa com o caminho.
const ativo = (path: string, item: ItemMenu) =>
  item.ativoEm.some((p) => (p === "/area" ? path === "/area" : p.endsWith("$") ? path === p.slice(0, -1) : path.startsWith(p)));

/** Abas no topo (computador). */
export function MenuTopo({ itens }: { itens: ItemMenu[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="hidden md:flex items-center gap-1">
      {itens.map((i) => {
        const on = ativo(path, i);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${on ? "bg-white/10 text-off" : "text-off/65 hover:text-off hover:bg-white/5"}`}>
            <Icone nome={i.icone} className="size-[18px]" />
            {i.rotulo}
            {on && <span className="absolute inset-x-3 -bottom-[19px] md:-bottom-[41px] h-[3px] rounded-full bg-laranja" />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra fixa embaixo (celular): o jeito mais rápido de navegar com o polegar. */
export function MenuBase({ itens }: { itens: ItemMenu[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-preto/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
        {itens.map((i) => {
          const on = ativo(path, i);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold transition ${on ? "text-laranja" : "text-off/60 active:text-off"}`}>
                <span className={`grid place-items-center h-7 w-12 rounded-full transition ${on ? "bg-laranja/15" : ""}`}>
                  <Icone nome={i.icone} className="size-[22px]" />
                </span>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
