export function AvisoExemplo({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" className="mb-3 rounded-xl border-2 border-vermelho bg-[#fbeaea] px-4 py-3 text-sm font-semibold text-vermelho">
      {children}
    </p>
  );
}
