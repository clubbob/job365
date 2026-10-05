function BannerIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="100" cy="142" rx="72" ry="10" fill="white" fillOpacity="0.12" />
      <rect x="28" y="52" width="52" height="72" rx="6" fill="white" fillOpacity="0.18" />
      <rect x="40" y="66" width="12" height="10" rx="2" fill="white" fillOpacity="0.35" />
      <rect x="56" y="66" width="12" height="10" rx="2" fill="white" fillOpacity="0.35" />
      <rect x="40" y="82" width="12" height="10" rx="2" fill="white" fillOpacity="0.22" />
      <rect x="56" y="82" width="12" height="10" rx="2" fill="white" fillOpacity="0.22" />
      <rect x="40" y="98" width="12" height="10" rx="2" fill="white" fillOpacity="0.22" />
      <rect x="56" y="98" width="12" height="10" rx="2" fill="white" fillOpacity="0.22" />
      <rect x="88" y="36" width="48" height="88" rx="6" fill="white" fillOpacity="0.22" />
      <rect x="98" y="50" width="10" height="8" rx="2" fill="white" fillOpacity="0.35" />
      <rect x="112" y="50" width="10" height="8" rx="2" fill="white" fillOpacity="0.35" />
      <rect x="98" y="64" width="10" height="8" rx="2" fill="white" fillOpacity="0.25" />
      <rect x="112" y="64" width="10" height="8" rx="2" fill="white" fillOpacity="0.25" />
      <rect x="98" y="78" width="10" height="8" rx="2" fill="white" fillOpacity="0.25" />
      <rect x="112" y="78" width="10" height="8" rx="2" fill="white" fillOpacity="0.25" />
      <rect x="144" y="64" width="40" height="60" rx="6" fill="white" fillOpacity="0.16" />
      <rect x="154" y="76" width="10" height="8" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="168" y="76" width="10" height="8" rx="2" fill="white" fillOpacity="0.3" />
      <circle cx="156" cy="28" r="20" stroke="white" strokeOpacity="0.45" strokeWidth="3.5" />
      <path d="M168 40l12 12" stroke="white" strokeOpacity="0.65" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="118" y="108" width="56" height="38" rx="8" fill="white" fillOpacity="0.92" />
      <rect x="128" y="118" width="36" height="5" rx="2.5" fill="#2563eb" fillOpacity="0.45" />
      <rect x="128" y="128" width="28" height="4" rx="2" fill="#2563eb" fillOpacity="0.25" />
      <rect x="128" y="136" width="32" height="4" rx="2" fill="#2563eb" fillOpacity="0.25" />
      <path
        d="M72 124h34a8 8 0 0 1 8 8v6H64v-6a8 8 0 0 1 8-8z"
        fill="white"
        fillOpacity="0.85"
      />
      <path
        d="M80 124v-14a18 18 0 0 1 36 0v14"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
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
          <h2 className="mt-2 max-w-xl text-xl font-bold leading-snug text-white sm:text-2xl">
            대기업·중견 최신 채용 공고를 한곳에서
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-blue-100 sm:text-base">
            신입·경력·인턴 공고를 바로 확인하고 채용 사이트에서 지원하세요.
          </p>
        </div>

        <BannerIllustration className="hidden h-32 w-40 shrink-0 sm:block lg:h-36 lg:w-44" />
      </div>
    </section>
  );
}
