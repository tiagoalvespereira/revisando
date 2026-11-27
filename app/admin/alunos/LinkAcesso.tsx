"use client";
import { useState, useTransition } from "react";
import { gerarLinkAcesso } from "../actions";
import { Icone } from "@/components/Icone";

/** Gera o link de acesso do aluno e permite copiar ou enviar pelo WhatsApp. */
export function LinkAcesso({ userId }: { userId: string }) {
  const [res, setRes] = useState<Awaited<ReturnType<typeof gerarLinkAcesso>> | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  const zap = res && "link" in res && res.telefone
    ? `https://wa.me/${res.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(
        `Olá${res.nome ? `, ${res.nome.split(" ")[0]}` : ""}! Aqui é do Revisando. Use este link para criar sua senha e entrar na área do aluno (vale por 24 horas e só funciona uma vez):\n${res.link}`)}`
    : null;

  return (
    <div className="cartao p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-52">
          <p className="font-bold">Link de acesso</p>
          <p className="text-sm text-cinza">Link para o aluno criar a senha e entrar. Vale por 24 horas e só funciona uma vez.</p>
        </div>
        <button type="button" disabled={pendente} onClick={() => iniciar(async () => { setCopiado(false); setRes(await gerarLinkAcesso(userId)); })} className="btn btn-preto btn-pequeno">
          <Icone nome="cadeado-aberto" className="size-4" /> {pendente ? "Gerando..." : "Gerar link"}
        </button>
      </div>
      {res && "erro" in res && <p className="text-vermelho text-sm font-semibold">{res.erro}</p>}
      {res && "link" in res && (
        <>
          <input readOnly value={res.link} className="campo text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-laranja btn-pequeno" onClick={async () => { await navigator.clipboard.writeText(res.link); setCopiado(true); }}>
              <Icone nome="check" className="size-4" /> {copiado ? "Copiado" : "Copiar link"}
            </button>
            {zap && <a href={zap} target="_blank" rel="noopener" className="btn btn-verde btn-pequeno">Enviar no WhatsApp</a>}
          </div>
          <p className="text-xs text-cinza">Para ver como o aluno, abra o link numa <b>janela anônima</b> (Ctrl+Shift+N). Na janela normal você está logado como administrador.</p>
        </>
      )}
    </div>
  );
}
