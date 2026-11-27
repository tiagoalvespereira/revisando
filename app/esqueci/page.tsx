"use client";
import Link from "next/link";
import { useActionState } from "react";
import { pedirNovaSenha, type Estado } from "../entrar/actions";
import { CaixaAuth, Mensagem } from "@/components/CaixaAuth";

export default function Esqueci() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(pedirNovaSenha, null);
  return (
    <CaixaAuth titulo="Nova senha">
      <form action={acao} className="space-y-4">
        <p className="text-cinza">Informe o e-mail usado na compra. Vamos enviar um link para você criar uma nova senha.</p>
        <div>
          <label htmlFor="email" className="rotulo">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="campo" />
        </div>
        <Mensagem estado={estado} />
        <button className="btn btn-laranja w-full" disabled={pendente}>{pendente ? "Enviando..." : "Enviar link"}</button>
        <p className="text-sm text-center"><Link href="/entrar" className="underline">Voltar para o login</Link></p>
      </form>
    </CaixaAuth>
  );
}
