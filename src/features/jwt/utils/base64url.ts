const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const encodeBase64Url = (input: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...input))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

export const decodeBase64UrlToBytes = (input: string): Uint8Array => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const base64 = normalized + padding
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export const encodeJsonBase64Url = (value: unknown): string => {
  const json = JSON.stringify(value)
  return encodeBase64Url(encoder.encode(json))
}

export const decodeJsonBase64Url = (input: string): unknown => {
  const bytes = decodeBase64UrlToBytes(input)
  const json = decoder.decode(bytes)
  return JSON.parse(json)
}
