import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  steps: string[];
}

export function ProgressBar({ currentStep, steps }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-between mb-10">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-400',
                  done && 'gradient-bg text-white',
                  active && 'border-2 border-primary text-primary bg-white',
                  !done && !active && 'border-2 border-border text-muted-foreground bg-white'
                )}
              >
                {done ? <Check className="h-5 w-5" /> : step}
              </div>
              <span className={cn(
                'mt-2 text-xs font-medium',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 h-0.5 flex-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full gradient-bg transition-all duration-400"
                  style={{ width: done ? '100%' : active ? '50%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
