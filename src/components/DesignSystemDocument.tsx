import React from 'react';
import { colors, typography, spacing, shadows, radius } from '../styles/designSystem';
import { GradientButton } from './ui/GradientButton';
import { OutlineButton } from './ui/OutlineButton';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

export const DesignSystemDocument: React.FC = () => {
  return (
    <div className="design-system-pdf p-8 bg-[#F5F7FA] text-[#2D3748] min-h-screen font-sans">
      <header className="mb-12 border-b-2 border-[#E2E8F0] pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A202C] mb-2">
            Design System <span className="text-[#00D4FF]">Axis Inova</span>
          </h1>
          <p className="text-lg text-[#718096]">Especificações Visuais & Identidade de Marca v1.0.2</p>
        </div>
        <div className="text-right text-sm text-[#718096]">
          Gerado em: {new Date().toLocaleDateString('pt-BR')}
        </div>
      </header>

      {/* 1. PALETA DE CORES */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#00D4FF] inline-block"></span>
          1. Paleta de Cores
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(colors).filter(([key]) => typeof colors[key as keyof typeof colors] === 'string' && !colors[key as keyof typeof colors].includes('linear-gradient')).map(([name, hex]) => (
            <div key={name} className="flex flex-col gap-2">
              <div 
                className="h-24 w-full rounded-xl border border-[#E2E8F0] shadow-sm"
                style={{ backgroundColor: hex as string }}
              ></div>
              <div className="px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">{name}</span>
                <p className="font-mono text-sm uppercase">{hex as string}</p>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <div className="h-24 w-full rounded-xl border border-[#E2E8F0] shadow-sm bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7]"></div>
            <div className="px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">Gradient</span>
              <p className="font-mono text-xs uppercase">#00D4FF → #7B2FF7</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TIPOGRAFIA */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-[#7B2FF7]">Aa</span>
          2. Tipografia
        </h2>
        <div className="space-y-8 bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#718096] mb-2 block">Font Family</span>
            <p className="text-xl" style={{ fontFamily: typography.fontFamily }}>
              Inter & Poppins (Sans-serif)
            </p>
          </div>
          <div className="grid gap-6">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718096] mb-1 block">Hero Title</span>
              <p style={{ fontSize: typography.heroTitle.size, fontWeight: typography.heroTitle.weight, lineHeight: typography.heroTitle.lineHeight }}>
                O futuro da gestão clínica
              </p>
            </div>
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718096] mb-1 block">Section Title</span>
              <p style={{ fontSize: typography.sectionTitle.size, fontWeight: typography.sectionTitle.weight }}>
                Soluções Inteligentes
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#718096] mb-1 block">Body Text</span>
              <p style={{ fontSize: typography.body.size, fontWeight: typography.body.weight, lineHeight: typography.body.lineHeight }}>
                A plataforma Axis Inova centraliza toda a operação do seu laboratório ou clínica em um único ecossistema seguro e escalável.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPONENTES BASE */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">3. Componentes Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Botões */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#718096]">Botões (Actions)</h3>
            <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-xl border border-[#E2E8F0]">
              <GradientButton>Gradient Primary</GradientButton>
              <OutlineButton>Outline secondary</OutlineButton>
              <button className="px-4 py-2 bg-[#E53E3E] text-white rounded-[10px] text-sm font-semibold">Destructive</button>
            </div>
          </div>

          {/* Badges / Status */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#718096]">Badges & Status</h3>
            <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-xl border border-[#E2E8F0]">
              <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20">Active</Badge>
              <Badge className="bg-[#38A169]/10 text-[#38A169] border-[#38A169]/20">Success</Badge>
              <Badge className="bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/20">Error</Badge>
              <Badge className="bg-[#D69E2E]/10 text-[#D69E2E] border-[#D69E2E]/20">Warning</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DESIGN TOKENS */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">4. Design Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-none border-[#E2E8F0]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#718096]">Spacings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>Section Y</span> <span className="font-mono">{spacing.sectionY}</span></div>
              <div className="flex justify-between text-sm"><span>Card Padding</span> <span className="font-mono">{spacing.cardPadding}</span></div>
              <div className="flex justify-between text-sm"><span>Container</span> <span className="font-mono">{spacing.containerMax}</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-[#E2E8F0]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#718096]">Rounding (Radius)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>Cards</span> <span className="font-mono">{radius.card}</span></div>
              <div className="flex justify-between text-sm"><span>Buttons</span> <span className="font-mono">{radius.button}</span></div>
              <div className="flex justify-between text-sm"><span>Inputs</span> <span className="font-mono">{radius.input}</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-[#E2E8F0]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#718096]">Shadows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs"><span>Card</span> <span className="font-mono truncate ml-2">{shadows.card}</span></div>
              <div className="flex justify-between text-xs"><span>Hover</span> <span className="font-mono truncate ml-2">{shadows.cardHover}</span></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t border-[#E2E8F0] text-center text-[#718096] text-sm italic">
        © {new Date().getFullYear()} Axis Inova - Sistema de Gestão Inteligente para Saúde.
      </footer>
    </div>
  );
};
