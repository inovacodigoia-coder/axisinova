// Converte a gravação do navegador (webm/opus) em MP3 antes do envio: o contrato da uazapi
// aceita áudio em MP3 ou OGG, e webm não está na lista. A conversão é feita no próprio navegador.
import { Mp3Encoder } from '@breezystack/lamejs'

export async function paraMp3(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const ch = buf.getChannelData(0)
    const pcm = new Int16Array(ch.length)
    for (let i = 0; i < ch.length; i++) { const s = Math.max(-1, Math.min(1, ch[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff }
    const enc = new Mp3Encoder(1, buf.sampleRate, 64)
    const partes: BlobPart[] = []
    for (let i = 0; i < pcm.length; i += 1152) {
      const b = enc.encodeBuffer(pcm.subarray(i, i + 1152))
      if (b.length) partes.push(new Uint8Array(b))
    }
    const f = enc.flush()
    if (f.length) partes.push(new Uint8Array(f))
    return new Blob(partes, { type: 'audio/mpeg' })
  } finally { void ctx.close() }
}
