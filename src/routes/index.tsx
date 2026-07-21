// All modules implemented: Clinic, Laboratory, Hospital, External Portals, and Financial.

// Fixed registration RLS and duplicate CNPJ handling. Improved company deletion in Super Admin to handle all related records (including Lab/Stock/Pharmacy/Finance).
// Fluxo de exclusão de empresa aprimorado com limpeza sequencial de dados vinculados, remoção de usuários auth e tratamento de erros para garantir integridade.

/*
  TAREFAS PENDENTES:
  - Criar os layouts públicos para /portal/parceiro, /portal/medico e /portal/paciente.
  - Implementar o sistema de Lote de Envio de Amostras para parceiros.
  - Desenvolver o visualizador simplificado de resultados para o portal do paciente.
  - Configurar os disparos reais de e-mail/SMS baseados nos templates definidos.
  - Implementar o token de acesso único de 128 caracteres para resultados de pacientes.
*/
export {}
