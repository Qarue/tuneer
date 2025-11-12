const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export type Base64Result<T = string> = { ok: true; value: T } | { ok: false; error: string }

export const encodeBase64 = (input: string): Base64Result<string> => {
  try {
    const binary = String.fromCharCode(...textEncoder.encode(input))
    return { ok: true, value: btoa(binary) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown encoding error'
    return { ok: false, error: message }
  }
}

export const decodeBase64 = (input: string): Base64Result<string> => {
  try {
    const binary = atob(input)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return { ok: true, value: textDecoder.decode(bytes) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown decoding error'
    return { ok: false, error: message }
  }
}
