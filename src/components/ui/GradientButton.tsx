import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, children, fullWidth, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'gradient-bg inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-sm font-semibold text-white transition-all duration-200',
        'shadow-[0_4px_20px_hsl(191_100%_50%/0.35)]',
        'hover:shadow-[0_8px_30px_hsl(191_100%_50%/0.45)] hover:brightness-110',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
GradientButton.displayName = 'GradientButton';

export { GradientButton };
