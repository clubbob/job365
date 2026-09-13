export default function AdminPublishBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
      공개
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
      작성 중
    </span>
  );
}
