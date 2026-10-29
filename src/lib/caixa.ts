export interface CaixaAcesso { company_id: string; operar: boolean; ver_todos: boolean; reabrir: boolean; configurar: boolean }
export interface FormaCaixa { forma: string; valor: number }
export interface ReciboCaixa { numero: number; via: string; empresa: {nome: string; razao_social: string; cnpj: string; endereco: string; telefone: string}; pagador: string | null; valor: number; formas: FormaCaixa[]; operador: string; data: string; estornado: boolean }
export const dataCaixa = (data: string) => new Date(data).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'})
const unidades=['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
const dezenas=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
const centenas=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']
function grupo(n:number):string { if(n===100)return 'cem'; if(n<20)return unidades[n]; if(n<100)return dezenas[Math.floor(n/10)]+(n%10?' e '+unidades[n%10]:''); return centenas[Math.floor(n/100)]+(n%100?' e '+grupo(n%100):'') }
function inteiro(n:number):string {
 if(!n)return 'zero'; const partes:string[]=[]
 for(const [valor,singular,plural] of [[1e9,'bilhão','bilhões'],[1e6,'milhão','milhões'],[1e3,'mil','mil']] as const){const g=Math.floor(n/valor);if(g){partes.push(valor===1000 && g===1?'mil':grupo(g)+' '+(g===1?singular:plural));n%=valor}}
 if(n)partes.push(grupo(n));return partes.join(' e ')
}
export function valorPorExtenso(valor:number) {
 const cents=Math.round(valor*100),reais=Math.floor(cents/100),centavos=cents%100
 const r=reais?inteiro(reais)+(reais>=1e6 && reais%1e6===0?' de':'')+(reais===1?' real':' reais'):''
 const c=centavos?inteiro(centavos)+(centavos===1?' centavo':' centavos'):''
 return [r,c].filter(Boolean).join(' e ') || 'zero reais'
}