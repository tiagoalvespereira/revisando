import { Contagem } from "@/components/Contagem";
import { CardProduto } from "@/components/CardProduto";
import { alunoAtual, linkCompra, meusProdutos } from "@/lib/aluno";
import { env } from "@/lib/env";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const { perfil } = await alunoAtual();
  const produtos = await meusProdutos();
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
