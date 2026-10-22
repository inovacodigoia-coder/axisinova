import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo-axisinova.jpeg';

const footerLinks = {
  Produto: [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Planos', href: '#pricing' },
    { label: 'Depoimentos', href: '#testimonials' },
    { label: 'Integrações', href: '#' },
  ],
  Empresa: [
    { label: 'Sobre', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Carreiras', href: '#' },
  ],
  Legal: [
    { label: 'Privacidade', href: '#' },
    { label: 'Termos de Uso', href: '#' },
    { label: 'LGPD', href: '#' },
    { label: 'Design System', href: '/design-system' },
  ],
  Contato: [
    { label: 'comercial@inovacodigoia.com.br', href: 'mailto:comercial@inovacodigoia.com.br' },
    { label: '(84) 99450-5536', href: 'tel:+5584994505536' },
  ],
};

export function Footer() {
  return (
    <footer id="contact" className="bg-[hsl(220,26%,14%)] py-16 text-white">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <img src={logoImg} alt="Axis Inova — Sistema de gestão em saúde" className="h-8 w-8 rounded-lg" />
              <span className="text-white">Axis</span>
              <span className="gradient-text">Inova</span>
            </Link>
            <p className="mt-3 text-sm text-white/50">
              Sistema SaaS completo para gestão de clínicas, hospitais e laboratórios. Agendamento, prontuário eletrônico e faturamento TISS.
            </p>
          </div>

          {/* Link columns */}
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label="Links úteis">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-3 text-sm font-semibold text-white/80">{title}</h4>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-sm text-white/50 transition-colors hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          {'\n'}
        </div>
      </div>
    </footer>
  );
}
