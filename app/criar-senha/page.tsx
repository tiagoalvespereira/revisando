"use client";
import { useActionState } from "react";
import { definirSenha, type Estado } from "../entrar/actions";
import { CaixaAuth, Mensagem } from "@/components/CaixaAuth";

export default function CriarSenha() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(definirSenha, null);
  return (
    <CaixaAuth titulo="Crie sua senha">
      <form action={acao} className="space-y-4">
        <p className="text-cinza">Use pelo menos 8 caracteres. Você vai usar esta senha junto com seu e-mail para entrar.</p>
        <div>
          <label htmlFor="senha" className="rotulo">Nova senha</label>
          <input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required className="campo" />
        </div>
        <div>
          <label htmlFor="confirma" className="rotulo">Repita a senha</label>
          <input id="confirma" name="confirma" type="password" autoComplete="new-password" minLength={8} required className="campo" />
        </div>
        <Mensagem estado={estado} />
        <button className="btn btn-laranja btn-bloco" disabled={pendente}>{pendente ? "Salvando..." : "Salvar e entrar"}</button>
      </form>
    </CaixaAuth>
  );
}
