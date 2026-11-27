import { CaixaAuth } from "@/components/CaixaAuth";
import { FormEntrar } from "./Form";

export const metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ volta?: string; erro?: string }> }) {
  const { volta, erro } = await searchParams;
  const aviso = erro === "link" ? "Este link expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\"." : erro === "sessao" ? "Sua conta foi acessada em outro dispositivo. Entre de novo." : undefined;
  return (
    <CaixaAuth titulo="Área do aluno">
      <FormEntrar volta={volta?.startsWith("/") ? volta : "/area"} aviso={aviso} />
    </CaixaAuth>
  );
}
