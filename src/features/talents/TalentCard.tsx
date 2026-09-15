import Link from 'next/link';
import { maskTalentName, talentCareerLabel, talentEducation, talentOccupationsLabel, talentResumeTitle, talentWorkTypesLabel } from '@/lib/talent-display';
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
      <div className="mb-2 flex items-start gap-2.5">
        {talent.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={talent.photoUrl}
            alt=""
            className="size-11 shrink-0 rounded-lg object-contain bg-white ring-1 ring-border sm:size-12"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {talentWorkTypesLabel(talent)}
            </span>
            <span className="text-xs text-subtle">{talentCareerLabel(talent)}</span>
            <span className="text-xs text-subtle">{talentEducation(talent)}</span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
            {maskTalentName(talent.name)} · {talentOccupationsLabel(talent) || '직종 미입력'}
          </h3>
        </div>
      </div>
      {talent.location ? (
        <p className="mt-1 truncate text-sm font-medium text-muted">{talent.location}</p>
      ) : null}
      <p className="mt-2 line-clamp-2 text-xs text-muted sm:text-sm">{talentResumeTitle(talent)}</p>
      <div className="mt-auto flex flex-col gap-2 pt-3">
        {talent.available ? (
          <p className="text-xs text-subtle">{talent.available}</p>
        ) : null}
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
