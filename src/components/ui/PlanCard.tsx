import { cn } from '@/lib/utils';
import { GradientButton } from './GradientButton';
import { OutlineButton } from './OutlineButton';
import { Check } from 'lucide-react';

interface PlanCardProps {
  name: string;
  price: number;
  annualPrice: number;
  isAnnual: boolean;
  features: string[];
  popular?: boolean;
  onSelect?: () => void;
  compact?: boolean;
  selected?: boolean;
}

const PlanCard = ({ name, price, annualPrice, isAnnual, features, popular, onSelect, compact, selected }: PlanCardProps) => {
  const displayPrice = isAnnual ? annualPrice : price;
  const formattedPrice = Number(displayPrice).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const formattedSavings = ((price - annualPrice) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex flex-col rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer',
          selected
            ? 'border-secondary shadow-[0_0_0_2px_hsl(var(--axis-secondary))]'
            : 'border-border hover:border-secondary/40'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">{name}</span>
          {popular && (
            <span className="gradient-bg rounded-full px-2 py-0.5 text-[10px] font-bold text-white">Popular</span>
          )}
        </div>
        <div className="mt-1">
          <span className="text-xl font-bold text-foreground">R$ {formattedPrice}</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
        <ul className="mt-2 space-y-1">
          {features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-[hsl(var(--axis-success))]" /> {f}
            </li>
          ))}
        </ul>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-8 transition-all duration-300',
        popular
          ? 'border-2 border-secondary shadow-[0_12px_40px_hsl(var(--axis-secondary)/0.15)] scale-105 z-10'
          : 'border-border shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_hsl(var(--axis-secondary)/0.1)]'
      )}
    >
      {popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="gradient-bg rounded-full px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
            🔥 Mais Popular
          </span>
        </div>
      )}
      <h3 className="text-xl font-bold text-foreground">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[40px] font-extrabold leading-none text-foreground">R$ {formattedPrice}</span>
        <span className="text-base text-muted-foreground">/mês</span>
      </div>
      {isAnnual && (
        <p className="mt-1 text-sm text-[hsl(var(--axis-success))]">
          Economia de R$ {(price - annualPrice) * 12}/ano
        </p>
      )}
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--axis-success))]" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {popular ? (
          <GradientButton fullWidth onClick={onSelect}>Assinar Agora</GradientButton>
        ) : (
          <OutlineButton fullWidth variant="purple" onClick={onSelect}>Assinar Agora</OutlineButton>
        )}
      </div>
    </div>
  );
};

export { PlanCard };
