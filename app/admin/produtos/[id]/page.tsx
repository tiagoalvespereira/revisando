import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin, dataBR } from "@/lib/admin";
import { ICONES } from "@/components/Icone";
import { adicionarArquivo, removerArquivo, salvarProduto } from "../../actions";
import { Envio } from "../Envio";

export const dynamic = "force-dynamic";

const TIPOS = ["volume", "dia", "caderno", "simulado", "cronograma", "isca"];

export default async function Produto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const { db } = await exigirAdmin();
  const novo = id === "novo";
  let p: Record<string, unknown> | null = null;
  let arquivos: { id: string; titulo: string; tipo: string; dia: number | null; ordem: number; storage_path: string; atualizado_em: string }[] = [];
  let enviados = new Set<string>();
  if (!novo) {
    const { data } = await db.from("products").select("*, kiwify_products(kiwify_product_id)").eq("id", id).maybeSingle();
    if (!data) notFound();
    p = data;
    const { data: fs } = await db.from("product_files").select("*").eq("product_id", id).order("ordem");
    arquivos = fs ?? [];
    // Quais arquivos já existem no storage
    const pastas = [...new Set(arquivos.map((a) => a.storage_path.split("/").slice(0, -1).join("/")))];
    for (const pasta of pastas) {
      const { data: lista } = await db.storage.from("materiais").list(pasta, { limit: 1000 });
      (lista ?? []).forEach((o) => enviados.add(`${pasta}/${o.name}`));
    }
  }
  const v = (k: string) => (p?.[k] as string | number | null | undefined) ?? "";
  const kiwify = ((p?.kiwify_products as { kiwify_product_id: string }[] | undefined) ?? []).map((k) => k.kiwify_product_id).join("\n");

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/admin/produtos" className="text-sm text-cinza">← Produtos</Link>
      <h1 className="titulo text-2xl">{novo ? "Novo produto" : String(v("nome"))}</h1>
      {salvo && <p className="text-verde font-semibold text-sm">Salvo.</p>}

      <form action={salvarProduto} className="cartao p-5 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={novo ? "" : id} />
        {novo && <div className="sm:col-span-2"><label className="rotulo">Slug (endereço, sem espaços)</label><input name="slug" required className="campo" placeholder="ex.: recursos-2027" /></div>}
        <div className="sm:col-span-2"><label className="rotulo">Nome</label><input name="nome" required defaultValue={v("nome")} className="campo" /></div>
        <div className="sm:col-span-2"><label className="rotulo">Descrição (aparece no card)</label><input name="descricao" defaultValue={v("descricao")} className="campo" /></div>
        <div><label className="rotulo">Preço (R$)</label><input name="preco" inputMode="decimal" defaultValue={p?.preco_centavos != null ? (Number(p.preco_centavos) / 100).toFixed(2).replace(".", ",") : ""} className="campo" placeholder="297,00" /></div>
        <div><label className="rotulo">Acesso até</label><input name="acesso_ate" type="date" defaultValue={v("acesso_ate")} className="campo" /></div>
        <div className="sm:col-span-2"><label className="rotulo">Link do checkout Kiwify (botão &quot;Desbloquear&quot;)</label><input name="checkout_url" type="url" defaultValue={v("checkout_url")} className="campo" placeholder="https://pay.kiwify.com.br/..." /></div>
        <div className="sm:col-span-2"><label className="rotulo">ID(s) do produto na Kiwify que liberam este produto</label><textarea name="kiwify_ids" defaultValue={kiwify} rows={2} className="campo" placeholder="Um por linha. Para um combo, coloque o mesmo ID nos dois produtos." /></div>
        <div><label className="rotulo">Vitrine para quem não tem</label>
          <select name="vitrine" defaultValue={String(v("vitrine") || "venda")} className="campo">
            <option value="venda">Bloqueado com botão de compra</option>
            <option value="em_breve">Bloqueado, &quot;em breve&quot;</option>
            <option value="oculto">Não mostrar</option>
          </select></div>
        <div><label className="rotulo">Ícone</label>
          <select name="icone" defaultValue={String(v("icone") || "livro")} className="campo">{ICONES.map((i) => <option key={i}>{i}</option>)}</select></div>
        <div><label className="rotulo">Ordem</label><input name="ordem" type="number" defaultValue={v("ordem") || 0} className="campo" /></div>
        <label className="flex items-center gap-2 text-sm self-end pb-3"><input type="checkbox" name="ativo" defaultChecked={novo || Boolean(p?.ativo)} /> Ativo</label>
        {!novo && <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="aplicar_prazo" /> Aplicar o novo prazo de acesso a todos os alunos deste produto</label>}
        <button className="btn btn-laranja sm:col-span-2">Salvar produto</button>
      </form>

      {!novo && (
        <section className="space-y-3">
          <h2 className="titulo text-lg">Arquivos</h2>
          <p className="text-sm text-cinza">&quot;Enviar PDF&quot; substitui a versão atual sem mexer nos alunos. Os downloads com marca d&apos;água passam a usar a nova versão na hora.</p>
          <ul className="cartao divide-y divide-linha text-sm">
            {arquivos.map((a) => (
              <li key={a.id} className="p-3 flex flex-wrap items-center gap-3">
                <span className="flex-1 min-w-48">
                  <b>{a.titulo}</b> <span className="text-cinza">({a.tipo}{a.dia ? ` ${a.dia}` : ""})</span><br />
                  <span className={enviados.has(a.storage_path) ? "text-verde" : "text-vermelho"}>{enviados.has(a.storage_path) ? `PDF enviado · ${dataBR(a.atualizado_em)}` : "PDF ainda não enviado"}</span>
                </span>
                <Envio arquivoId={a.id} productId={id} />
                <form action={removerArquivo}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="product_id" value={id} /><button className="text-xs text-vermelho underline">remover</button></form>
              </li>
            ))}
            {!arquivos.length && <li className="p-3 text-cinza">Nenhum arquivo.</li>}
          </ul>
          <form action={adicionarArquivo} className="cartao p-4 flex flex-wrap gap-2 items-end">
            <input type="hidden" name="product_id" value={id} />
            <div className="flex-1 min-w-48"><label className="rotulo">Título</label><input name="titulo" required className="campo" /></div>
            <div><label className="rotulo">Tipo</label><select name="tipo" className="campo">{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="w-20"><label className="rotulo">Dia</label><input name="dia" type="number" className="campo" /></div>
            <div className="w-20"><label className="rotulo">Ordem</label><input name="ordem" type="number" className="campo" /></div>
            <button className="btn btn-preto">Adicionar</button>
          </form>
        </section>
      )}
    </div>
  );
}
