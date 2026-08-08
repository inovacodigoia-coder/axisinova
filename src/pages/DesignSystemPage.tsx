import React from 'react';
import { DesignSystemDocument } from '@/components/DesignSystemDocument';
import { GradientButton } from '@/components/ui/GradientButton';
import { Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DesignSystemPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 no-print">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Pressione Ctrl+P ou clique no botão para salvar como PDF
            </p>
            <GradientButton onClick={handlePrint} className="flex items-center gap-2 shadow-lg">
              <Download className="w-4 h-4" />
              Exportar Design System (PDF)
            </GradientButton>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 print:shadow-none print:border-none print:rounded-none">
          <DesignSystemDocument />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { margin: 0; padding: 0; background: white !important; }
            .no-print { display: none !important; }
            .design-system-pdf { padding: 0 !important; min-height: auto !important; }
            header { margin-bottom: 2rem !important; }
            section { page-break-inside: avoid; margin-bottom: 2rem !important; }
            .bg-white { border: none !important; shadow: none !important; }
          }
        `}} />
      </div>
    </div>
  );
};

export default DesignSystemPage;
