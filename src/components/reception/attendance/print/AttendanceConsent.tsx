import type { AttendanceControlDocument } from '@/types/payment-print.types'

export function AttendanceConsent({ document: doc }: { document: AttendanceControlDocument }) {
  return <article className="attendance-consent">
    <header><h2>{doc.companyName}</h2><p>{doc.companyAddress}</p><p>{doc.companyPhone}</p></header>
    <h1>TERMO DE CONSENTIMENTO</h1>
    <p><strong>Paciente:</strong> {doc.patientName}</p>
    <p><strong>Pedido:</strong> {doc.orderNumber} · <strong>Data:</strong> {doc.orderDate} {doc.orderTime}</p>
    <p><strong>Nascimento:</strong> {doc.patientBirthDate} · <strong>CPF:</strong> {doc.patientCPF}</p>
    <h3>Exames solicitados</h3>
    <ul>{doc.exams.map((exam, index) => <li key={`${exam.code}-${index}`}>{exam.name}</li>)}</ul>
    <p>Autorizo a coleta das amostras necessárias e a realização dos exames relacionados neste pedido.</p>
    <p>Declaro que tive oportunidade de esclarecer minhas dúvidas com a equipe antes da coleta e que as informações prestadas para o atendimento são verdadeiras.</p>
    <p>Estou ciente de que os dados e resultados deste atendimento serão tratados de forma confidencial, conforme a legislação aplicável.</p>
    <div className="consent-signature">Assinatura do paciente ou responsável legal</div>
    <p>Nome do responsável: __________________________________________________</p>
    <p>Documento: _______________________ Parentesco: _______________________</p>
    <div className="consent-signature">Assinatura do profissional · Data: ____/____/________</div>
  </article>
}