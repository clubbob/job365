import type { ReactNode } from 'react';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border/60 pb-8 last:border-b-0 last:pb-0">
      <h2 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted sm:text-base">{children}</div>
    </section>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalOl({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-foreground [&>li]:pl-1 [&>li]:leading-relaxed">
      {children}
    </ol>
  );
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="ml-4 mt-2 list-disc space-y-2 [&>li]:leading-relaxed">{children}</ul>;
}
