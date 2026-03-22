import { cn } from '@/lib/utils';
import { SelectHTMLAttributes, forwardRef } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  shake?: boolean;
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, label, error, options, placeholder, shake, ...props }, ref) => (
    <div className={cn(shake && 'animate-shake')}>
      <label className="mb-1.5 block text-[13px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-10 text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            error ? 'border-destructive' : 'border-input',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  )
);
SelectField.displayName = 'SelectField';

export { SelectField };
