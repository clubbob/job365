import Link from 'next/link';
import { maskTalentName, talentEducation } from '@/lib/talent-display';
import { WORK_TYPE_LABELS } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

export default function TalentCard({
  talent,
  onNavigate,
}: {
  talent: TalentProfile;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/talents/${talent.id}`}
      onClick={onNavigate}
      className="flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card transition hover:border-primary/40 hover:shadow-card-hover sm:p-4"
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {WORK_TYPE_LABELS[talent.workType]}
        </span>
        <span className="text-xs text-subtle">{talent.careerLabel}</span>
        <span className="text-xs text-subtle">{talentEducation(talent)}</span>
      </div>
      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
        {maskTalentName(talent.name)} · {talent.headline}
      </h3>
      <p className="mt-1 truncate text-sm font-medium text-muted">{talent.location}</p>
      <p className="mt-2 line-clamp-2 text-xs text-muted sm:text-sm">{talent.summary}</p>
      <div className="mt-auto flex flex-col gap-2 pt-3">
        <div className="flex flex-wrap items-end justify-between gap-1 text-sm">
          <span className="font-semibold text-primary">{talent.desiredPay}</span>
          <span className="text-xs text-subtle">{talent.available}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {talent.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
