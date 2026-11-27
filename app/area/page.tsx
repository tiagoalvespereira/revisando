import Link from "next/link";
import { Contagem } from "@/components/Contagem";
import { CardProduto, Vitrine } from "@/components/CardProduto";
import { Hexagono } from "@/components/Hexagono";
import { Icone } from "@/components/Icone";
import { alunoAtual, linkCompra, meusProdutos, type Arquivo } from "@/lib/aluno";
import { dataProvaAtual } from "@/lib/provas";
import { cronogramaDe, dataCurta, dataDoDia, dataSimulado, SIMULADOS_DISPONIVEIS, simuladoDados, simuladosLiberados } from "@/lib/dados";
import { cardsDoCronograma, diaDeHoje } from "@/lib/cronograma";

export const metadata = { title: "Início" };

export default async function Painel() {
  const { perfil, supabase } = await alunoAtual();
  const dataProva = await dataProvaAtual();
  const produtos = await meusProdutos();
  const meus = produtos.filter((p) => p.tem);
  const comCronograma = meus.filter((p) => cronogramaDe(p.slug));

  // Tudo em paralelo: uma ida ao banco por tabela
  const [{ data: prog }, { data: feitos }, { data: arqs }, { data: lembrete }] = await Promise.all([
    supabase.from("progress").select("product_slug, dia"),
    supabase.from("simulado_respostas").select("simulado, acertos, created_at").order("created_at", { ascending: false }),
    comCronograma.length
      ? supabase.from("product_files").select("id, product_id, titulo, tipo, dia, ordem, storage_path, atualizado_em").in("product_id", comCronograma.map((p) => p.id))
      : Promise.resolve({ data: [] as Arquivo[] }),
    supabase.from("lembretes").select("ativo").maybeSingle(),
  ]);

  // Vitrine: liberados primeiro (com progresso), depois os bloqueados à venda
  const progressoDe = (slug: string) => {
    const c = cronogramaDe(slug);
    if (!c) return null;
    return Math.round(((prog ?? []).filter((x) => x.product_slug === slug).length / c.dias.length) * 100);
  };
  const vitrine = [
    ...meus.map((p) => ({ ...p, progresso: progressoDe(p.slug) })),
    ...produtos.filter((p) => !p.tem && p.vitrine !== "oculto"),
  ];
  const liberados = simuladosLiberados(meus.map((p) => p.slug));
  const temSimulado = liberados.length > 0;
  const primeiro = perfil.nome?.split(" ")[0];
  const comLink = (p: (typeof produtos)[number]) => ({ ...p, compra: linkCompra(p.checkout_url, perfil.email, perfil.nome) });

  const hoje = comCronograma.map((p) => {
    const c = cronogramaDe(p.slug)!;
    const concl = (prog ?? []).filter((x) => x.product_slug === p.slug).map((x) => x.dia as number);
    const d = diaDeHoje(c.dias.length, concl);
    const cards = cardsDoCronograma(p.slug, ((arqs ?? []) as Arquivo[]).filter((a) => a.product_id === p.id), null, dataProva)?.cards ?? [];
    const card = d ? cards[d - 1] : null;
    const inicio = dataProva ? dataDoDia(dataProva, c.dias.length, 1) : new Date(0);
    return { p, total: c.dias.length, feitos: concl.length, dia: d, card, inicio: dataCurta(inicio), comecou: Boolean(c.sem_datas) || Date.now() >= inicio.getTime() };
  });

  return (
    <main>
      <section className="relative overflow-hidden bg-preto text-off">
        <Hexagono className="absolute -right-20 -top-16 w-80 text-laranja/25" />
        <Hexagono className="absolute right-56 bottom-[-40px] w-28 text-white/10 hidden md:block" />
        <div className="relative max-w-6xl mx-auto px-4 pt-7 pb-9 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-off/70">{primeiro ? `Olá, ${primeiro}.` : "Olá."}</p>
            <h1 className="titulo text-4xl sm:text-5xl mt-1">Sua <span className="text-laranja">revisão</span></h1>
            <p className="text-off/60 text-sm mt-2">3 horas por dia. Só o que cai.</p>
          </div>
          <Contagem data={dataProva} />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-10">
        {hoje.map((h) => (
          <section key={h.p.slug} className="cartao overflow-hidden shadow-[0_18px_40px_-28px_rgba(17,17,17,.6)]">
            <div className="flex">
              <div className="w-2 bg-laranja shrink-0" />
              <div className="flex-1 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="selo bg-laranja text-preto">{h.dia ? "Dia de hoje" : "Concluído"}</span>
                  <span className="text-xs text-cinza font-semibold">{h.p.nome}</span>
                </div>
                {h.dia && h.card ? (
                  <>
                    <p className="titulo text-2xl sm:text-3xl mt-3 leading-tight">
                      <span className="text-laranja">Dia {String(h.dia).padStart(2, "0")}</span> · {h.card.conteudo}
                    </p>
                    <p className="text-sm text-cinza mt-2">{h.card.paginas}</p>
                    {!h.comecou && h.feitos === 0 && (
                      <p className="text-sm mt-2">Para terminar na véspera da prova, o plano começa em <b>{h.inicio}</b>. Pode começar antes.</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-5">
                      {(h.card.pdfDoDia ?? h.card.lerNoVolume) && (
                        <Link href={(h.card.pdfDoDia ?? h.card.lerNoVolume)!} className="btn btn-laranja"><Icone nome="play" className="size-5" /> Estudar agora</Link>
                      )}
                      <Link href={`/area/cronograma?plano=${h.p.slug}#dia-${h.dia}`} className="btn btn-claro"><Icone nome="calendario" className="size-5" /> Cronograma</Link>
                    </div>
                  </>
                ) : (
                  <p className="titulo text-2xl mt-3">Todos os dias concluídos. Boa prova!</p>
                )}
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span>Progresso</span><span className="text-verde">{h.feitos} de {h.total} dias</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-off overflow-hidden"><div className="h-full rounded-full bg-verde transition-all" style={{ width: `${(h.feitos / h.total) * 100}%` }} /></div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {comCronograma.length > 0 && !lembrete?.ativo && (
          <Link href="/area/conta#lembretes" className="cartao cartao-link p-4 sm:p-5 flex items-center gap-4 border-2 border-dashed border-laranja">
            <span className="grid place-items-center size-12 rounded-2xl bg-[#25D366] text-white shrink-0"><Icone nome="relogio" className="size-6" /></span>
            <span className="flex-1">
              <span className="font-bold block">Receba o estudo do dia no WhatsApp e no e-mail</span>
              <span className="text-sm text-cinza">Escolha o horário e receba todo dia o que estudar, com o link direto do material.</span>
            </span>
            <span className="btn btn-laranja btn-pequeno hidden sm:inline-flex">Ativar</span>
          </Link>
        )}

        {temSimulado && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="titulo text-xl">Simulados</h2>
              <Link href="/area/simulados" className="text-sm font-semibold underline underline-offset-4">Ver todos</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SIMULADOS_DISPONIVEIS.map((n) => {
                const s = simuladoDados(n)!;
                const r = (feitos ?? []).find((f) => f.simulado === n);
                const liberado = liberados.includes(n);
                return (
                  <Link key={n} href={`/area/simulado/${n}`} className="cartao cartao-link p-5 flex gap-4 items-center">
                    <span className={`relative shrink-0 size-14 rounded-2xl grid place-items-center titulo text-lg ${liberado ? "bg-preto text-laranja" : "bg-preto/80 text-off/50"}`}>
                      S{n}
                      <span className={`absolute -right-1.5 -bottom-1.5 grid place-items-center size-7 rounded-full ring-[3px] ring-white text-white ${liberado ? "bg-verde" : "bg-vermelho"}`}><Icone nome={liberado ? "cadeado-aberto" : "cadeado"} className="size-3.5" /></span>
                    </span>
                    <span className="flex-1">
                      <span className="titulo text-base block">Simulado Estratégico {n}</span>
                      <span className="text-sm text-cinza">
                        {!liberado ? <span className="text-vermelho font-semibold">Disponível na revisão de 30 dias</span> : r ? <>Último resultado: <b className={r.acertos >= s.margem ? "text-verde" : r.acertos >= s.meta ? "text-laranja" : "text-vermelho"}>{r.acertos}/80</b></> : `Fazer em ${(dataProva ? dataCurta(dataSimulado(dataProva, s.dias_antes_da_prova)) : "data a definir")} · ${s.dias_antes_da_prova} dias antes`}
                      </span>
                    </span>
                    <Icone nome="seta" className="size-5 text-cinza" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="titulo text-xl">Seus materiais</h2>
              <p className="text-sm text-cinza mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5"><span className="grid place-items-center size-5 rounded-full bg-verde text-white"><Icone nome="cadeado-aberto" className="size-3" /></span> liberado</span>
                <span className="inline-flex items-center gap-1.5"><span className="grid place-items-center size-5 rounded-full bg-vermelho text-white"><Icone nome="cadeado" className="size-3" /></span> bloqueado</span>
              </p>
            </div>
            <Link href="/area/materiais" className="text-sm font-semibold underline underline-offset-4 shrink-0">Ver todos</Link>
          </div>
          <Vitrine>
            {vitrine.map((p) => <CardProduto key={p.id} p={comLink(p)} />)}
          </Vitrine>
          {!meus.length && (
            <p className="text-sm text-cinza mt-3 flex items-center gap-2"><Icone nome="relogio" className="size-4 text-laranja" /> Acabou de comprar? A liberação acontece em poucos minutos depois da confirmação do pagamento.</p>
          )}
        </section>
      </div>
    </main>
  );
}
