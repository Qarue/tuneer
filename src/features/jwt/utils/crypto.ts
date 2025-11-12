import { encodeBase64Url } from './base64url'

const textEncoder = new TextEncoder()

export type JwtAlgorithm = 'none' | 'HS256'

const ALG_TO_DIGEST: Record<Exclude<JwtAlgorithm, 'none'>, HmacKeyGenParams> = {
  HS256: { name: 'HMAC', hash: 'SHA-256' },
}

const getAlgorithm = (algorithm: JwtAlgorithm): HmacKeyGenParams | null => {
  if (algorithm === 'none') {
    return null
  }

  return ALG_TO_DIGEST[algorithm] ?? null
}

export const sign = async (algorithm: JwtAlgorithm, secret: string, data: string): Promise<string> => {
  const alg = getAlgorithm(algorithm)

  if (!alg) {
    return ''
  }

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    alg,
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(alg, key, textEncoder.encode(data))
  return encodeBase64Url(new Uint8Array(signature))
}

export const verify = async (
  algorithm: JwtAlgorithm,
  secret: string,
  data: string,
  signature: string,
): Promise<boolean> => {
  const alg = getAlgorithm(algorithm)

  if (!alg) {
    return signature.length === 0
  }

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    alg,
    false,
    ['verify'],
  )

  const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), char =>
    char.charCodeAt(0),
  )

  return crypto.subtle.verify(alg, key, signatureBytes, textEncoder.encode(data))
}
