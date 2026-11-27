import Link from "next/link";
import { notFound } from "next/navigation";
import { alunoAtual, meusProdutos, type Arquivo } from "@/lib/aluno";
import { dataCurta, dataSimulado, paginaArquivo, simuladoDados, simuladosLiberados } from "@/lib/dados";
import { dataProvaAtual } from "@/lib/provas";
import { SimuladoInterativo } from "@/components/SimuladoInterativo";
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
  const dataProva = await dataProvaAtual();
  const produtos = await meusProdutos();
  const slugs = produtos.filter((p) => p.tem).map((p) => p.slug);
  const liberados = simuladosLiberados(slugs);
  // Plano usado para "onde revisar": o de 30 dias, se tiver; senão o de 15.
  const meu = produtos.find((p) => p.slug === "30-dias" && p.tem) ?? produtos.find((p) => p.slug === "15-dias" && p.tem);
  if (!liberados.includes(n) || !meu) {
    const oferta = produtos.find((p) => p.slug === "30-dias");
    return (
      <main>
        <Cabecalho sobretitulo="Simulado bloqueado" titulo={`Simulado Estratégico ${n}`} voltar={{ href: "/area/simulados", rotulo: "Simulados" }} />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
          <div className="cartao p-5 flex gap-4 items-start">
            <span className="shrink-0 grid place-items-center size-12 rounded-full bg-vermelho text-white"><Icone nome="cadeado" className="size-6" /></span>
            <p className="text-cinza">
              {liberados.length
                ? <>O <b className="text-preto">Simulado {n}</b> faz parte da <b className="text-preto">Revisão estratégica de 30 dias</b>. Com ela, você libera os dois simulados.</>
                : <>Os simulados fazem parte das revisões. A <b className="text-preto">Revisão estratégica de 30 dias</b> libera os dois; a de 15 dias libera o Simulado 2.</>}
            </p>
          </div>
          {oferta && !oferta.tem && <div className="max-w-[240px]"><CardProduto p={{ ...oferta, compra: linkCompra(oferta.checkout_url, perfil.email, perfil.nome) }} /></div>}
        </div>
      </main>
    );
  }

  const [{ data: ultimo }, { data: arquivos }, { data: pdfs }] = await Promise.all([
    supabase.from("simulado_respostas").select("acertos, por_materia, created_at").eq("user_id", user.id).eq("simulado", n).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("product_files").select("id, tipo, storage_path, product_id").eq("product_id", meu.id).in("tipo", ["volume", "caderno"]),
    supabase.from("product_files").select("id").eq("simulado", n).limit(1),
  ]);
  const pdfSimulado = pdfs?.[0] ?? null;
  const principal = (arquivos as Arquivo[] | null)?.find((a) => a.tipo === "volume" || a.tipo === "caderno");
  const quando = (dataProva ? dataCurta(dataSimulado(dataProva, s.dias_antes_da_prova)) : "data a definir");
  const mostrarResultado = ultimo && refazer !== "1";

  if (!mostrarResultado) {
    // Modo de resolver: barra compacta + PDF e gabarito ocupando a tela
    return (
      <main>
        <div className="bg-preto text-off border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center gap-3">
            <Link href="/area/simulados" aria-label="Voltar para simulados" className="btn btn-fantasma btn-icone text-off"><Icone nome="voltar" className="size-5" /></Link>
            <p className="titulo text-sm sm:text-base flex-1 truncate">Simulado Estratégico {n} <span className="text-laranja">· 80 questões</span></p>
            {s.exemplo && <span className="selo bg-vermelho text-white" title="A correção ainda não usa o gabarito oficial">Gabarito de exemplo</span>}
            <span className="hidden sm:inline text-xs text-off/60">fazer em {quando}</span>
          </div>
        </div>
        <SimuladoInterativo n={n} materias={s.materias.map((m) => ({ materia: m.materia, questoes: m.questoes }))} arquivoId={pdfSimulado?.id ?? null} />
      </main>
    );
  }

  return (
    <main>
      <Cabecalho sobretitulo={`Resultado · fazer em ${quando}`} titulo={`Simulado Estratégico ${n}`} voltar={{ href: "/area/simulados", rotulo: "Simulados" }}>
        {pdfSimulado && <Link href={`/area/ler/${pdfSimulado.id}`} className="btn btn-claro btn-pequeno mt-4"><Icone nome="olho" className="size-4" /> Gabarito comentado no PDF</Link>}
      </Cabecalho>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {s.exemplo && <AvisoExemplo>Gabarito de exemplo: a correção ainda não usa o gabarito oficial do simulado.</AvisoExemplo>}
        <Resultado acertos={ultimo.acertos} porMateria={ultimo.por_materia as PorMateria} quando={ultimo.created_at} n={n}
          meta={s.meta} margem={s.margem} materias={s.materias} slug={meu.slug} volumeId={principal?.id ?? null} />
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

  const aprovado = acertos >= meta;
  return (
    <div className="space-y-6">
      <section className={`rounded-[18px] p-6 text-center ${aprovado ? "bg-verde text-white" : "bg-vermelho text-white"}`}>
        <span className="mx-auto grid place-items-center size-16 rounded-full bg-white/15 mb-3">
          <Icone nome={aprovado ? "trofeu" : "livro"} className="size-8" />
        </span>
        <p className="text-sm font-bold uppercase tracking-widest opacity-85">Nota prevista: {acertos} de 80 ({Math.round((acertos / 80) * 100)}%)</p>
        <p className="titulo text-3xl sm:text-4xl mt-2">{aprovado ? "Aprovado no simulado!" : "Reprovado no simulado"}</p>
        <p className="mt-2 text-white/90">
          {aprovado
            ? acertos >= margem
              ? "Você passou da margem de segurança. Continue revisando para chegar firme na prova."
              : `Você passou dos ${meta} acertos. Agora mire a margem de segurança de ${margem}.`
            : `Faltaram ${meta - acertos} acertos para os ${meta}. Vamos estudar mais! Comece pelas matérias abaixo.`}
        </p>
      </section>
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
