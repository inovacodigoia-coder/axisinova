import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "O Axis Inova funciona para laboratórios clínicos?",
    a: "Sim. O Axis Inova possui módulo completo para laboratórios, incluindo catálogo de exames, fila de coleta, digitação de resultados, laudos com assinatura digital e portais para parceiros e médicos."
  },
  {
    q: "O sistema emite laudos e faz faturamento TISS?",
    a: "Sim. O sistema gera laudos com assinatura digital do responsável técnico, exporta arquivos XML TISS para convênios e gerencia guias SADT conforme as normas da ANS."
  },
  {
    q: "Posso usar em múltiplas unidades?",
    a: "Sim. O sistema é multi-unidades com controle de origens, usuários por unidade, permissões granulares e painéis de TV e totem independentes por unidade."
  },
  {
    q: "Tem período de teste gratuito?",
    a: "Sim. O Axis Inova oferece 14 dias de teste gratuito sem necessidade de cartão de crédito."
  },
  {
    q: "O sistema possui prontuário eletrônico?",
    a: "Sim. Inclui prontuário completo com linha do tempo do paciente, prescrições, diagnósticos por CID-10 e solicitação de exames integrada."
  },
  {
    q: "O Axis Inova é compatível com a LGPD?",
    a: "Sim. O sistema foi desenvolvido com conformidade à LGPD, incluindo controle de acesso granular, logs de auditoria completos e política de privacidade."
  }
];

export function FAQSection() {
  return (
    <section id="faq" className="bg-[#F5F7FA] py-20 md:py-24">
      <div className="mx-auto max-w-[800px] px-4 md:px-6">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Tire suas dúvidas sobre o funcionamento do Axis Inova.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="rounded-xl border border-border bg-white px-6 transition-all data-[state=open]:border-primary/50 data-[state=open]:shadow-md"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}