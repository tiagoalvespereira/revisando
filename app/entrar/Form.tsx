"use client";
import Link from "next/link";
import { useActionState } from "react";
import { entrar, type Estado } from "./actions";
import { Mensagem } from "@/components/CaixaAuth";

export function FormEntrar({ volta, aviso }: { volta: string; aviso?: string }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(entrar, aviso ? { erro: aviso } : null);
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="volta" value={volta} />
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="lembrar" defaultChecked className="size-5 accent-preto" /> Lembrar de mim
      </label>
      <Mensagem estado={estado} />
      <button className="btn btn-laranja w-full" disabled={pendente}>{pendente ? "Entrando..." : "Entrar"}</button>
      <p className="text-sm text-center"><Link href="/esqueci" className="underline">Esqueci minha senha</Link></p>
      <p className="text-sm text-center text-cinza">Primeiro acesso? Use o link do e-mail que você recebeu depois da compra, ou clique em &quot;Esqueci minha senha&quot;.</p>
    </form>
  );
}
