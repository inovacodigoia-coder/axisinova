export interface LabReportHeaderProps {companyLogo?:string; secondaryLogo?:string; laboratoryName?:string; laboratorySubtitle?:string}
export function LabReportHeader({companyLogo,secondaryLogo,laboratoryName,laboratorySubtitle}:LabReportHeaderProps) {
  return <div className="flex items-center justify-between mb-6">
    <div className="h-14 w-32 flex items-center">{companyLogo && <img src={companyLogo} alt="Logo principal" className="h-full max-w-full object-contain" />}</div>
    <div className="flex-1 px-4 text-center"><h1 className="text-base font-bold uppercase tracking-wide">{laboratoryName}</h1>{laboratorySubtitle && <p className="text-[10px] text-muted-foreground mt-1">{laboratorySubtitle}</p>}</div>
    <div className="h-14 w-32 flex items-center justify-end">{secondaryLogo && <img src={secondaryLogo} alt="Logo secundário" className="h-full max-w-full object-contain" />}</div>
  </div>
}