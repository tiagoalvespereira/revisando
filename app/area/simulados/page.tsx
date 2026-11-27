import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { CardProduto } from "@/components/CardProduto";
import { Icone } from "@/components/Icone";
import { alunoAtual, linkCompra, meusProdutos } from "@/lib/aluno";
import { dataCurta, dataSimulado, SIMULADOS_DISPONIVEIS, simuladoDados, simuladosLiberados } from "@/lib/dados";
import { dataProvaAtual } from "@/lib/provas";

export const metadata = { title: "Simulados" };

export default async function Simulados() {
  const { supabase, perfil } = await alunoAtual();
  const dataProva = await dataProvaAtual();
  const produtos = await meusProdutos();
  const liberados = simuladosLiberados(produtos.filter((p) => p.tem).map((p) => p.slug));
  const { data: feitos } = liberados.length
    ? await supabase.from("simulado_respostas").select("simulado, acertos, created_at").order("created_at", { ascending: false })
    : { data: [] };
  const oferta30 = produtos.find((p) => p.slug === "30-dias");

  return (
    <main>
      <Cabecalho sobretitulo="Simulados Estratégicos" titulo="Teste antes da prova">
        <p className="text-off/60 text-sm mt-2">80 questões no formato da 1ª fase. Resolva no PDF, marque o gabarito ao lado e veja onde revisar.</p>
      </Cabecalho>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {SIMULADOS_DISPONIVEIS.map((n) => {
          const s = simuladoDados(n)!;
          const liberado = liberados.includes(n);
          const hist = (feitos ?? []).filter((f) => f.simulado === n);
          const r = hist[0];
          const quando = (dataProva ? dataCurta(dataSimulado(dataProva, s.dias_antes_da_prova)) : "data a definir");
          const corpo = (
            <>
              <span className={`relative shrink-0 size-16 rounded-2xl grid place-items-center titulo text-2xl ${liberado ? "bg-preto text-laranja" : "bg-preto/80 text-off/50"}`}>
                S{n}
                <span className={`absolute -right-2 -bottom-2 grid place-items-center size-8 rounded-full ring-4 ring-white text-white ${liberado ? "bg-verde" : "bg-vermelho"}`}>
                  <Icone nome={liberado ? "cadeado-aberto" : "cadeado"} className="size-4" />
                </span>
              </span>
              <span className="flex-1 min-w-48">
                <span className="titulo text-lg block">Simulado Estratégico {n}</span>
                <span className="text-sm text-cinza block mt-1">Para fazer {s.dias_antes_da_prova} dias antes da prova: <b className="text-preto">{quando}</b></span>
                {!liberado && <span className="text-sm text-vermelho font-semibold block mt-1">Disponível na Revisão estratégica de 30 dias</span>}
                {hist.length > 1 && <span className="text-xs text-cinza block mt-1">{hist.length} tentativas</span>}
              </span>
              {liberado ? (
                r ? (
                  <span className="text-right">
                    <span className={`titulo text-3xl ${r.acertos >= s.meta ? "text-verde" : "text-vermelho"}`}>{r.acertos}</span>
                    <span className="text-cinza">/80</span>
                    <span className={`block text-xs font-bold ${r.acertos >= s.meta ? "text-verde" : "text-vermelho"}`}>{r.acertos >= s.meta ? "aprovado no simulado" : "reprovado no simulado"}</span>
                  </span>
                ) : (
                  <span className="btn btn-laranja btn-pequeno"><Icone nome="play" className="size-4" /> Começar</span>
                )
              ) : (
                <span className="btn btn-pequeno bg-vermelho text-white"><Icone nome="cadeado" className="size-4" /> Bloqueado</span>
              )}
            </>
          );
          return (
            <div key={n} className={`cartao p-5 sm:p-6 ${liberado ? "" : "bg-[#fbf9f5]"}`}>
              <Link href={`/area/simulado/${n}`} className="flex flex-wrap gap-5 items-center">
                {corpo}
              </Link>
              {liberado && r && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-linha">
                  <Link href={`/area/simulado/${n}`} className="btn btn-claro btn-pequeno"><Icone nome="olho" className="size-4" /> Ver resultado</Link>
                  <Link href={`/area/simulado/${n}?refazer=1`} className="btn btn-preto btn-pequeno"><Icone nome="voltar" className="size-4" /> Refazer simulado</Link>
                </div>
              )}
            </div>
          );
        })}

        {liberados.length < 2 && oferta30 && !oferta30.tem && (
          <section className="pt-4">
            <p className="text-sm text-cinza mb-3">Libere {liberados.length ? "o Simulado 1" : "os dois simulados"} com a revisão completa:</p>
            <div className="max-w-[240px]"><CardProduto p={{ ...oferta30, compra: linkCompra(oferta30.checkout_url, perfil.email, perfil.nome) }} /></div>
          </section>
        )}
      </div>
    </main>
  );
}
