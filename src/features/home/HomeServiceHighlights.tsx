import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

type HighlightIcon = 'channels' | 'summary' | 'matched';

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
  summary: {
    card: cn(
      CARD_HOVER,
      'border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-50 to-surface hover:border-emerald-200/90 hover:from-emerald-50/95',
    ),
    iconWrap: 'bg-gradient-to-br from-emerald-100 to-teal-50 ring-emerald-200/80',
    iconStroke: 'stroke-emerald-600',
    iconFill: 'fill-emerald-500/25',
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
}> = [
  {
    id: 'channels',
    title: '여러 채용 공고를 한 곳에서 조회',
    body: '대기업·중견·채용 사이트 공고를 한 곳에서 검색합니다.',
  },
  {
    id: 'summary',
    title: '요약된 채용 공고 및 바로 지원',
    body: '공고는 읽기 쉽게 요약하고, 지원은 원문 사이트로 연결합니다.',
  },
  {
    id: 'matched',
    title: '내 맞춤 채용 공고 및 메일 전송',
    body: '희망 조건에 맞는 공고만 골라 볼 수 있습니다.',
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
  if (id === 'summary') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={common} aria-hidden>
        <rect x="8" y="6" width="26" height="34" rx="4" className={cn(fill, theme.iconStroke)} strokeWidth="2" />
        <path d="M14 16h18M14 22h14M14 28h10" strokeWidth="2" strokeLinecap="round" className={theme.iconStroke} />
        <circle cx="36" cy="34" r="8" className="fill-emerald-500 stroke-emerald-600" strokeWidth="2" />
        <path
          d="M33 34l2 2 4-5"
          className="stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
