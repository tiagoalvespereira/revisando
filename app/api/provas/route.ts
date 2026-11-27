import { NextResponse } from "next/server";
import { datasProva } from "@/lib/provas";
import { proximaProva } from "@/lib/provas-regra";

export const dynamic = "force-dynamic";

/** Próxima prova para a landing (pública). */
export async function GET() {
  const proxima = proximaProva(await datasProva());
  return NextResponse.json({ proxima }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
