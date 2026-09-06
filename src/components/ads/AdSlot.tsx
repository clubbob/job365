import { cn } from '@/lib/utils';

type AdSlotProps = {
  placement: 'header' | 'infeed' | 'detail' | 'footer';
  className?: string;
};

const PLACEMENT_LABELS: Record<AdSlotProps['placement'], string> = {
  header: '상단 배너',
  infeed: '인피드 광고',
  detail: '상세 하단 광고',
  footer: '하단 배너',
};

export default function AdSlot({ placement, className }: AdSlotProps) {
  return (
    <aside
      className={cn(
        'flex items-center justify-center rounded-lg border border-dashed border-border bg-neutral-50 text-center text-xs text-subtle',
        placement === 'header' && 'min-h-16',
        placement === 'infeed' && 'min-h-24',
        placement === 'detail' && 'min-h-20',
        placement === 'footer' && 'min-h-16',
        className,
      )}
      aria-label={`${PLACEMENT_LABELS[placement]} 영역`}
    >
      <span>Google AdSense {PLACEMENT_LABELS[placement]} 영역</span>
    </aside>
  );
}
