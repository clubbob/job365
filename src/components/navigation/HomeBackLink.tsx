import Link from 'next/link';

export default function HomeBackLink({
  href = '/',
  label = '홈으로',
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] print:hidden"
    >
      ← {label}
    </Link>
  );
}
