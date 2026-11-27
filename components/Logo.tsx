import Link from "next/link";

/** Logo principal (completa: ícone R✓ + REVISANDO + OAB · CONCURSOS · RECURSOS). */
export function Logo({ href = "/", claro = false, tamanho = "md" }: { href?: string; claro?: boolean; tamanho?: "md" | "lg" }) {
  const altura = tamanho === "lg" ? "h-16 sm:h-20" : "h-11 sm:h-12";
  return (
    <Link href={href} aria-label="Revisando" className="inline-flex items-center shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={claro ? "/marca/revisando-logo-completa-negativo.svg" : "/marca/revisando-logo-completa-positivo.svg"}
        alt="Revisando · OAB, Concursos, Recursos"
        width={1337}
        height={320}
        className={`${altura} w-auto`}
      />
    </Link>
  );
}
