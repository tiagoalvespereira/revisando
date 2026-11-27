import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
export function Logo({ href = "/", claro = false }: { href?: string; claro?: boolean }) {
  return (
    <Link href={href} aria-label="Revisando" className="inline-flex items-center">
      <img src={claro ? "/marca/revisando-logo-negativo.svg" : "/marca/revisando-logo-positivo.svg"} alt="Revisando" width={150} height={25} className="h-6 w-auto" />
    </Link>
  );
}
