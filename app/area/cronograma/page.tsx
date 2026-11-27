import { redirect } from "next/navigation";
import { Cabecalho, Vazio } from "@/components/Cabecalho";
import { alunoAtual, meusProdutos } from "@/lib/aluno";
import { cronogramaDe } from "@/lib/dados";

export const metadata = { title: "Cronograma" };
const ORDEM = ["30-dias", "15-dias", "3-dias"];

export default async function Cronograma() {
  await alunoAtual();
  const meus = (await meusProdutos()).filter((p) => p.tem && cronogramaDe(p.slug)).sort((a, b) => ORDEM.indexOf(a.slug) - ORDEM.indexOf(b.slug));
  if (meus.length) redirect(`/area/produto/${meus[0].slug}?aba=cronograma`);
  return (
    <main>
      <Cabecalho sobretitulo="Cronograma" titulo="Seu plano dia a dia" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Vazio icone="calendario" titulo="Nenhum cronograma liberado" texto="O cronograma interativo vem com as revisões de 30 e de 15 dias." />
      </div>
    </main>
  );
}
