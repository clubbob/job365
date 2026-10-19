'use client';

import type { ReactNode } from 'react';
import { adminSecondaryActionClassName } from '@/lib/admin-ui';
import {
  openUserFacingSiteInNewTab,
  openUserFacingSiteInNewTabTitle,
} from '@/lib/open-user-site-tab';
import { cn } from '@/lib/utils';

type AdminOpenUserSiteButtonProps = {
  path: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

export default function AdminOpenUserSiteButton({
  path,
  children,
  className,
  title = openUserFacingSiteInNewTabTitle,
}: AdminOpenUserSiteButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className={cn(adminSecondaryActionClassName, className)}
      onClick={() => openUserFacingSiteInNewTab(path)}
    >
      {children}
    </button>
  );
}
