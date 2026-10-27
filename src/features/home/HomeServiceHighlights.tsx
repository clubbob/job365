import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { JOB_TREND_PAGE_TITLE, MATCHED_JOBS_PAGE_TITLE } from '@/lib/site-menu-copy';
import { cn } from '@/lib/utils';

type HighlightIcon = 'channels' | 'trend' | 'matched';

type HighlightTheme = {
  card: string;
  iconWrap: string;
  iconStroke: string;
  iconFill: string;
};

const CARD_HOVER =
  'group border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover';

const THEMES: Record<HighlightIcon, HighlightTheme> = {
  channels: {
    card: cn(
      CARD_HOVER,
      'border-t-4 border-t-primary bg-gradient-to-b from-sky-50 to-surface hover:border-sky-200/90 hover:from-sky-50/95',
    ),
    iconWrap: 'bg-gradient-to-br from-sky-100 to-blue-50 ring-sky-200/80',
    iconStroke: 'stroke-sky-600',
    iconFill: 'fill-sky-500/25',
  },
  trend: {
    card: cn(
      CARD_HOVER,
      'border-t-4 border-t-amber-500 bg-gradient-to-b from-amber-50 to-surface hover:border-amber-200/90 hover:from-amber-50/95',
    ),
    iconWrap: 'bg-gradient-to-br from-amber-100 to-orange-50 ring-amber-200/80',
    iconStroke: 'stroke-amber-600',
    iconFill: 'fill-amber-500/25',
  },
  matched: {
    card: cn(
      CARD_HOVER,
      'border-t-4 border-t-violet-500 bg-gradient-to-b from-violet-50 to-surface hover:border-violet-200/90 hover:from-violet-50/95',
    ),
    iconWrap: 'bg-gradient-to-br from-violet-100 to-purple-50 ring-violet-200/80',
    iconStroke: 'stroke-violet-600',
    iconFill: 'fill-violet-500/25',
  },
};

const HIGHLIGHTS: Array<{
  id: HighlightIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
}> = [
  {
    id: 'channels',
    title: '여러 채용 공고를 한 곳에서',
    body: '대기업·중견기업·IT 회사·반도체·디스플레이 장비사 공고를 모읍니다.',
    href: '/jobs',
    cta: '채용 공고 보기',
  },
  {
    id: 'trend',
    title: JOB_TREND_PAGE_TITLE,
    body: '수집할 때마다 늘어난·줄어든 채용 공고 흐름을 분류별로 봅니다.',
    href: '/jobs/trend',
    cta: `${JOB_TREND_PAGE_TITLE} 보기`,
  },
  {
    id: 'matched',
    title: MATCHED_JOBS_PAGE_TITLE,
    body: '희망 조건에 맞는 공고만 골라 보고, 메일로도 받을 수 있습니다.',
    href: '/my-jobs',
    cta: `${MATCHED_JOBS_PAGE_TITLE} 보기`,
  },
];

function HighlightIconGraphic({ id, theme }: { id: HighlightIcon; theme: HighlightTheme }) {
  const common = cn('h-9 w-9 sm:h-10 sm:w-10', theme.iconStroke);
  const fill = theme.iconFill;
  if (id === 'channels') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={common} aria-hidden>
        <rect x="6" y="10" width="14" height="18" rx="3" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
        <rect x="22" y="6" width="14" height="22" rx="3" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
        <rect x="28" y="22" width="14" height="18" rx="3" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
      </svg>
    );
  }
  if (id === 'trend') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={common} aria-hidden>
        <rect x="6" y="8" width="36" height="32" rx="4" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
        <path
          d="M12 30l8-8 6 4 10-12"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={theme.iconStroke}
        />
        <circle cx="36" cy="14" r="2.5" className="fill-amber-600" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" className={common} aria-hidden>
      <circle cx="22" cy="22" r="12" className={theme.iconStroke} strokeWidth="2" />
      <circle cx="22" cy="22" r="5" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
      <path d="M32 32l9 9" className={theme.iconStroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeServiceHighlights() {
  return (
    <section className="space-y-3" aria-labelledby="home-service-highlights-heading">
      <h2 id="home-service-highlights-heading" className="text-lg font-bold text-foreground">
        서비스 안내
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => {
          const theme = THEMES[item.id];
          return (
            <li key={item.id} className="min-w-0">
              <Link href={item.href} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <Card className={cn('h-full overflow-hidden p-0 shadow-card', theme.card)}>
                  <div className="flex h-full flex-col p-3 sm:p-4">
                    <div
                      className={cn(
                        'mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 ease-out group-hover:scale-105',
                        theme.iconWrap,
                      )}
                    >
                      <HighlightIconGraphic id={item.id} theme={theme} />
                    </div>
                    <p className="text-sm font-bold leading-snug text-foreground sm:text-base">{item.title}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{item.body}</p>
                    <p className="mt-auto pt-3 text-sm font-semibold text-primary">{item.cta}</p>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
