import { useState, useCallback } from 'react'

export interface VoiceCallConfig {
  enabled: boolean
  language: 'pt-BR' | 'pt-PT'
  rate: number
  pitch: number
  volume: number
  callTemplate: string
  callRepetitions: number
  intervalBetweenRepetitions: number
  useSocialName: boolean
}

const DEFAULT_CONFIG: VoiceCallConfig = {
  enabled: true,
  language: 'pt-BR',
  rate: 1,
  pitch: 1,
  volume: 1,
  callTemplate: 'Senha {ticket}. {name}, dirija-se ao {room}.',
  callRepetitions: 2,
  intervalBetweenRepetitions: 3,
  useSocialName: false,
}

export function useVoiceCall() {
  const [config, setConfig] = useState<VoiceCallConfig>(() => {
    const saved = localStorage.getItem('axis_voice_config')
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
  })

  const isSupported = 'speechSynthesis' in window

  const saveConfig = useCallback((updates: Partial<VoiceCallConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('axis_voice_config', JSON.stringify(next))
      return next
    })
  }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !config.enabled) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = config.language
    utterance.rate = config.rate
    utterance.pitch = config.pitch
    utterance.volume = config.volume

    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'))
    if (voices.length > 0) utterance.voice = voices[0]

    speechSynthesis.speak(utterance)
  }, [config, isSupported])

  const callPatient = useCallback((data: { ticket: string; name: string; socialName?: string; room: string; doctor: string; type: string }) => {
    const name = config.useSocialName && data.socialName ? data.socialName : data.name
    const text = config.callTemplate
      .replace('{ticket}', data.ticket)
      .replace('{name}', name)
      .replace('{social_name}', data.socialName || data.name)
      .replace('{room}', data.room)
      .replace('{doctor}', data.doctor)
      .replace('{type}', data.type)

    let count = 0
    const doSpeak = () => {
      speak(text)
      count++
      if (count < config.callRepetitions) {
        setTimeout(doSpeak, config.intervalBetweenRepetitions * 1000)
      }
    }
    doSpeak()
  }, [config, speak])

  const testVoice = useCallback(() => {
    const text = config.callTemplate
      .replace('{ticket}', 'SP 001')
      .replace('{name}', 'João da Silva')
      .replace('{social_name}', 'João da Silva')
      .replace('{room}', 'Consultório 1')
      .replace('{doctor}', 'Dr. Carlos Lima')
      .replace('{type}', 'Consulta')
    speak(text)
  }, [config, speak])

  return { config, saveConfig, speak, callPatient, testVoice, isSupported }
}
