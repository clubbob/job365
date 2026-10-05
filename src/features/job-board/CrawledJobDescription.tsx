import { DetailSection } from '@/components/ui/PostingDetail';

const descriptionBodyClass = [
  '[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-muted [&_p:last-child]:mb-0',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
  '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_li]:leading-relaxed [&_li]:text-muted',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
].join(' ');

export type DescriptionSection = {
  title: string;
  body: string;
};

export function parseDescriptionSections(html: string): DescriptionSection[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const sections: DescriptionSection[] = [];
  const pattern = /<section>\s*<h3>([^<]*)<\/h3>([\s\S]*?)<\/section>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(trimmed))) {
    const body = match[2].trim();
    if (body) sections.push({ title: match[1].trim(), body });
  }

  if (sections.length > 0) return sections;
  return [{ title: '상세 내용', body: trimmed }];
}

function normalizeDescriptionBody(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (/<(p|ul|ol|li|div|h[1-6]|table|br)\b/i.test(trimmed)) return trimmed;

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function DescriptionBody({ html }: { html: string }) {
  const body = normalizeDescriptionBody(html);
  if (!body) {
    return <p className="text-subtle">내용이 없습니다.</p>;
  }

  return (
    <div className={descriptionBodyClass} dangerouslySetInnerHTML={{ __html: body }} />
  );
}

export default function CrawledJobDescription({ html }: { html: string }) {
  const sections = parseDescriptionSections(html);
  if (sections.length === 0) {
    return (
      <DetailSection title="상세 내용">
        <p className="text-subtle">상세 내용이 없습니다. 원문 사이트에서 확인해 주세요.</p>
      </DetailSection>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <DetailSection key={section.title} title={section.title}>
          <DescriptionBody html={section.body} />
        </DetailSection>
      ))}
    </>
  );
}
