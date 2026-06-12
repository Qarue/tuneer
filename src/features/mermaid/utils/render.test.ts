import { beforeEach, describe, expect, it, vi } from 'vitest'

const { initialize, parse, render } = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(),
  render: vi.fn(),
}))

vi.mock('mermaid', () => ({
  default: { initialize, parse, render },
}))

import { renderMermaid, SAMPLE_DIAGRAM } from './render'

describe('renderMermaid', () => {
  beforeEach(() => {
    initialize.mockReset()
    parse.mockReset()
    render.mockReset()
  })

  it('returns an error for empty input without invoking mermaid', async () => {
    const result = await renderMermaid('   ')

    expect(result).toEqual({ ok: false, error: 'Enter a diagram definition to render.' })
    expect(parse).not.toHaveBeenCalled()
  })

  it('renders valid source to svg', async () => {
    parse.mockResolvedValue(true)
    render.mockResolvedValue({ svg: '<svg>ok</svg>' })

    const result = await renderMermaid(SAMPLE_DIAGRAM, 'dark')

    expect(result).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }))
  })

  it('uses the default theme for light mode', async () => {
    parse.mockResolvedValue(true)
    render.mockResolvedValue({ svg: '<svg />' })

    await renderMermaid('graph TD; A-->B', 'light')

    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'default' }))
  })

  it('passes the hand-drawn look when requested', async () => {
    parse.mockResolvedValue(true)
    render.mockResolvedValue({ svg: '<svg />' })

    await renderMermaid('graph TD; A-->B', 'dark', 'handDrawn')

    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ look: 'handDrawn' }))
  })

  it('defaults to the classic look', async () => {
    parse.mockResolvedValue(true)
    render.mockResolvedValue({ svg: '<svg />' })

    await renderMermaid('graph TD; A-->B', 'dark')

    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ look: 'classic' }))
  })

  it('returns the parse error message for invalid source', async () => {
    parse.mockRejectedValue(new Error('Parse error on line 1'))

    const result = await renderMermaid('not a diagram')

    expect(result).toEqual({ ok: false, error: 'Parse error on line 1' })
    expect(render).not.toHaveBeenCalled()
  })
})
