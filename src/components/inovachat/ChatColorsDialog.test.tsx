import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatColorsDialog, DEFAULT_CHAT_COLORS } from './ChatColorsDialog'

afterEach(cleanup)
describe('Cores da conversa', () => {
  it('previews and applies independent background and bubble colors', () => {
    const apply = vi.fn()
    const close = vi.fn()
    render(<ChatColorsDialog colors={DEFAULT_CHAT_COLORS} onApply={apply} onClose={close} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fundo da conversa: Azul' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mensagens recebidas: Rosa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mensagens enviadas: Escuro' }))
    const preview = screen.getByLabelText('Prévia das cores')
    expect(preview.getAttribute('data-chat-background')).toBe('blue')
    expect(preview.getAttribute('data-chat-received')).toBe('rose')
    expect(preview.getAttribute('data-chat-sent')).toBe('dark')
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(apply).toHaveBeenCalledWith({ background: 'blue', received: 'rose', sent: 'dark' })
    expect(close).toHaveBeenCalledOnce()
  })
  it('restores all default colors', () => {
    const apply = vi.fn()
    render(<ChatColorsDialog colors={{ background: 'blue', received: 'rose', sent: 'dark' }} onApply={apply} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(apply).toHaveBeenCalledWith(DEFAULT_CHAT_COLORS)
  })
})