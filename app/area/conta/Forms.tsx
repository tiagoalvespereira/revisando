"use client";
import { useActionState } from "react";
import { salvarDados, trocarSenha, type Estado } from "./actions";
import { Mensagem } from "@/components/CaixaAuth";

type Perfil = { nome: string | null; email: string; cpf: string | null; telefone: string | null };

export function FormDados({ perfil }: { perfil: Perfil }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarDados, null);
  return (
    <form action={acao} className="cartao p-5 space-y-4">
      <h2 className="titulo text-lg">Meus dados</h2>
      <div><label className="rotulo" htmlFor="nome">Nome</label><input id="nome" name="nome" defaultValue={perfil.nome ?? ""} className="campo" autoComplete="name" /></div>
      <div><label className="rotulo" htmlFor="em">E-mail</label><input id="em" value={perfil.email} disabled className="campo opacity-70" /></div>
      <div><label className="rotulo" htmlFor="cpf">CPF</label><input id="cpf" name="cpf" defaultValue={perfil.cpf ?? ""} inputMode="numeric" className="campo" /></div>
      <div><label className="rotulo" htmlFor="tel">Telefone</label><input id="tel" name="telefone" defaultValue={perfil.telefone ?? ""} inputMode="tel" className="campo" autoComplete="tel" /></div>
      <Mensagem estado={estado} />
      <button className="btn btn-preto" disabled={pendente}>Salvar</button>
    </form>
  );
}

export function FormSenha() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(trocarSenha, null);
  return (
    <form action={acao} className="cartao p-5 space-y-4">
      <h2 className="titulo text-lg">Trocar senha</h2>
      <div><label className="rotulo" htmlFor="atual">Senha atual</label><input id="atual" name="atual" type="password" autoComplete="current-password" required className="campo" /></div>
      <div><label className="rotulo" htmlFor="nova">Nova senha</label><input id="nova" name="nova" type="password" autoComplete="new-password" minLength={8} required className="campo" /></div>
      <Mensagem estado={estado} />
      <button className="btn btn-preto" disabled={pendente}>Trocar senha</button>
    </form>
  );
}
