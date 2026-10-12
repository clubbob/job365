import { cn } from '@/lib/utils';

export function DetailBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'primary' | 'neutral';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'primary'
          ? 'bg-primary text-white shadow-sm'
          : 'bg-white/90 text-muted ring-1 ring-inset ring-border',
      )}
    >
      {children}
    </span>
  );
}

export function DetailHero({
  eyebrow,
  title,
  subtitle,
  subtitleHref,
  photoUrl,
  photoAlt,
  badges,
  highlightLabel,
  highlightValue,
  facts,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  subtitleHref?: string;
  photoUrl?: string;
  photoAlt?: string;
  badges?: React.ReactNode;
  highlightLabel?: string;
  highlightValue?: string;
  facts?: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-surface shadow-card">
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-primary/[0.04] to-surface p-5 sm:p-7">
        <div className="flex items-start gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={photoAlt ?? ''}
              className="size-20 shrink-0 rounded-xl object-contain bg-white ring-1 ring-border sm:size-24"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-sm font-semibold text-primary" title={eyebrow}>
                {eyebrow}
              </p>
            ) : null}
            <h2
              className={cn(
                'block w-full min-w-0 whitespace-normal break-words text-xl font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl',
                eyebrow ? 'mt-2' : badges ? 'mt-0' : undefined,
              )}
              title={title}
            >
              {title}
            </h2>
            {badges ? (
              <div className="mt-3 flex flex-wrap justify-end gap-1.5">{badges}</div>
            ) : null}
            {subtitle ? (
              <p
                className="mt-1.5 line-clamp-1 text-sm font-medium text-muted"
                title={subtitle}
              >
                {subtitleHref ? (
                  <a
                    href={subtitleHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60"
                  >
                    {subtitle}
                  </a>
                ) : (
                  subtitle
                )}
              </p>
            ) : null}
          </div>
        </div>

        {highlightValue || facts?.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.4fr)]">
            {highlightValue ? (
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-primary/15">
                {highlightLabel ? <p className="text-xs font-medium text-subtle">{highlightLabel}</p> : null}
                <p className="mt-1 text-lg font-bold leading-snug text-primary sm:text-xl">{highlightValue}</p>
              </div>
            ) : null}
            {facts?.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {facts.map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/85 px-3 py-3 ring-1 ring-border/80">
                    <p className="text-[11px] font-medium text-subtle">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DetailStatGrid({
  title = '핵심 정보',
  items,
  embedded = false,
  embeddedColumns = 3,
}: {
  title?: string;
  items: Array<{
    label: string;
    value?: string | null;
    href?: string;
    colSpan?: 2 | 4;
    hrefWrap?: boolean;
  }>;
  embedded?: boolean;
  embeddedColumns?: 3 | 4;
}) {
  const embeddedGridClass =
    embeddedColumns === 4
      ? 'grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4'
      : 'grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3';

  const list = (
    <dl className={embedded ? embeddedGridClass : 'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
      {items.map((item) => {
        const value = item.value?.trim() ? item.value : '—';
        return (
          <div
            key={item.label}
            className={cn(
              embedded ? undefined : 'rounded-xl border border-border bg-surface px-3.5 py-3 shadow-sm',
              item.colSpan === 4 && embedded && embeddedColumns === 4
                ? 'col-span-2 sm:col-span-4'
                : item.colSpan === 2 && embedded
                  ? 'col-span-2 sm:col-span-2'
                  : undefined,
            )}
          >
            <dt className="text-[11px] font-medium tracking-wide text-subtle">{item.label}</dt>
            <dd
              className={cn(
                'mt-1 min-w-0 text-sm font-semibold leading-snug',
                item.href && value !== '—' ? 'overflow-x-auto' : 'break-words whitespace-pre-wrap',
                value === '—' ? 'text-subtle' : 'text-foreground',
              )}
            >
              {item.href && value !== '—' ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60',
                    item.hrefWrap
                      ? 'inline break-words whitespace-normal'
                      : 'inline-block whitespace-nowrap',
                  )}
                >
                  {value}
                </a>
              ) : (
                <span title={value !== '—' ? value : undefined}>{value}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (embedded) return list;

  return (
    <section>
      {title ? <h3 className="mb-2.5 text-sm font-bold text-foreground">{title}</h3> : null}
      {list}
    </section>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <h3 className="border-b border-border bg-neutral-50 px-4 py-2.5 text-sm font-bold text-foreground">
        {title}
      </h3>
      <div className="px-4 py-4 text-sm leading-relaxed text-foreground sm:px-5">{children}</div>
    </section>
  );
}

export function DetailText({ value }: { value?: string | null }) {
  const text = value?.trim() ? value : '—';
  return (
    <p className={cn('whitespace-pre-wrap', text === '—' ? 'text-subtle' : 'text-foreground')}>{text}</p>
  );
}

export function DetailTags({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-subtle">—</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((tag) => (
        <li key={tag} className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {tag}
        </li>
      ))}
    </ul>
  );
}
