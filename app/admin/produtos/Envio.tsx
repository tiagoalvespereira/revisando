"use client";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { confirmarEnvio, urlDeEnvio } from "../actions";

/** Envia o PDF direto do navegador para o bucket privado, substituindo a versão atual. */
export function Envio({ arquivoId, productId }: { arquivoId: string; productId: string }) {
  const [estado, setEstado] = useState<string>("");
  return (
    <label className="btn btn-contorno btn-pequeno cursor-pointer">
      {estado || "Enviar PDF"}
      <input
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.type !== "application/pdf") {
            setEstado("Só PDF");
            return;
          }
          try {
            setEstado("Enviando...");
            const { path, token } = await urlDeEnvio(arquivoId);
            const { error } = await supabaseNavegador()
              .storage.from("materiais")
              .uploadToSignedUrl(path, token, f, { contentType: "application/pdf", upsert: true });
            if (error) throw error;
            await confirmarEnvio(arquivoId, productId);
            setEstado("Enviado");
          } catch (err) {
            console.error(err);
            setEstado("Falhou, tente de novo");
          }
        }}
      />
    </label>
  );
}
