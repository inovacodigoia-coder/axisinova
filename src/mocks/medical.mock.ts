import type { AttendanceRecord, PatientAlert, CID10, PatientMedication, ExamResult } from '@/types/medical.types'

function d(offset: number): string {
  const dt = new Date()
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().split('T')[0]
}

const today = d(0)

export const MOCK_CID10: CID10[] = [
  { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores', category: 'Doenças do aparelho respiratório' },
  { code: 'J00', description: 'Nasofaringite aguda (resfriado comum)', category: 'Doenças do aparelho respiratório' },
  { code: 'J45.0', description: 'Asma predominantemente alérgica', category: 'Doenças do aparelho respiratório' },
  { code: 'J45.1', description: 'Asma não alérgica', category: 'Doenças do aparelho respiratório' },
  { code: 'J18.9', description: 'Pneumonia não especificada', category: 'Doenças do aparelho respiratório' },
  { code: 'J30.1', description: 'Rinite alérgica devida a pólen', category: 'Doenças do aparelho respiratório' },
  { code: 'J02.9', description: 'Faringite aguda não especificada', category: 'Doenças do aparelho respiratório' },
  { code: 'J03.9', description: 'Amigdalite aguda não especificada', category: 'Doenças do aparelho respiratório' },
  { code: 'K21.0', description: 'Doença de refluxo gastroesofágico com esofagite', category: 'Doenças do aparelho digestivo' },
  { code: 'K29.1', description: 'Outras gastrites agudas', category: 'Doenças do aparelho digestivo' },
  { code: 'K57.3', description: 'Doença diverticular do intestino grosso', category: 'Doenças do aparelho digestivo' },
  { code: 'K30', description: 'Dispepsia funcional', category: 'Doenças do aparelho digestivo' },
  { code: 'F32.0', description: 'Episódio depressivo leve', category: 'Transtornos mentais' },
  { code: 'F32.1', description: 'Episódio depressivo moderado', category: 'Transtornos mentais' },
  { code: 'F41.1', description: 'Ansiedade generalizada', category: 'Transtornos mentais' },
  { code: 'F41.0', description: 'Transtorno de pânico', category: 'Transtornos mentais' },
  { code: 'F51.0', description: 'Insônia não orgânica', category: 'Transtornos mentais' },
  { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Doenças do aparelho circulatório' },
  { code: 'I25.9', description: 'Doença isquêmica crônica do coração', category: 'Doenças do aparelho circulatório' },
  { code: 'I11.9', description: 'Doença cardíaca hipertensiva sem ICC', category: 'Doenças do aparelho circulatório' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', category: 'Doenças endócrinas' },
  { code: 'E10.9', description: 'Diabetes mellitus tipo 1 sem complicações', category: 'Doenças endócrinas' },
  { code: 'E78.0', description: 'Hipercolesterolemia pura', category: 'Doenças endócrinas' },
  { code: 'E03.9', description: 'Hipotireoidismo não especificado', category: 'Doenças endócrinas' },
  { code: 'E66.0', description: 'Obesidade devida a excesso de calorias', category: 'Doenças endócrinas' },
  { code: 'N30.0', description: 'Cistite aguda', category: 'Doenças do aparelho geniturinário' },
  { code: 'N39.0', description: 'Infecção do trato urinário', category: 'Doenças do aparelho geniturinário' },
  { code: 'N76.0', description: 'Vaginite aguda', category: 'Doenças do aparelho geniturinário' },
  { code: 'M54.5', description: 'Dor lombar baixa', category: 'Doenças do sistema osteomuscular' },
  { code: 'M54.4', description: 'Lumbago com ciática', category: 'Doenças do sistema osteomuscular' },
  { code: 'M79.1', description: 'Mialgia', category: 'Doenças do sistema osteomuscular' },
  { code: 'M25.5', description: 'Dor articular', category: 'Doenças do sistema osteomuscular' },
  { code: 'M75.1', description: 'Síndrome do manguito rotador', category: 'Doenças do sistema osteomuscular' },
  { code: 'A09.9', description: 'Gastroenterite e colite de origem infecciosa', category: 'Doenças infecciosas' },
  { code: 'B34.9', description: 'Infecção viral não especificada', category: 'Doenças infecciosas' },
  { code: 'B00.9', description: 'Infecção pelo vírus herpes simples', category: 'Doenças infecciosas' },
  { code: 'L20.9', description: 'Dermatite atópica não especificada', category: 'Doenças da pele' },
  { code: 'L30.9', description: 'Dermatite não especificada', category: 'Doenças da pele' },
  { code: 'L50.0', description: 'Urticária alérgica', category: 'Doenças da pele' },
  { code: 'L02.9', description: 'Abscesso cutâneo, furúnculo e carbúnculo', category: 'Doenças da pele' },
  { code: 'H52.4', description: 'Presbiopia', category: 'Doenças do olho' },
  { code: 'H10.1', description: 'Conjuntivite aguda atópica', category: 'Doenças do olho' },
  { code: 'H66.9', description: 'Otite média não especificada', category: 'Doenças do ouvido' },
  { code: 'G43.9', description: 'Enxaqueca não especificada', category: 'Doenças do sistema nervoso' },
  { code: 'G44.2', description: 'Cefaleia tensional', category: 'Doenças do sistema nervoso' },
  { code: 'R10.4', description: 'Outras dores abdominais', category: 'Sintomas e sinais' },
  { code: 'R50.9', description: 'Febre não especificada', category: 'Sintomas e sinais' },
  { code: 'R51', description: 'Cefaleia', category: 'Sintomas e sinais' },
  { code: 'Z76.3', description: 'Pessoa em boa saúde acompanhando pessoa doente', category: 'Fatores de contato' },
  { code: 'Z00.0', description: 'Exame médico geral', category: 'Fatores de contato' },
]

export const MOCK_MEDICATIONS_LIST = [
  'Amoxicilina 500mg', 'Azitromicina 500mg', 'Ibuprofeno 600mg', 'Paracetamol 750mg',
  'Dipirona 500mg', 'Omeprazol 20mg', 'Loratadina 10mg', 'Metformina 850mg',
  'Losartana 50mg', 'Atorvastatina 20mg', 'Atenolol 50mg', 'Hidroclorotiazida 25mg',
  'Sinvastatina 40mg', 'Captopril 25mg', 'Enalapril 10mg', 'Fluoxetina 20mg',
  'Sertralina 50mg', 'Clonazepam 2mg', 'Diazepam 10mg', 'Prednisona 20mg',
  'Dexametasona 4mg', 'Cefalexina 500mg', 'Ciprofloxacino 500mg', 'Metronidazol 400mg',
  'Ranitidina 150mg', 'Pantoprazol 40mg', 'AAS 100mg', 'Levotiroxina 50mcg',
  'Insulina NPH', 'Insulina Regular',
]

export const MOCK_PATIENT_ALERTS: PatientAlert[] = [
  { id: 'alert_01', patientId: 'pat_01', type: 'allergy', severity: 'critical', description: 'Alergia a Dipirona — reação anafilática', createdBy: 'Dr. Henrique Lima', createdAt: d(-180), isActive: true },
  { id: 'alert_02', patientId: 'pat_01', type: 'chronic_condition', severity: 'high', description: 'Hipertensão Arterial Sistêmica (I10)', createdBy: 'Dr. Henrique Lima', createdAt: d(-365), isActive: true },
  { id: 'alert_03', patientId: 'pat_01', type: 'chronic_condition', severity: 'high', description: 'Diabetes Mellitus Tipo 2 (E11.9)', createdBy: 'Dr. Henrique Lima', createdAt: d(-365), isActive: true },
  { id: 'alert_04', patientId: 'pat_01', type: 'medication_in_use', severity: 'medium', description: 'Metformina 850mg 2x/dia — uso contínuo', createdBy: 'Dr. Henrique Lima', createdAt: d(-90), isActive: true },
  { id: 'alert_05', patientId: 'pat_03', type: 'allergy', severity: 'high', description: 'Alergia a Penicilina — urticária e angioedema', createdBy: 'Dr. Henrique Lima', createdAt: d(-200), isActive: true },
  { id: 'alert_06', patientId: 'pat_03', type: 'chronic_condition', severity: 'medium', description: 'Dislipidemia (E78.0)', createdBy: 'Dr. Henrique Lima', createdAt: d(-120), isActive: true },
  { id: 'alert_07', patientId: 'pat_05', type: 'allergy', severity: 'medium', description: 'Alergia a AAS — broncoespasmo', createdBy: 'Dr. Roberto Santos', createdAt: d(-300), isActive: true },
  { id: 'alert_08', patientId: 'pat_05', type: 'chronic_condition', severity: 'high', description: 'DPOC (J44.1)', createdBy: 'Dr. Roberto Santos', createdAt: d(-400), isActive: true },
  { id: 'alert_09', patientId: 'pat_08', type: 'allergy', severity: 'low', description: 'Intolerância à Lactose', createdBy: 'Dra. Mariana Lopes', createdAt: d(-150), isActive: true },
  { id: 'alert_10', patientId: 'pat_11', type: 'chronic_condition', severity: 'high', description: 'Insuficiência Cardíaca Congestiva (I50.0)', createdBy: 'Dr. Henrique Lima', createdAt: d(-500), isActive: true },
  { id: 'alert_11', patientId: 'pat_11', type: 'medication_in_use', severity: 'medium', description: 'Warfarina 5mg — controle de INR', createdBy: 'Dr. Henrique Lima', createdAt: d(-60), isActive: true },
]

export const MOCK_PATIENT_MEDICATIONS: PatientMedication[] = [
  { id: 'med_01', patientId: 'pat_01', medication: 'Metformina 850mg', dosage: '850mg', frequency: '2x/dia', startDate: d(-180), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_02', patientId: 'pat_01', medication: 'Losartana 50mg', dosage: '50mg', frequency: '1x/dia', startDate: d(-365), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_03', patientId: 'pat_01', medication: 'Atorvastatina 20mg', dosage: '20mg', frequency: '1x/dia', startDate: d(-120), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_04', patientId: 'pat_03', medication: 'Sinvastatina 40mg', dosage: '40mg', frequency: '1x/dia', startDate: d(-120), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_05', patientId: 'pat_05', medication: 'Atenolol 50mg', dosage: '50mg', frequency: '1x/dia', startDate: d(-200), status: 'active', prescribedBy: 'Dr. Roberto Santos' },
  { id: 'med_06', patientId: 'pat_11', medication: 'Enalapril 10mg', dosage: '10mg', frequency: '2x/dia', startDate: d(-400), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_07', patientId: 'pat_11', medication: 'Warfarina 5mg', dosage: '5mg', frequency: '1x/dia', startDate: d(-60), status: 'active', prescribedBy: 'Dr. Henrique Lima' },
  { id: 'med_08', patientId: 'pat_01', medication: 'Amoxicilina 500mg', dosage: '500mg', frequency: '8/8h', startDate: d(-30), endDate: d(-23), status: 'completed', prescribedBy: 'Dr. Henrique Lima' },
]

export const MOCK_EXAM_RESULTS: ExamResult[] = [
  { id: 'exr_01', patientId: 'pat_01', examName: 'Hemograma Completo', examCode: '40304361', requestedBy: 'Dr. Henrique Lima', requestedAt: d(-17), status: 'delivered', resultDate: d(-14), resultSummary: 'Hemoglobina 13.5 g/dL, leucócitos 7.200/mm³' },
  { id: 'exr_02', patientId: 'pat_01', examName: 'Glicemia de Jejum', examCode: '40301630', requestedBy: 'Dr. Henrique Lima', requestedAt: d(-17), status: 'delivered', resultDate: d(-14), resultSummary: '126 mg/dL (elevada)' },
  { id: 'exr_03', patientId: 'pat_01', examName: 'Eletrocardiograma', examCode: '40101010', requestedBy: 'Dr. Henrique Lima', requestedAt: d(-17), status: 'delivered', resultDate: d(-15), resultSummary: 'Ritmo sinusal, sem alterações significativas' },
  { id: 'exr_04', patientId: 'pat_01', examName: 'HbA1c', examCode: '40302040', requestedBy: 'Dr. Henrique Lima', requestedAt: d(-3), status: 'in_analysis' },
  { id: 'exr_05', patientId: 'pat_03', examName: 'Perfil Lipídico', examCode: '40301800', requestedBy: 'Dr. Henrique Lima', requestedAt: d(-14), status: 'result_available', resultDate: d(-10), resultSummary: 'CT 245 mg/dL, LDL 165 mg/dL, HDL 42 mg/dL' },
  { id: 'exr_06', patientId: 'pat_05', examName: 'Espirometria', examCode: '40201058', requestedBy: 'Dr. Roberto Santos', requestedAt: d(-7), status: 'requested' },
  { id: 'exr_07', patientId: 'pat_08', examName: 'Ultrassonografia Obstétrica', examCode: '40901017', requestedBy: 'Dra. Mariana Lopes', requestedAt: d(-4), status: 'collected' },
]

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att_01', appointmentId: 'apt_31', patientId: 'pat_01', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-3)}T08:05:00`, finishedAt: `${d(-3)}T08:32:00`, duration: 27,
    chiefComplaint: 'Paciente retorna para acompanhamento de HAS e DM2. Refere bom controle pressórico, mas queixa de sede excessiva nas últimas 2 semanas.',
    anamnesis: 'Paciente com HAS e DM2 diagnosticados há 5 anos, em uso regular de Losartana 50mg e Metformina 850mg. Nega dor precordial, dispneia ou edema. Refere polidipsia há 2 semanas. Dieta irregular, admite consumo excessivo de carboidratos. Atividade física 2x/semana (caminhada 30min).',
    physicalExam: 'BEG, corado, hidratado, acianótico, anictérico. PA: 135/85 mmHg. FC: 72 bpm. Ausculta cardíaca: BRNF 2T sem sopros. Ausculta pulmonar: MV presente bilateral, sem RA. Abdome: plano, flácido, RHA+, indolor à palpação. MMII: sem edema.',
    vitalSigns: { bloodPressureSystolic: 135, bloodPressureDiastolic: 85, heartRate: 72, temperature: 36.4, oxygenSaturation: 98, weight: 82, height: 172, bmi: 27.7, glucometry: 156, respiratoryRate: 16, recordedAt: `${d(-3)}T08:07:00` },
    diagnosis: { cid10Primary: { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', category: 'Doenças endócrinas' }, cid10Secondary: [{ code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Doenças do aparelho circulatório' }], type: 'confirmed' },
    prescription: [
      { id: 'rx_01', medication: 'Metformina 850mg', dosage: '850mg', form: 'Comprimido', route: 'Oral', frequency: '2x/dia', duration: 'Uso contínuo', quantity: 60, instructions: 'Tomar após café e jantar', isControlled: false },
      { id: 'rx_02', medication: 'Losartana 50mg', dosage: '50mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: 'Uso contínuo', quantity: 30, instructions: 'Tomar pela manhã', isControlled: false },
    ],
    examRequests: [{ id: 'erq_01', examCatalogId: 'ex_01', examCatalogType: 'exam' as const, examId: 'ex_01', examName: 'HbA1c', examCode: '40302040', urgency: 'routine' as const, clinicalIndication: 'Controle glicêmico - DM2', requestedAt: `${d(-3)}T08:28:00` }],
    followUpDays: 30, followUpNotes: 'Retorno com resultados de HbA1c para reavaliação terapêutica',
    notes: 'Orientado sobre importância da dieta e atividade física regular. Encaminhado para nutricionista.',
    status: 'signed', signedAt: `${d(-3)}T08:32:00`, createdBy: 'doc_01', updatedAt: d(-3),
  },
  {
    id: 'att_02', appointmentId: 'apt_32', patientId: 'pat_01', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-10)}T08:10:00`, finishedAt: `${d(-10)}T08:35:00`, duration: 25,
    chiefComplaint: 'Acompanhamento de rotina. Sem queixas novas.',
    vitalSigns: { bloodPressureSystolic: 130, bloodPressureDiastolic: 82, heartRate: 68, temperature: 36.2, oxygenSaturation: 99, weight: 83, height: 172, bmi: 28.1, glucometry: 132, respiratoryRate: 14, recordedAt: `${d(-10)}T08:12:00` },
    diagnosis: { cid10Primary: { code: 'Z00.0', description: 'Exame médico geral', category: 'Fatores de contato' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_03', medication: 'Metformina 850mg', dosage: '850mg', form: 'Comprimido', route: 'Oral', frequency: '2x/dia', duration: 'Uso contínuo', quantity: 60, isControlled: false },
    ],
    status: 'signed', signedAt: `${d(-10)}T08:35:00`, createdBy: 'doc_01', updatedAt: d(-10),
  },
  {
    id: 'att_03', appointmentId: 'apt_34', patientId: 'pat_01', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-24)}T08:02:00`, finishedAt: `${d(-24)}T08:40:00`, duration: 38,
    chiefComplaint: 'Primeira consulta. Paciente encaminhado por médico do trabalho por glicemia alterada e PA elevada.',
    anamnesis: 'Paciente relata descoberta de glicemia elevada em exame periódico da empresa. PA aferida em 150/95 no exame. Nega sintomas cardiovasculares. HF: pai diabético e hipertenso (falecido por IAM aos 62 anos). Mãe hipertensa em tratamento.',
    physicalExam: 'BEG. PA: 148/92. FC: 76. Exame cardiovascular e pulmonar sem alterações. IMC 28.5 (sobrepeso).',
    vitalSigns: { bloodPressureSystolic: 148, bloodPressureDiastolic: 92, heartRate: 76, temperature: 36.5, oxygenSaturation: 98, weight: 84, height: 172, bmi: 28.5, glucometry: 180, respiratoryRate: 16, recordedAt: `${d(-24)}T08:05:00` },
    diagnosis: { cid10Primary: { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', category: 'Doenças endócrinas' }, cid10Secondary: [{ code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Doenças do aparelho circulatório' }], type: 'working' },
    prescription: [
      { id: 'rx_04', medication: 'Metformina 850mg', dosage: '850mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: 'Uso contínuo', quantity: 30, instructions: 'Iniciar com 1x/dia e aumentar para 2x/dia após 2 semanas', isControlled: false },
      { id: 'rx_05', medication: 'Losartana 50mg', dosage: '50mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: 'Uso contínuo', quantity: 30, isControlled: false },
    ],
    examRequests: [
      { id: 'erq_02', examCatalogId: 'ex_01', examCatalogType: 'exam' as const, examId: 'ex_01', examName: 'Hemograma Completo', examCode: '40304361', urgency: 'routine' as const, clinicalIndication: 'Avaliação inicial', requestedAt: `${d(-24)}T08:30:00` },
      { id: 'erq_03', examCatalogId: 'ex_02', examCatalogType: 'exam' as const, examId: 'ex_02', examName: 'Eletrocardiograma', examCode: '40101010', urgency: 'routine' as const, clinicalIndication: 'Avaliação cardiovascular inicial', requestedAt: `${d(-24)}T08:30:00` },
    ],
    followUpDays: 14,
    status: 'signed', signedAt: `${d(-24)}T08:40:00`, createdBy: 'doc_01', updatedAt: d(-24),
  },
  {
    id: 'att_04', appointmentId: 'apt_35', patientId: 'pat_01', doctorId: 'doc_03', companyId: 'comp_001',
    startedAt: `${d(-7)}T09:05:00`, finishedAt: `${d(-7)}T09:50:00`, duration: 45,
    chiefComplaint: 'Avaliação cardiológica. Encaminhado por clínico geral para avaliação de HAS.',
    anamnesis: 'Paciente hipertenso e diabético tipo 2, encaminhado para avaliação cardiológica complementar. PA controlada com Losartana 50mg. Nega angina, dispneia, palpitações.',
    physicalExam: 'BEG. PA: 128/78. FC: 70. Ausculta cardíaca sem sopros. ECG prévio sem alterações.',
    vitalSigns: { bloodPressureSystolic: 128, bloodPressureDiastolic: 78, heartRate: 70, temperature: 36.3, oxygenSaturation: 99, weight: 82, height: 172, bmi: 27.7, recordedAt: `${d(-7)}T09:08:00` },
    diagnosis: { cid10Primary: { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Doenças do aparelho circulatório' }, type: 'confirmed' },
    notes: 'Risco cardiovascular moderado. Manter tratamento atual. Orientado atividade física regular.',
    followUpDays: 90,
    status: 'signed', signedAt: `${d(-7)}T09:50:00`, createdBy: 'doc_03', updatedAt: d(-7),
  },
  {
    id: 'att_05', appointmentId: 'apt_36', patientId: 'pat_02', doctorId: 'doc_04', companyId: 'comp_001',
    startedAt: `${d(-5)}T08:05:00`, finishedAt: `${d(-5)}T08:28:00`, duration: 23,
    chiefComplaint: 'Dor de garganta há 3 dias, febre 38.2°C ontem à noite.',
    anamnesis: 'Paciente refere odinofagia progressiva há 3 dias, acompanhada de febre (38.2°C aferida ontem). Nega tosse, rinorreia ou cefaleia. Sem comorbidades.',
    physicalExam: 'Orofaringe hiperemiada com exsudato purulento em amígdalas bilateral. Linfonodos cervicais palpáveis e dolorosos bilateralmente. Otoscopia normal.',
    vitalSigns: { bloodPressureSystolic: 110, bloodPressureDiastolic: 70, heartRate: 88, temperature: 37.8, oxygenSaturation: 98, weight: 58, height: 165, bmi: 21.3, recordedAt: `${d(-5)}T08:08:00` },
    diagnosis: { cid10Primary: { code: 'J03.9', description: 'Amigdalite aguda não especificada', category: 'Doenças do aparelho respiratório' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_06', medication: 'Amoxicilina 500mg', dosage: '500mg', form: 'Cápsula', route: 'Oral', frequency: '8/8h', duration: '10 dias', quantity: 30, instructions: 'Completar o tratamento mesmo com melhora', isControlled: false },
      { id: 'rx_07', medication: 'Ibuprofeno 600mg', dosage: '600mg', form: 'Comprimido', route: 'Oral', frequency: '8/8h', duration: '5 dias', quantity: 15, instructions: 'Tomar se dor ou febre', isControlled: false },
    ],
    certificateDays: 2, certificateReason: 'Tratamento médico',
    followUpDays: 10, followUpNotes: 'Retorno se não melhorar em 72h',
    status: 'signed', signedAt: `${d(-5)}T08:28:00`, createdBy: 'doc_04', updatedAt: d(-5),
  },
  {
    id: 'att_06', appointmentId: 'apt_37', patientId: 'pat_02', doctorId: 'doc_04', companyId: 'comp_001',
    startedAt: `${d(-19)}T08:02:00`, finishedAt: `${d(-19)}T08:25:00`, duration: 23,
    chiefComplaint: 'Primeira consulta. Rinite alérgica com crises frequentes.',
    vitalSigns: { bloodPressureSystolic: 105, bloodPressureDiastolic: 68, heartRate: 74, temperature: 36.1, oxygenSaturation: 99, weight: 57, height: 165, bmi: 20.9, recordedAt: `${d(-19)}T08:05:00` },
    diagnosis: { cid10Primary: { code: 'J30.1', description: 'Rinite alérgica devida a pólen', category: 'Doenças do aparelho respiratório' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_08', medication: 'Loratadina 10mg', dosage: '10mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: '30 dias', quantity: 30, isControlled: false },
    ],
    status: 'signed', signedAt: `${d(-19)}T08:25:00`, createdBy: 'doc_04', updatedAt: d(-19),
  },
  {
    id: 'att_07', appointmentId: 'apt_38', patientId: 'pat_03', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-14)}T09:25:00`, finishedAt: `${d(-14)}T09:55:00`, duration: 30,
    chiefComplaint: 'Retorno para reavaliação de perfil lipídico. Traz exames.',
    vitalSigns: { bloodPressureSystolic: 125, bloodPressureDiastolic: 80, heartRate: 65, temperature: 36.3, oxygenSaturation: 98, weight: 78, height: 175, bmi: 25.5, recordedAt: `${d(-14)}T09:28:00` },
    diagnosis: { cid10Primary: { code: 'E78.0', description: 'Hipercolesterolemia pura', category: 'Doenças endócrinas' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_09', medication: 'Sinvastatina 40mg', dosage: '40mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: 'Uso contínuo', quantity: 30, instructions: 'Tomar à noite', isControlled: false },
    ],
    followUpDays: 90,
    status: 'signed', signedAt: `${d(-14)}T09:55:00`, createdBy: 'doc_01', updatedAt: d(-14),
  },
  {
    id: 'att_08', appointmentId: 'apt_09', patientId: 'pat_09', doctorId: 'doc_02', companyId: 'comp_001',
    startedAt: `${today}T07:05:00`, finishedAt: `${today}T07:20:00`, duration: 15,
    chiefComplaint: 'Dor lombar há 5 dias após esforço físico.',
    vitalSigns: { bloodPressureSystolic: 120, bloodPressureDiastolic: 75, heartRate: 72, temperature: 36.4, oxygenSaturation: 99, weight: 75, height: 178, bmi: 23.7, recordedAt: `${today}T07:07:00` },
    diagnosis: { cid10Primary: { code: 'M54.5', description: 'Dor lombar baixa', category: 'Doenças do sistema osteomuscular' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_10', medication: 'Ibuprofeno 600mg', dosage: '600mg', form: 'Comprimido', route: 'Oral', frequency: '8/8h', duration: '7 dias', quantity: 21, instructions: 'Tomar após refeição', isControlled: false },
      { id: 'rx_11', medication: 'Ciclobenzaprina 5mg', dosage: '5mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: '7 dias', quantity: 7, instructions: 'Tomar à noite antes de dormir', isControlled: false },
    ],
    certificateDays: 3, certificateReason: 'Repouso — lombalgia aguda',
    status: 'signed', signedAt: `${today}T07:20:00`, createdBy: 'doc_02', updatedAt: today,
  },
  {
    id: 'att_09', appointmentId: 'apt_10', patientId: 'pat_10', doctorId: 'doc_02', companyId: 'comp_001',
    startedAt: `${today}T07:30:00`, finishedAt: `${today}T07:45:00`, duration: 15,
    chiefComplaint: 'Cefaleia recorrente, tipo tensional, 3x por semana.',
    vitalSigns: { bloodPressureSystolic: 108, bloodPressureDiastolic: 68, heartRate: 70, temperature: 36.2, oxygenSaturation: 99, weight: 55, height: 160, bmi: 21.5, recordedAt: `${today}T07:32:00` },
    diagnosis: { cid10Primary: { code: 'G44.2', description: 'Cefaleia tensional', category: 'Doenças do sistema nervoso' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_12', medication: 'Paracetamol 750mg', dosage: '750mg', form: 'Comprimido', route: 'Oral', frequency: 'Se dor', duration: '30 dias', quantity: 20, instructions: 'Máximo 4x ao dia', isControlled: false },
    ],
    status: 'signed', signedAt: `${today}T07:45:00`, createdBy: 'doc_02', updatedAt: today,
  },
  {
    id: 'att_10', appointmentId: 'apt_45', patientId: 'pat_15', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-2)}T14:05:00`, finishedAt: `${d(-2)}T14:30:00`, duration: 25,
    chiefComplaint: 'Quadro gripal há 4 dias. Tosse produtiva, coriza, mal-estar.',
    vitalSigns: { bloodPressureSystolic: 118, bloodPressureDiastolic: 72, heartRate: 80, temperature: 37.5, oxygenSaturation: 97, weight: 80, height: 180, bmi: 24.7, recordedAt: `${d(-2)}T14:08:00` },
    diagnosis: { cid10Primary: { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores', category: 'Doenças do aparelho respiratório' }, type: 'confirmed' },
    prescription: [
      { id: 'rx_13', medication: 'Paracetamol 750mg', dosage: '750mg', form: 'Comprimido', route: 'Oral', frequency: '6/6h', duration: '5 dias', quantity: 20, instructions: 'Se febre ou dor', isControlled: false },
      { id: 'rx_14', medication: 'Loratadina 10mg', dosage: '10mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: '7 dias', quantity: 7, isControlled: false },
    ],
    certificateDays: 2,
    status: 'signed', signedAt: `${d(-2)}T14:30:00`, createdBy: 'doc_01', updatedAt: d(-2),
  },
  {
    id: 'att_11', appointmentId: 'apt_46', patientId: 'pat_16', doctorId: 'doc_01', companyId: 'comp_001',
    startedAt: `${d(-15)}T08:05:00`, finishedAt: `${d(-15)}T08:30:00`, duration: 25,
    chiefComplaint: 'Azia e queimação epigástrica há 2 semanas.',
    vitalSigns: { bloodPressureSystolic: 112, bloodPressureDiastolic: 70, heartRate: 68, temperature: 36.3, oxygenSaturation: 99, weight: 62, height: 163, bmi: 23.3, recordedAt: `${d(-15)}T08:08:00` },
    diagnosis: { cid10Primary: { code: 'K21.0', description: 'Doença de refluxo gastroesofágico com esofagite', category: 'Doenças do aparelho digestivo' }, type: 'working' },
    prescription: [
      { id: 'rx_15', medication: 'Omeprazol 20mg', dosage: '20mg', form: 'Cápsula', route: 'Oral', frequency: '1x/dia', duration: '30 dias', quantity: 30, instructions: 'Tomar em jejum 30 min antes do café', isControlled: false },
    ],
    examRequests: [{ id: 'erq_04', examCatalogId: 'ex_12', examCatalogType: 'exam' as const, examId: 'ex_12', examName: 'Endoscopia Digestiva Alta', examCode: '40202011', urgency: 'routine' as const, clinicalIndication: 'DRGE com sintomas persistentes', requestedAt: `${d(-15)}T08:25:00` }],
    followUpDays: 30,
    status: 'signed', signedAt: `${d(-15)}T08:30:00`, createdBy: 'doc_01', updatedAt: d(-15),
  },
  {
    id: 'att_12', appointmentId: 'apt_50', patientId: 'pat_20', doctorId: 'doc_04', companyId: 'comp_001',
    startedAt: `${d(-7)}T14:05:00`, finishedAt: `${d(-7)}T14:30:00`, duration: 25,
    chiefComplaint: 'Ansiedade e insônia há 3 meses. Piora recente.',
    vitalSigns: { bloodPressureSystolic: 118, bloodPressureDiastolic: 74, heartRate: 82, temperature: 36.4, oxygenSaturation: 99, weight: 56, height: 162, bmi: 21.3, recordedAt: `${d(-7)}T14:08:00` },
    diagnosis: { cid10Primary: { code: 'F41.1', description: 'Ansiedade generalizada', category: 'Transtornos mentais' }, cid10Secondary: [{ code: 'F51.0', description: 'Insônia não orgânica', category: 'Transtornos mentais' }], type: 'confirmed' },
    prescription: [
      { id: 'rx_16', medication: 'Sertralina 50mg', dosage: '50mg', form: 'Comprimido', route: 'Oral', frequency: '1x/dia', duration: '90 dias', quantity: 90, instructions: 'Tomar pela manhã. Não interromper sem orientação médica.', isControlled: true },
    ],
    notes: 'Encaminhada para psicoterapia. Orientada sobre higiene do sono.',
    followUpDays: 30,
    status: 'signed', signedAt: `${d(-7)}T14:30:00`, createdBy: 'doc_04', updatedAt: d(-7),
  },
  // Active attendance
  {
    id: 'att_active', appointmentId: 'apt_06', patientId: 'pat_06', doctorId: 'doc_04', companyId: 'comp_001',
    startedAt: `${today}T08:05:00`,
    chiefComplaint: 'Retorno para acompanhamento de rinite alérgica.',
    vitalSigns: { bloodPressureSystolic: 115, bloodPressureDiastolic: 72, heartRate: 74, temperature: 36.2, oxygenSaturation: 99, weight: 64, height: 168, bmi: 22.7, recordedAt: `${today}T08:08:00` },
    status: 'in_progress', createdBy: 'doc_04', updatedAt: today,
  },
]

// Helper to get attendance records for a patient
export function getPatientAttendances(patientId: string): AttendanceRecord[] {
  return MOCK_ATTENDANCE_RECORDS
    .filter(a => a.patientId === patientId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

// Helper to get alerts for a patient
export function getPatientAlerts(patientId: string): PatientAlert[] {
  return MOCK_PATIENT_ALERTS.filter(a => a.patientId === patientId && a.isActive)
}

export function getPatientMedications(patientId: string): PatientMedication[] {
  return MOCK_PATIENT_MEDICATIONS.filter(m => m.patientId === patientId)
}

export function getPatientExamResults(patientId: string): ExamResult[] {
  return MOCK_EXAM_RESULTS.filter(e => e.patientId === patientId)
}
