'use client';

import { useEffect, useState } from 'react';

/** Tailwind `sm` 미만 — 채용·인재 카드가 1열인 폭 */
export const BELOW_SM_MEDIA = '(max-width: 639px)';

export function useIsBelowSm(): boolean {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(BELOW_SM_MEDIA);
    const update = () => setBelow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return below;
}
