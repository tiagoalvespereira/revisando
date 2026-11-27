"use client";
import { useEffect, useState } from "react";

export function Contagem({ data }: { data: string }) {
  const alvo = new Date(data).getTime();
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = agora === null ? null : Math.max(0, alvo - agora);
  const dias = ms === null ? "--" : Math.floor(ms / 86_400_000);
  const horas = ms === null ? "--" : Math.floor((ms % 86_400_000) / 3_600_000);
  const dataFmt = new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <div className="flex items-end gap-4">
      <div>
        <div className="titulo text-5xl text-laranja leading-none">{dias}</div>
        <div className="text-xs uppercase tracking-widest text-off/70 mt-1">dias</div>
      </div>
      <div>
        <div className="titulo text-3xl text-off leading-none">{horas}</div>
        <div className="text-xs uppercase tracking-widest text-off/70 mt-1">horas</div>
      </div>
      <p className="text-sm text-off/70 pb-1">até a 1ª fase<br />em {dataFmt}</p>
    </div>
  );
}
