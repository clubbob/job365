import type { ReactNode } from 'react';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailTags,
  DetailText,
} from '@/components/ui/PostingDetail';
import {
  displayTalentName,
  talentBasicInfoItems,
  talentCareerLabel,
  talentConditionItems,
  talentEducation,
  talentOccupationsLabel,
  talentResumeTitle,
  talentSchoolItems,
  talentWorkTypesLabel,
} from '@/lib/talent-display';
import type { TalentProfile } from '@/types/talent';

export default function TalentResumeArticle({
  talent,
  revealName,
  extraBadges,
}: {
  talent: TalentProfile;
  revealName: boolean;
  extraBadges?: ReactNode;
}) {
  const workType = talentWorkTypesLabel(talent);
  const career = talentCareerLabel(talent);
  const education = talentEducation(talent);
  const occupations = talentOccupationsLabel(talent);
  const schools = talentSchoolItems(talent);
  const displayName = displayTalentName(talent.name, revealName);

  return (
    <>
      <DetailHero
        eyebrow={displayName}
        title={talentResumeTitle(talent)}
        subtitle={occupations || undefined}
        photoUrl={talent.photoUrl}
        photoAlt={displayName}
        badges={
          <>
            {extraBadges}
            <DetailBadge tone="primary">{workType}</DetailBadge>
            {career !== '미입력' ? <DetailBadge>{career}</DetailBadge> : null}
            {education !== '미입력' ? <DetailBadge>{education}</DetailBadge> : null}
          </>
        }
      />

      <DetailStatGrid title="기본 정보" items={talentBasicInfoItems(talent, revealName)} />
      <DetailStatGrid title="희망 근무 조건" items={talentConditionItems(talent)} />

      <DetailSection title="학력 정보">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-subtle">최종 학력</p>
            <p className="mt-1 font-semibold text-foreground">{education !== '미입력' ? education : '—'}</p>
          </div>
          {schools.length > 0 ? (
            schools.map((item, index) => (
              <div key={`${item.school}-${index}`} className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-subtle">학교</p>
                  <p className="mt-1 font-semibold text-foreground">{item.school}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-subtle">전공</p>
                  <p className={item.major?.trim() ? 'mt-1 font-semibold text-foreground' : 'mt-1 text-subtle'}>
                    {item.major?.trim() || '—'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <DetailText value="" />
          )}
        </div>
      </DetailSection>

      <DetailSection title="경력 정보">
        <p className="text-[11px] font-medium tracking-wide text-subtle">경력 유무</p>
        <p className="mt-1 font-semibold text-foreground">{career !== '미입력' ? career : '—'}</p>
        <p className="mt-4 text-[11px] font-medium tracking-wide text-subtle">경력 내역</p>
        <div className="mt-1">
          <DetailText value={talent.careerHistory} />
        </div>
      </DetailSection>

      <DetailSection title="보유 역량">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-subtle">자격증</p>
            <div className="mt-1">
              <DetailText value={talent.experience} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-subtle">어학</p>
            <div className="mt-1">
              <DetailText value={talent.languages} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-subtle">스킬</p>
            <div className="mt-1">
              <DetailTags items={talent.tags} />
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="자기 소개">
        <DetailText value={talent.summary} />
      </DetailSection>
    </>
  );
}
