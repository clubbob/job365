import { cn } from '@/lib/utils';
import {
  buttonBaseClassName,
  buttonGhostClassName,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  buttonSizeDefaultClassName,
  buttonSizeLargeClassName,
} from '@/lib/button-ui';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
};

export function Card({ children, className, title, description, action }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5',
        className,
      )}
    >
      {(title || description || action) && (
        <div className="mb-4 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-start sm:gap-3">
          {(title || description) && (
            <div className="min-w-0 w-full sm:flex-1">
              {title && (
                <h2 className="min-w-0 text-base font-bold leading-snug text-foreground">{title}</h2>
              )}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
          )}
          {action && (
            <div className="w-full overflow-x-auto sm:ml-auto sm:w-auto sm:shrink-0">{action}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

type FieldLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
};

export function FieldLabel({ htmlFor, children, optional }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"
    >
      {children}
      {optional && <span className="text-xs font-normal text-subtle">(선택)</span>}
    </label>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'lg';
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = 'primary',
  size = 'default',
  fullWidth,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonBaseClassName,
        size === 'default' && buttonSizeDefaultClassName,
        size === 'lg' && buttonSizeLargeClassName,
        fullWidth && 'w-full',
        variant === 'primary' && buttonPrimaryClassName,
        variant === 'primary' && size === 'lg' && 'shadow-card hover:shadow-card-hover',
        variant === 'secondary' && buttonSecondaryClassName,
        variant === 'ghost' && buttonGhostClassName,
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
