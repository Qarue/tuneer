export type MermaidTheme = 'light' | 'dark'

export type RenderResult = { ok: true; svg: string } | { ok: false; error: string }

let renderCounter = 0

const toMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}

export const SAMPLE_DIAGRAM = `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Ship it]
    B -- No --> D[Debug]
    D --> B`

/**
 * Renders Mermaid source into an SVG string. The mermaid library is imported
 * dynamically so it stays out of the main bundle until the tool is used.
 */
export const renderMermaid = async (
  source: string,
  theme: MermaidTheme = 'dark',
): Promise<RenderResult> => {
  const trimmed = source.trim()

  if (!trimmed) {
    return { ok: false, error: 'Enter a diagram definition to render.' }
  }

  try {
    const { default: mermaid } = await import('mermaid')

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      // Render labels as native SVG <text> rather than HTML <foreignObject>.
      // foreignObject taints a canvas, which would block PNG export.
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    })

    // Validates the syntax and throws a descriptive error when invalid.
    await mermaid.parse(trimmed)

    renderCounter += 1
    const { svg } = await mermaid.render(`tuneer-mermaid-${renderCounter}`, trimmed)

    return { ok: true, svg }
  } catch (error) {
    return { ok: false, error: toMessage(error, 'Unable to render the diagram.') }
  }
}
