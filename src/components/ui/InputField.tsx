import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Lock } from 'lucide-react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
  showValidIcon?: boolean;
  isValid?: boolean;
  isPassword?: boolean;
  locked?: boolean;
  shake?: boolean;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, label, error, optional, showValidIcon, isValid, isPassword, locked, shake, type, ...props }, ref) => {
    const [showPass, setShowPass] = useState(false);

    return (
      <div className={cn('relative', shake && 'animate-shake')}>
        <label className="mb-1.5 block text-[13px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          {label}
          {optional && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
              Opcional
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={isPassword ? (showPass ? 'text' : 'password') : type}
            readOnly={locked}
            className={cn(
              'flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all duration-200',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              error ? 'border-destructive focus:ring-destructive/40' : 'border-input',
              locked && 'bg-muted cursor-not-allowed',
              (showValidIcon || isPassword || locked) && 'pr-10',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {locked && (
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          {showValidIcon && !isPassword && !locked && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <Check className="h-4 w-4 text-[hsl(var(--axis-success))]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>
    );
  }
);
InputField.displayName = 'InputField';

export { InputField };
