function req(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}
export const env = {
  get supabaseUrl() { return req("NEXT_PUBLIC_SUPABASE_URL"); },
  get supabaseAnon() { return req("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
  get serviceRole() { return req("SUPABASE_SERVICE_ROLE_KEY"); },
  get siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""); },
  get kiwifyToken() { return req("KIWIFY_WEBHOOK_TOKEN"); },
  get dataProva() { return process.env.NEXT_PUBLIC_DATA_PROVA ?? "2027-01-10T13:00:00-03:00"; },
};
