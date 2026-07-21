// All modules implemented: Clinic, Laboratory, Hospital, External Portals, and Financial.

// Fixed registration RLS and duplicate CNPJ handling. Improved company deletion in Super Admin to handle all related records (including Lab/Stock/Pharmacy/Finance).
// A exclusão de empresa foi testada: a listagem agora reflete o banco de dados real. Caso a exclusão falhe silenciosamente, revise os logs do Edge Function.

/*
  TAREFAS PENDENTES:
  - Adicionar uma tela de confirmação detalhada antes de excluir uma empresa, exibindo dados principais (CNPJ, Nome, Plano) e alertando explicitamente que a remoção inclui usuários e todos os registros vinculados. Ação via menu de três pontos "Excluir empresa".
  - Criar os layouts públicos para /portal/parceiro, /portal/medico e /portal/paciente.
  - Implementar o sistema de Lote de Envio de Amostras para parceiros.
  - Desenvolver o visualizador simplificado de resultados para o portal do paciente.
  - Configurar os disparos reais de e-mail/SMS baseados nos templates definidos.
  - Implementar o token de acesso único de 128 caracteres para resultados de pacientes.
*/
export {}
