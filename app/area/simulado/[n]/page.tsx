import Link from "next/link";
import { notFound } from "next/navigation";
import { alunoAtual, meusProdutos, type Arquivo } from "@/lib/aluno";
import { dataCurta, dataSimulado, paginaArquivo, PRODUTOS_COM_SIMULADO, simuladoDados } from "@/lib/dados";
import { env } from "@/lib/env";
import { CartaoResposta } from "@/components/CartaoResposta";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { CardProduto } from "@/components/CardProduto";
import { linkCompra } from "@/lib/aluno";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";

export const metadata = { title: "Simulado" };

type PorMateria = Record<string, { acertos: number; total: number }>;

export default async function PaginaSimulado({ params, searchParams }: { params: Promise<{ n: string }>; searchParams: Promise<{ refazer?: string }> }) {
  const { n: nStr } = await params;
  const { refazer } = await searchParams;
  const n = Number(nStr);
  const s = simuladoDados(n);
  if (!s) notFound();

  const { supabase, user, perfil } = await alunoAtual();
  const produtos = await meusProdutos();
  const meu = PRODUTOS_COM_SIMULADO.map((slug) => produtos.find((p) => p.slug === slug && p.tem)).find(Boolean);
  if (!meu) {
    const oferta = produtos.find((p) => p.slug === "15-dias") ?? produtos.find((p) => p.slug === "30-dias");
    return (
      <main className="max-w-xl mx-auto px-4 py-10 space-y-4">
        <h1 className="titulo text-2xl">Simulado Estratégico {n}</h1>
        <p className="text-cinza">Os simulados fazem parte das revisões de 30 e de 15 dias.</p>
        {oferta && <CardProduto p={{ ...oferta, compra: linkCompra(oferta.checkout_url, perfil.email, perfil.nome) }} />}
      </main>
    );
  }

  const [{ data: ultimo }, { data: arquivos }] = await Promise.all([
    supabase.from("simulado_respostas").select("acertos, por_materia, created_at").eq("user_id", user.id).eq("simulado", n).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("product_files").select("id, tipo, storage_path, product_id").eq("product_id", meu.id),
  ]);
  const principal = (arquivos as Arquivo[] | null)?.find((a) => a.tipo === "volume" || a.tipo === "caderno");
  const pdfSimulado = (arquivos as Arquivo[] | null)?.find((a) => a.tipo === "simulado" && a.storage_path.includes(`simulado-${n}`));
  const quando = dataCurta(dataSimulado(env.dataProva, s.dias_antes_da_prova));
  const mostrarResultado = ultimo && refazer !== "1";

  return (
    <main>
      <Cabecalho sobretitulo={`80 questões · fazer em ${quando}`} titulo={`Simulado Estratégico ${n}`} voltar={{ href: "/area/simulados", rotulo: "Simulados" }}>
        <p className="text-off/60 text-sm mt-2">Resolva no PDF, sem consulta, e marque aqui suas respostas.</p>
        {pdfSimulado && <Link href={`/area/ler/${pdfSimulado.id}`} className="btn btn-claro btn-pequeno mt-4"><Icone nome="olho" className="size-4" /> Abrir o PDF do simulado</Link>}
      </Cabecalho>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {s.exemplo && <AvisoExemplo>Gabarito de exemplo: a correção ainda não usa o gabarito oficial do simulado.</AvisoExemplo>}

      {mostrarResultado ? (
        <Resultado acertos={ultimo.acertos} porMateria={ultimo.por_materia as PorMateria} quando={ultimo.created_at} n={n}
          meta={s.meta} margem={s.margem} materias={s.materias} slug={meu.slug} volumeId={principal?.id ?? null} />
      ) : (
        <CartaoResposta n={n} materias={s.materias.map((m) => ({ materia: m.materia, questoes: m.questoes }))} />
      )}
      </div>
    </main>
  );
}

function Resultado(props: {
  acertos: number; porMateria: PorMateria; quando: string; n: number; meta: number; margem: number;
  materias: { materia: string; onde_revisar: Record<string, { dia: number; pagina: number }[]> }[]; slug: string; volumeId: string | null;
}) {
  const { acertos, porMateria, meta, margem } = props;
  const pct = (v: number) => `${(v / 80) * 100}%`;
  const status = acertos >= margem
    ? { cor: "text-verde", texto: "Na margem de segurança. Mantenha o ritmo e revise os pontos fracos." }
    : acertos >= meta
      ? { cor: "text-laranja", texto: `Acima da meta de ${meta}, mas abaixo da margem de ${margem}. Foque nas matérias em vermelho.` }
      : { cor: "text-vermelho", texto: `Abaixo da meta de ${meta}. Use a lista abaixo para decidir o que revisar primeiro.` };
  const fracas = props.materias.filter((m) => { const r = porMateria[m.materia]; return r && r.acertos < r.total / 2; });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-preto text-off rounded-[18px] p-6">
        <p className="text-xs uppercase tracking-widest text-off/70">Resultado de {new Date(props.quando).toLocaleDateString("pt-BR")}</p>
        <p className="titulo text-6xl mt-2"><span className={status.cor}>{acertos}</span><span className="text-2xl text-off/60">/80</span></p>
        <div className="relative h-4 rounded-full bg-[#2a2a2a] mt-5">
          <div className="h-full rounded-full bg-off/80" style={{ width: pct(acertos) }} />
          <span className="absolute -top-1 h-6 w-0.5 bg-laranja" style={{ left: pct(meta) }} />
          <span className="absolute -top-1 h-6 w-0.5 bg-verde" style={{ left: pct(margem) }} />
        </div>
        <div className="relative h-5 text-xs mt-1">
          <span className="absolute -translate-x-1/2 text-laranja" style={{ left: pct(meta) }}>meta {meta}</span>
          <span className="absolute -translate-x-1/2 text-verde" style={{ left: pct(margem) }}>{margem}</span>
        </div>
        <p className="mt-3 text-sm">{status.texto}</p>
      </section>

      {fracas.length > 0 && (
        <section>
          <h2 className="titulo text-lg mb-3">O que revisar</h2>
          <ul className="space-y-2">
            {fracas.map((m) => {
              const r = porMateria[m.materia];
              const onde = m.onde_revisar[props.slug] ?? [];
              return (
                <li key={m.materia} className="cartao p-4 border-l-4 border-l-vermelho">
                  <p className="font-bold">{m.materia} <span className="text-vermelho">{r.acertos}/{r.total}</span></p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {onde.map((o) => props.volumeId ? (
                      <Link key={o.dia} href={`/area/ler/${props.volumeId}?pagina=${paginaArquivo(o.pagina)}`} className="btn btn-contorno btn-pequeno">Dia {o.dia} · pág. {o.pagina}</Link>
                    ) : <span key={o.dia} className="text-sm">Dia {o.dia}, pág. {o.pagina}</span>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="titulo text-lg mb-3">Acertos por matéria</h2>
        <ul className="cartao divide-y divide-linha">
          {props.materias.map((m) => {
            const r = porMateria[m.materia] ?? { acertos: 0, total: 0 };
            const fraca = r.acertos < r.total / 2;
            return (
              <li key={m.materia} className="p-3 flex items-center gap-3 text-sm">
                <span className="flex-1">{m.materia}</span>
                <span className="w-24 h-2 rounded-full bg-linha overflow-hidden"><span className={`block h-full ${fraca ? "bg-vermelho" : "bg-verde"}`} style={{ width: `${r.total ? (r.acertos / r.total) * 100 : 0}%` }} /></span>
                <b className={`w-12 text-right ${fraca ? "text-vermelho" : "text-verde"}`}>{r.acertos}/{r.total}</b>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-cinza mt-2">O gabarito comentado está no PDF do simulado.</p>
      </section>

      <Link href={`/area/simulado/${props.n}?refazer=1`} className="btn btn-claro">Refazer o simulado</Link>
    </div>
  );
}
