import { Link } from 'react-router-dom';

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
  ],
  Contato: [
    { label: 'contato@axisinova.com.br', href: 'mailto:contato@axisinova.com.br' },
    { label: '(11) 99999-0000', href: 'tel:+5511999990000' },
  ],
};

export function Footer() {
  return (
    <footer id="contact" className="bg-[hsl(220,26%,14%)] py-16 text-white">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <Link to="/" className="text-xl font-bold">
              <span className="text-white">Axis</span>
              <span className="gradient-text">Inova</span>
            </Link>
            <p className="mt-3 text-sm text-white/50">
              Plataforma completa de gestão clínica para profissionais de saúde.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
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
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          © {new Date().getFullYear()} Axis Inova. Todos os direitos reservados. Feito com ❤️ para a saúde brasileira.
        </div>
      </div>
    </footer>
  );
}
