import { Contagem } from "@/components/Contagem";
import { CardProduto } from "@/components/CardProduto";
import { alunoAtual, linkCompra, meusProdutos } from "@/lib/aluno";
import { env } from "@/lib/env";
import Link from "next/link";
import { cronogramaDe, dataCurta, dataDoDia, dataSimulado, PRODUTOS_COM_SIMULADO, SIMULADOS_DISPONIVEIS, simuladoDados } from "@/lib/dados";
import { diaDeHoje } from "@/lib/cronograma";
import { Icone } from "@/components/Icone";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const { perfil, supabase } = await alunoAtual();
  const produtos = await meusProdutos();
  const { data: prog } = await supabase.from("progress").select("product_slug, dia");
  const { data: feitos } = await supabase.from("simulado_respostas").select("simulado, acertos, created_at").order("created_at", { ascending: false });
  const temSimulado = produtos.some((p) => p.tem && PRODUTOS_COM_SIMULADO.includes(p.slug));
  const hoje = produtos.filter((p) => p.tem).flatMap((p) => {
    const c = cronogramaDe(p.slug);
    if (!c) return [];
    const concl = (prog ?? []).filter((x) => x.product_slug === p.slug).map((x) => x.dia as number);
    const d = diaDeHoje(c.dias.length, concl);
    const info = d ? c.dias[d - 1] : null;
    const inicio = dataDoDia(env.dataProva, c.dias.length, 1);
    return [{ slug: p.slug, nome: p.nome, total: c.dias.length, feitos: concl.length, dia: d, conteudo: info?.conteudo ?? null, inicio: dataCurta(inicio), comecou: Date.now() >= inicio.getTime() }];
  });
  const meus = produtos.filter((p) => p.tem);
  const bloqueados = produtos.filter((p) => !p.tem && p.vitrine !== "oculto");
  const primeiro = perfil.nome?.split(" ")[0];
  const comLink = (p: (typeof produtos)[number]) => ({ ...p, compra: linkCompra(p.checkout_url, perfil.email, perfil.nome) });

  return (
    <main>
      <section className="bg-preto text-off">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-off/70">{primeiro ? `Olá, ${primeiro}.` : "Olá."}</p>
            <h1 className="titulo text-3xl mt-1">Sua revisão</h1>
          </div>
          <Contagem data={env.dataProva} />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {hoje.map((h) => (
          <section key={h.slug} className="cartao p-5 border-2 border-laranja">
            <p className="text-xs font-bold uppercase tracking-widest text-laranja">{h.dia ? "Dia de hoje" : "Cronograma concluído"} · {h.nome}</p>
            {h.dia ? (
              <>
                <p className="titulo text-2xl mt-2">Dia {String(h.dia).padStart(2, "0")}: {h.conteudo}</p>
                {!h.comecou && h.feitos === 0 && <p className="text-sm text-cinza mt-1">Para terminar na véspera da prova, o plano começa em {h.inicio}. Se quiser, comece antes.</p>}
              </>
            ) : <p className="titulo text-2xl mt-2">Todos os dias concluídos</p>}
            <div className="mt-3 h-2.5 rounded-full bg-linha overflow-hidden"><div className="h-full bg-verde" style={{ width: `${(h.feitos / h.total) * 100}%` }} /></div>
            <p className="text-xs text-cinza mt-1">{h.feitos} de {h.total} dias concluídos</p>
            <Link href={`/area/produto/${h.slug}${h.dia ? `#dia-${h.dia}` : ""}`} className="btn btn-laranja mt-4">{h.dia ? "Estudar agora" : "Ver cronograma"} <Icone nome="seta" className="size-5" /></Link>
          </section>
        ))}

        {temSimulado && (
          <section>
            <h2 className="titulo text-lg mb-4">Simulados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SIMULADOS_DISPONIVEIS.map((n) => {
                const s = simuladoDados(n)!;
                const r = (feitos ?? []).find((f) => f.simulado === n);
                return (
                  <Link key={n} href={`/area/simulado/${n}`} className="cartao p-5 flex gap-4 items-center hover:border-preto">
                    <span className="shrink-0 size-12 rounded-xl bg-preto text-laranja grid place-items-center titulo">S{n}</span>
                    <span className="flex-1">
                      <span className="titulo text-base block">Simulado Estratégico {n}</span>
                      <span className="text-sm text-cinza">{r ? <>Último resultado: <b className={r.acertos >= s.margem ? "text-verde" : r.acertos >= s.meta ? "text-laranja" : "text-vermelho"}>{r.acertos}/80</b></> : `Fazer em ${dataCurta(dataSimulado(env.dataProva, s.dias_antes_da_prova))} (${s.dias_antes_da_prova} dias antes)`}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="titulo text-lg mb-4">Meus materiais</h2>
          {meus.length ? (
            <div className="grid gap-3 sm:grid-cols-2">{meus.map((p) => <CardProduto key={p.id} p={comLink(p)} />)}</div>
          ) : (
            <p className="cartao p-5 text-cinza">Nenhum material liberado ainda. Se você acabou de comprar, a liberação leva alguns minutos depois da confirmação do pagamento.</p>
          )}
        </section>

        {bloqueados.length > 0 && (
          <section>
            <h2 className="titulo text-lg mb-1">Desbloqueie mais</h2>
            <p className="text-sm text-cinza mb-4">Materiais que você ainda não tem. Ao comprar, eles aparecem aqui no mesmo login.</p>
            <div className="grid gap-3 sm:grid-cols-2">{bloqueados.map((p) => <CardProduto key={p.id} p={comLink(p)} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}
