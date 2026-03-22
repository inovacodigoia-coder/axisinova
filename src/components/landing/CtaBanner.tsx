import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CtaBanner() {
  return (
    <section className="gradient-bg py-20">
      <motion.div
        className="mx-auto max-w-[1200px] px-4 text-center md:px-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-white md:text-[40px] md:leading-tight" style={{ textWrap: 'balance' }}>
          Sua clínica merece uma gestão à altura
        </h2>
        <p className="mt-4 text-base text-white/70 md:text-lg">
          Junte-se a centenas de profissionais que já transformaram sua operação.
        </p>
        <Link to="/cadastro">
          <button className="mt-8 inline-flex h-12 items-center rounded-[10px] bg-white px-8 text-base font-bold text-secondary shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.97]">
            Cadastrar Minha Empresa Agora →
          </button>
        </Link>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { value: '+500', label: 'Clínicas' },
            { value: '+2M', label: 'Atendimentos' },
            { value: '99.9%', label: 'Uptime' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-white md:text-4xl">{s.value}</p>
              <p className="text-sm text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
