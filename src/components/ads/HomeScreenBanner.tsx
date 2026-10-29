import Link from 'next/link';
import {
  HOME_BANNER_SUBTITLE,
  HOME_BANNER_TITLE,
  HOME_BANNER_VALUE_CHIPS,
  JOB_TREND_PAGE_TITLE,
  MATCHED_JOBS_PAGE_TITLE,
} from '@/lib/site-menu-copy';

function BannerIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="100" cy="148" rx="68" ry="8" fill="white" fillOpacity="0.12" />
      <rect x="18" y="42" width="108" height="78" rx="10" fill="white" fillOpacity="0.16" />
      <path
        d="M32 96l18-16 14 8 22-24"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="86" cy="64" r="4" fill="white" fillOpacity="0.95" />
      <rect x="132" y="70" width="54" height="64" rx="10" fill="white" fillOpacity="0.92" />
      <rect x="144" y="82" width="30" height="5" rx="2.5" fill="#2563eb" fillOpacity="0.5" />
      <rect x="144" y="92" width="24" height="4" rx="2" fill="#2563eb" fillOpacity="0.28" />
      <rect x="144" y="102" width="28" height="4" rx="2" fill="#2563eb" fillOpacity="0.28" />
      <path
        d="M148 118h28m0 0-6-6m6 6-6 6"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="156" cy="28" r="16" stroke="white" strokeOpacity="0.5" strokeWidth="3" />
      <path d="M167 39l10 10" stroke="white" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeScreenBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-card"
      aria-label="채용 공고 안내 배너"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-blue-300/10 blur-2xl" />

      <div className="relative flex items-center justify-between gap-6 px-5 py-7 sm:px-8 sm:py-9">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-100">JobLink 365 채용 정보</p>
          <h2 className="mt-2 max-w-xl break-keep text-xl font-bold leading-snug text-white sm:text-2xl">
            {HOME_BANNER_TITLE}
          </h2>
          <p className="mt-3 max-w-xl whitespace-pre-line break-keep text-pretty text-sm leading-relaxed text-blue-100 sm:text-base">
            {HOME_BANNER_SUBTITLE}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {HOME_BANNER_VALUE_CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white sm:text-sm"
              >
                {chip}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/jobs/trend"
              className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
            >
              {JOB_TREND_PAGE_TITLE}
            </Link>
            <Link
              href="/my-jobs"
              className="inline-flex rounded-lg border border-white/70 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {MATCHED_JOBS_PAGE_TITLE}
            </Link>
          </div>
        </div>

        <BannerIllustration className="hidden h-32 w-40 shrink-0 sm:block lg:h-36 lg:w-44" />
      </div>
    </section>
  );
}
