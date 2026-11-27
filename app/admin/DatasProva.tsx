"use client";
import { useActionState } from "react";
import { salvarDatasProva } from "./actions";

export function DatasProva({ datas, proxima }: { datas: string[]; proxima: string | null }) {
  const [estado, acao, pendente] = useActionState(salvarDatasProva, null);
  const br = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <section className="cartao p-5 space-y-3">
      <div>
        <h2 className="titulo text-lg">Datas da prova (1ª fase)</h2>
        <p className="text-sm text-cinza mt-1">
          Cadastre as datas dos próximos exames, uma por linha. O site usa sempre a <b>próxima que ainda não passou</b>: no dia seguinte a cada prova, a contagem,
          o cronograma, os simulados e a landing passam sozinhos para a data seguinte.
        </p>
      </div>
      <p className="text-sm">
        Data em uso agora: {proxima ? <b className="text-verde">{br(proxima)}</b> : <b className="text-vermelho">nenhuma data futura (a landing mostra &quot;data em breve&quot;)</b>}
      </p>
      <form action={acao} className="space-y-2">
        <textarea name="datas" rows={4} defaultValue={datas.map(br).join("\n")} className="campo font-mono" placeholder={"10/01/2027\n20/06/2027"} />
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-preto btn-pequeno" disabled={pendente}>{pendente ? "Salvando..." : "Salvar datas"}</button>
          {estado?.ok && <span className="text-sm font-semibold text-verde">{estado.ok}</span>}
          {estado?.erro && <span className="text-sm font-semibold text-vermelho">{estado.erro}</span>}
        </div>
      </form>
    </section>
  );
}
