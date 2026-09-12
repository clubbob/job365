'use client';

import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export default function AutoGrowTextarea({
  className,
  value,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    function fit() {
      const el = ref.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      rows={rows}
      className={cn('leading-relaxed', className, 'resize-none overflow-hidden')}
    />
  );
}
