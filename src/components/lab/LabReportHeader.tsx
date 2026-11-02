export interface LabReportHeaderStyle {titleSize?:number; subtitleSize?:number; logoPrimaryHeight?:number; logoSecondaryHeight?:number}
export const HEADER_STYLE_DEFAULTS = {titleSize:16, subtitleSize:10, logoPrimaryHeight:56, logoSecondaryHeight:56}
export function resolveHeaderStyle(s?: LabReportHeaderStyle | null) {
  const n = (v: unknown, d: number) => (typeof v === 'number' && v > 0 ? v : d)
  return {
    titleSize: n(s?.titleSize, HEADER_STYLE_DEFAULTS.titleSize),
    subtitleSize: n(s?.subtitleSize, HEADER_STYLE_DEFAULTS.subtitleSize),
    logoPrimaryHeight: n(s?.logoPrimaryHeight, HEADER_STYLE_DEFAULTS.logoPrimaryHeight),
    logoSecondaryHeight: n(s?.logoSecondaryHeight, HEADER_STYLE_DEFAULTS.logoSecondaryHeight),
  }
}
export function subtitleLines(text?: string | null): string[] {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}
export interface LabReportHeaderProps {companyLogo?:string; secondaryLogo?:string; laboratoryName?:string; laboratorySubtitle?:string; headerStyle?:LabReportHeaderStyle|null}
export function LabReportHeader({companyLogo,secondaryLogo,laboratoryName,laboratorySubtitle,headerStyle}:LabReportHeaderProps) {
  const s = resolveHeaderStyle(headerStyle)
  const lines = subtitleLines(laboratorySubtitle)
  return <div className="flex items-center justify-between mb-6">
    <div className="flex items-center" style={{minHeight:s.logoPrimaryHeight, minWidth:128}}>{companyLogo && <img src={companyLogo} alt="Logo principal" style={{height:s.logoPrimaryHeight, width:'auto'}} className="object-contain" />}</div>
    <div className="flex-1 px-4 text-center"><h1 className="font-bold uppercase tracking-wide" style={{fontSize:s.titleSize}}>{laboratoryName}</h1>{lines.length > 0 && <div className="text-muted-foreground mt-1 text-center" style={{fontSize:s.subtitleSize}}>{lines.map((line, i) => <div key={i} className="text-center leading-snug">{line}</div>)}</div>}</div>
    <div className="flex items-center justify-end" style={{minHeight:s.logoSecondaryHeight, minWidth:128}}>{secondaryLogo && <img src={secondaryLogo} alt="Logo secundário" style={{height:s.logoSecondaryHeight, width:'auto'}} className="object-contain" />}</div>
  </div>
}
