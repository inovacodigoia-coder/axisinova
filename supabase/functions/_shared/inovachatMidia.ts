// Tipos e limites de mídia do InovaChat (Etapa 10C). Usado pelo webhook, worker de mídia e envio.
export const BUCKET = 'inovachat-midia'
export const MAX_RECEBIDA = 16 * 1024 * 1024
export const MAX_IMAGEM = 10 * 1024 * 1024
export const MAX_DOCUMENTO = 20 * 1024 * 1024
export const MAX_AUDIO_SEG = 300

type Cat = 'audio' | 'imagem' | 'video' | 'documento'
export const EXT: Record<string, { cat: Cat; mime: string[] }> = {
  ogg: { cat: 'audio', mime: ['audio/ogg', 'audio/opus'] }, opus: { cat: 'audio', mime: ['audio/opus', 'audio/ogg'] },
  mp3: { cat: 'audio', mime: ['audio/mpeg', 'audio/mp3'] }, m4a: { cat: 'audio', mime: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'] },
  aac: { cat: 'audio', mime: ['audio/aac', 'audio/x-aac'] }, webm: { cat: 'audio', mime: ['audio/webm'] },
  jpg: { cat: 'imagem', mime: ['image/jpeg'] }, jpeg: { cat: 'imagem', mime: ['image/jpeg'] }, png: { cat: 'imagem', mime: ['image/png'] },
  webp: { cat: 'imagem', mime: ['image/webp'] }, gif: { cat: 'imagem', mime: ['image/gif'] },
  mp4: { cat: 'video', mime: ['video/mp4'] }, '3gp': { cat: 'video', mime: ['video/3gpp'] },
  pdf: { cat: 'documento', mime: ['application/pdf'] }, doc: { cat: 'documento', mime: ['application/msword'] },
  docx: { cat: 'documento', mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  xls: { cat: 'documento', mime: ['application/vnd.ms-excel'] },
  xlsx: { cat: 'documento', mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  ppt: { cat: 'documento', mime: ['application/vnd.ms-powerpoint'] },
  pptx: { cat: 'documento', mime: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  txt: { cat: 'documento', mime: ['text/plain'] }, csv: { cat: 'documento', mime: ['text/csv', 'text/plain', 'application/vnd.ms-excel'] },
  zip: { cat: 'documento', mime: ['application/zip', 'application/x-zip-compressed'] },
}

const base = (m: string) => (m || '').toLowerCase().split(';')[0].trim()

/** Extensão a partir do mime (recebidas). null = não suportado. */
export function extDoMime(mime: string): string | null {
  const m = base(mime)
  if (m === 'audio/ogg' || m === 'audio/opus') return 'ogg'
  for (const [ext, v] of Object.entries(EXT)) if (v.mime.includes(m)) return ext === 'jpeg' ? 'jpg' : ext
  return null
}

export const extDoNome = (nome: string) => (nome.split('.').pop() ?? '').toLowerCase()

/** Valida arquivo de envio: extensão + mime compatíveis e na lista. */
export function validarEnvio(nome: string, mime: string): { ok: true; ext: string; cat: Cat } | { ok: false } {
  const ext = extDoNome(nome)
  const e = EXT[ext]
  if (!e || !e.mime.includes(base(mime))) return { ok: false }
  return { ok: true, ext, cat: e.cat }
}
