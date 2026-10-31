import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
/** Document bodies paginate at paragraph boundaries rather than shrinking to a single sheet. */
export async function generateDocumentPdf(element:HTMLElement,format:string) {
  const a5=format==='A5';const width=a5?128:190;const height=a5?190:277
  const canvas=await html2canvas(element,{scale:2,useCORS:true,logging:false,backgroundColor:'#ffffff'})
  const ratio=canvas.width/width;const pagePixels=Math.floor(height*ratio)
  const bounds=element.getBoundingClientRect()
  const cuts=Array.from(element.querySelectorAll<HTMLElement>('.template-body > *, .template-signatures')).map(n=>Math.round((n.getBoundingClientRect().bottom-bounds.top)*canvas.width/bounds.width)).filter(n=>n>0).sort((a,b)=>a-b)
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:a5?'a5':'a4'})
  let offset=0,index=0
  while(offset<canvas.height){
    const max=Math.min(offset+pagePixels,canvas.height)
    const available=cuts.filter(c=>c>offset&&c<=max)
    const end=max===canvas.height?max:available.length?available[available.length-1]:max
    const part=document.createElement('canvas');part.width=canvas.width;part.height=end-offset
    const context=part.getContext('2d');if(!context)throw new Error('Não foi possível gerar o documento')
    context.drawImage(canvas,0,offset,canvas.width,part.height,0,0,canvas.width,part.height)
    if(index++)pdf.addPage(a5?'a5':'a4','portrait')
    pdf.addImage(part.toDataURL('image/jpeg',.95),'JPEG',10,10,width,part.height/ratio)
    offset=end
  }
  return pdf.output('blob')
}