import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { CardProduto } from "@/components/CardProduto";
import { Icone } from "@/components/Icone";
import { alunoAtual, linkCompra, meusProdutos } from "@/lib/aluno";
import { dataCurta, dataSimulado, PRODUTOS_COM_SIMULADO, SIMULADOS_DISPONIVEIS, simuladoDados } from "@/lib/dados";
import { env } from "@/lib/env";

export const metadata = { title: "Simulados" };

export default async function Simulados() {
  const { supabase, perfil } = await alunoAtual();
  const produtos = await meusProdutos();
  const tem = produtos.some((p) => p.tem && PRODUTOS_COM_SIMULADO.includes(p.slug));
  const { data: feitos } = tem ? await supabase.from("simulado_respostas").select("simulado, acertos, created_at").order("created_at", { ascending: false }) : { data: [] };
  const oferta = produtos.find((p) => p.slug === "30-dias") ?? produtos.find((p) => p.slug === "15-dias");

  return (
    <main>
      <Cabecalho sobretitulo="Simulados" titulo="Teste antes da prova">
        <p className="text-off/60 text-sm mt-2">80 questões no formato da 1ª fase. Marque suas respostas e veja onde revisar.</p>
      </Cabecalho>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {!tem && oferta && (
          <>
            <p className="text-cinza">Os simulados fazem parte das revisões de 30 e de 15 dias.</p>
            <CardProduto p={{ ...oferta, compra: linkCompra(oferta.checkout_url, perfil.email, perfil.nome) }} />
          </>
        )}
        {tem && SIMULADOS_DISPONIVEIS.map((n) => {
          const s = simuladoDados(n)!;
          const hist = (feitos ?? []).filter((f) => f.simulado === n);
          const r = hist[0];
          return (
            <Link key={n} href={`/area/simulado/${n}`} className="cartao cartao-link p-5 sm:p-6 flex flex-wrap gap-5 items-center">
              <span className="shrink-0 size-16 rounded-2xl bg-preto text-laranja grid place-items-center titulo text-2xl">S{n}</span>
              <span className="flex-1 min-w-48">
                <span className="titulo text-lg block">Simulado Estratégico {n}</span>
                <span className="text-sm text-cinza block mt-1">Para fazer {s.dias_antes_da_prova} dias antes da prova: <b className="text-preto">{dataCurta(dataSimulado(env.dataProva, s.dias_antes_da_prova))}</b></span>
                {hist.length > 1 && <span className="text-xs text-cinza block mt-1">{hist.length} tentativas</span>}
              </span>
              {r ? (
                <span className="text-right">
                  <span className={`titulo text-3xl ${r.acertos >= s.margem ? "text-verde" : r.acertos >= s.meta ? "text-laranja" : "text-vermelho"}`}>{r.acertos}</span>
                  <span className="text-cinza">/80</span>
                  <span className="block text-xs text-cinza">último resultado</span>
                </span>
              ) : (
                <span className="btn btn-laranja btn-pequeno"><Icone nome="play" className="size-4" /> Começar</span>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
