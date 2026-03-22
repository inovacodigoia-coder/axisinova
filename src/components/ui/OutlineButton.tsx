import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'gray';
  fullWidth?: boolean;
}

const OutlineButton = forwardRef<HTMLButtonElement, OutlineButtonProps>(
  ({ className, children, variant = 'purple', fullWidth, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] border-2 px-6 py-3 text-sm font-semibold transition-all duration-200',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variant === 'purple' && 'border-secondary text-secondary hover:bg-secondary/5',
        variant === 'gray' && 'border-border text-foreground hover:bg-muted',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
OutlineButton.displayName = 'OutlineButton';

export { OutlineButton };
