import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoImg from '@/assets/logo-axisinova.jpeg';
import { GradientButton } from '@/components/ui/GradientButton';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Planos', href: '#pricing' },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'Contato', href: '#contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-shadow duration-300',
        'bg-white/92 backdrop-blur-[12px]',
        scrolled && 'shadow-[0_1px_0_hsl(var(--axis-border))]'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-0 text-xl font-bold">
          <span className="text-foreground">Axis</span>
          <span className="gradient-text">Inova</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-secondary"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login"><OutlineButton variant="purple" className="h-9 px-4 text-xs">Entrar</OutlineButton></Link>
          <Link to="/cadastro">
            <GradientButton className="h-9 px-4 text-xs">Teste Grátis 14 dias</GradientButton>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-40 border-b border-border bg-white p-4 shadow-lg md:hidden animate-fade-in">
          <div className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-secondary"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Link to="/login"><OutlineButton variant="purple">Entrar</OutlineButton></Link>
              <Link to="/cadastro">
                <GradientButton fullWidth>Teste Grátis 14 dias</GradientButton>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
