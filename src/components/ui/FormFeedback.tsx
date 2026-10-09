import { cn } from '@/lib/utils';

export type FormFeedbackVariant = 'error' | 'success';

const formBoxClassName: Record<FormFeedbackVariant, string> = {
  error: 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
  success: 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700',
};

const fieldClassName: Record<FormFeedbackVariant, string> = {
  error: 'mt-1 text-sm text-red-700',
  success: 'mt-1 text-xs font-medium text-green-700',
};

type FormFeedbackProps = {
  variant: FormFeedbackVariant;
  children: React.ReactNode;
  className?: string;
  /** 목록·상세 등 페이지 전체 안내용 */
  centered?: boolean;
};

/** 폼 전체·제출 직전 안내. 주요 버튼 바로 위에 둡니다. */
export function FormFeedback({ variant, children, className, centered }: FormFeedbackProps) {
  return (
    <div
      className={cn(formBoxClassName[variant], centered && 'py-6 text-center', className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

type FieldFeedbackProps = {
  variant?: FormFeedbackVariant;
  message?: string | null;
  className?: string;
};

/** 특정 입력칸 아래 필드 단위 안내 */
export function FieldFeedback({ variant = 'error', message, className }: FieldFeedbackProps) {
  if (!message) return null;
  return (
    <p className={cn(fieldClassName[variant], className)} role={variant === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  );
}
