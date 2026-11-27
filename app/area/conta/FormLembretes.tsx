"use client";
import { useActionState, useState } from "react";
import { salvarLembretes, type Estado } from "./actions";
import { Mensagem } from "@/components/CaixaAuth";
import { Icone } from "@/components/Icone";

type Config = { ativo: boolean; hora: number; por_whatsapp: boolean; por_email: boolean; whatsapp: string | null } | null;
const HORAS = Array.from({ length: 18 }, (_, i) => i + 5); // 5h às 22h

const formatar = (d: string) => {
  const n = d.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
};

export function FormLembretes({ config, email, previa }: { config: Config; email: string; previa: string | null }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarLembretes, null);
  const [ativo, setAtivo] = useState(config?.ativo ?? true);
  const [zap, setZap] = useState(formatar(config?.whatsapp ?? ""));
  const [porZap, setPorZap] = useState(config?.por_whatsapp ?? true);

  return (
    <form action={acao} id="lembretes" className="cartao overflow-hidden scroll-mt-40">
      <div className="bg-preto text-off p-5 flex items-center gap-4">
        <span className="grid place-items-center size-12 rounded-2xl bg-laranja text-preto shrink-0"><Icone nome="relogio" className="size-6" /></span>
        <div className="flex-1">
          <h2 className="titulo text-lg">Lembretes diários</h2>
          <p className="text-sm text-off/65">Todo dia, no horário que você escolher, o que estudar e o link direto do material do dia.</p>
        </div>
        <label className="relative inline-flex cursor-pointer shrink-0" aria-label="Ativar lembretes">
          <input type="checkbox" name="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="peer sr-only" />
          <span className="h-8 w-14 rounded-full bg-white/20 peer-checked:bg-verde transition" />
          <span className="absolute left-1 top-1 size-6 rounded-full bg-white transition peer-checked:translate-x-6" />
        </label>
      </div>

      <div className={`p-5 space-y-5 ${ativo ? "" : "opacity-50 pointer-events-none"}`}>
        <div>
          <span className="rotulo">Horário (Brasília)</span>
          <select name="hora" defaultValue={config?.hora ?? 7} className="campo">
            {HORAS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="rotulo">Receber por</legend>
          <label className="flex items-center gap-3 rounded-xl border-2 border-linha p-3 has-[:checked]:border-verde">
            <input type="checkbox" name="por_whatsapp" checked={porZap} onChange={(e) => setPorZap(e.target.checked)} className="size-5 accent-[#25D366]" />
            <span className="grid place-items-center size-9 rounded-lg bg-[#25D366] text-white text-xs font-black">WA</span>
            <span className="flex-1 font-semibold">WhatsApp</span>
          </label>
          {porZap && (
            <input name="whatsapp" value={zap} onChange={(e) => setZap(formatar(e.target.value))} inputMode="tel" autoComplete="tel-national"
              placeholder="(61) 99999-9999" className="campo" aria-label="WhatsApp com DDD" />
          )}
          <label className="flex items-center gap-3 rounded-xl border-2 border-linha p-3 has-[:checked]:border-verde">
            <input type="checkbox" name="por_email" defaultChecked={config?.por_email ?? true} className="size-5 accent-[#0F7B5F]" />
            <span className="grid place-items-center size-9 rounded-lg bg-preto text-laranja"><Icone nome="documento" className="size-4" /></span>
            <span className="flex-1 min-w-0"><span className="font-semibold block">E-mail</span><span className="text-xs text-cinza truncate block">{email}</span></span>
          </label>
        </fieldset>

        {previa && (
          <div>
            <span className="rotulo">Prévia da mensagem de hoje</span>
            <p className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-4 py-3 text-sm text-preto shadow-sm">{previa}</p>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm text-cinza">
          <input type="checkbox" name="aceite" defaultChecked={Boolean(config?.ativo)} className="mt-0.5 size-5 accent-preto" />
          Aceito receber os lembretes diários do Revisando nos canais marcados. Posso desativar quando quiser.
        </label>
      </div>

      <div className="px-5 pb-5 space-y-3">
        <Mensagem estado={estado} />
        <button className="btn btn-laranja btn-bloco" disabled={pendente}>{pendente ? "Salvando..." : "Salvar lembretes"}</button>
      </div>
    </form>
  );
}
