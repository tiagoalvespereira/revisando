import Link from "next/link";
export function Logo({ href = "/", claro = false }: { href?: string; claro?: boolean }) {
  return (
    <Link href={href} className={`titulo text-xl ${claro ? "text-off" : "text-preto"}`} aria-label="Revisando">
      <span className="grifo">REVISA</span>NDO
    </Link>
  );
}
