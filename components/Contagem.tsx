"use client";
import { useEffect, useState } from "react";

export function Contagem({ data }: { data: string }) {
  const alvo = new Date(data).getTime();
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = agora === null ? null : Math.max(0, alvo - agora);
  const v = (n: number | null) => (n === null ? "--" : String(n).padStart(2, "0"));
  const partes = [
    { n: ms === null ? null : Math.floor(ms / 86_400_000), r: "dias", destaque: true },
    { n: ms === null ? null : Math.floor((ms % 86_400_000) / 3_600_000), r: "horas" },
    { n: ms === null ? null : Math.floor((ms % 3_600_000) / 60_000), r: "min" },
  ];
  const dataFmt = new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <div>
      <div className="flex gap-2">
        {partes.map((p) => (
          <div key={p.r} className={`min-w-[72px] rounded-2xl border px-3 py-2.5 text-center ${p.destaque ? "border-laranja bg-laranja text-preto" : "border-white/15 bg-white/5"}`}>
            <div className="titulo text-3xl leading-none">{v(p.n)}</div>
            <div className={`text-[10px] uppercase tracking-widest mt-1.5 font-bold ${p.destaque ? "text-preto/70" : "text-off/60"}`}>{p.r}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-off/60 mt-2">até a 1ª fase · {dataFmt}</p>
    </div>
  );
}
