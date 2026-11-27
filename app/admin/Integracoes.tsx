"use client";
import { useActionState } from "react";
import { testarWhatsapp } from "./actions";
import { Icone } from "@/components/Icone";

type Item = { nome: string; ok: boolean; detalhe: string };

export function Integracoes({ itens }: { itens: Item[] }) {
  const [estado, acao, pendente] = useActionState(testarWhatsapp, null);
  return (
    <section className="cartao p-5 space-y-4">
      <h2 className="titulo text-lg">Integrações</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {itens.map((i) => (
          <li key={i.nome} className="flex items-start gap-3 rounded-xl bg-off/60 p-3">
            <span className={`grid place-items-center size-7 rounded-full shrink-0 text-white ${i.ok ? "bg-verde" : "bg-vermelho"}`}>
              <Icone nome={i.ok ? "check" : "cadeado"} className="size-4" />
            </span>
            <span className="text-sm"><b className="block">{i.nome}</b><span className="text-cinza">{i.detalhe}</span></span>
          </li>
        ))}
      </ul>
      <form action={acao} className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
        <div className="flex-1 min-w-48">
          <label className="rotulo" htmlFor="numero-teste">Testar WhatsApp: enviar mensagem para</label>
          <input id="numero-teste" name="numero" inputMode="tel" placeholder="(61) 99999-9999" className="campo" />
        </div>
        <button className="btn btn-verde" disabled={pendente}>{pendente ? "Enviando..." : "Enviar teste"}</button>
        {estado?.ok && <p className="basis-full text-sm font-semibold text-verde">{estado.ok}</p>}
        {estado?.erro && <p className="basis-full text-sm font-semibold text-vermelho break-words">{estado.erro}</p>}
      </form>
    </section>
  );
}
