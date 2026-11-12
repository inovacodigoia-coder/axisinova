import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LaudoDocument from '@/components/lab/LaudoDocument'
const order: any = { patientName: 'Paciente teste Homem teste', protocol: '24-01', exams: [{ name: 'LIPIDOGRAMA', workbench: 'Bioquímica', results: [
 { parameterName: 'Colesterol Total', value: '180', unit: 'mg/dL', referenceRange: 'Desejável: < 190 mg/dL' },
 { parameterName: 'Colesterol VLDL', value: '2', unit: 'mg/dL', referenceRange: '—' },
 { parameterName: 'OBS:', value: 'fdsfsdfsdfsdfsdfhjsdjkhkjhkjhfdkajhsdjkhaskjhdjkashdjkhashdsajkdashdjaskhdjksha jk ddajkdhsajkhdjksah djashdjkas hdjkash djkashdjkas hdjkashd jkashdjkas hdjkash djkash djkashdjkash djkashd', unit: '', referenceRange: '—' },
]}]}
createRoot(document.getElementById('r')!).render(<LaudoDocument order={order} />)
