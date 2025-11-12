import {
  Alert,
  Badge,
  Button,
  CopyButton,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCheck,
  IconClipboard,
  IconEye,
  IconKey,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconShieldCheck,
  IconShieldX,
} from '@tabler/icons-react'
import { type ReactElement, useCallback, useMemo, useState } from 'react'

import { decodeBase64UrlToBytes, decodeJsonBase64Url, encodeJsonBase64Url } from '../utils/base64url'
import { type JwtAlgorithm, sign, verify } from '../utils/crypto'

type DecodedSection = {
  title: 'Header' | 'Payload' | 'Signature'
  content: string
  error?: boolean
}


type Mode = 'decode' | 'encode'

type SignatureState = 'unknown' | 'valid' | 'invalid'

type DecodeError = {
  message: string
  position?: number
}

const algorithms: { label: string; value: JwtAlgorithm }[] = [
  { label: 'HS256', value: 'HS256' },
  { label: 'No signature', value: 'none' },
]

  const formatJson = (value: unknown): string => {
    try {
      return JSON.stringify(value, null, 2)
  } catch {
      return typeof value === 'string' ? value : ''
    }
  }

  const splitToken = (token: string) => token.split('.').filter(part => part.length > 0)

  const defaultHeader = {
    typ: 'JWT',
    alg: 'HS256',
  }

  const defaultPayload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  }

  const defaultHeaderText = JSON.stringify(defaultHeader, null, 2)
  const defaultPayloadText = JSON.stringify(defaultPayload, null, 2)

  export function JWTTool(): ReactElement {
    const [mode, setMode] = useState<Mode>('decode')
    const [input, setInput] = useState('')
    const [secret, setSecret] = useState('')
    const [algorithm, setAlgorithm] = useState<JwtAlgorithm>('HS256')
    const [headerInput, setHeaderInput] = useState(() => defaultHeaderText)
    const [payloadInput, setPayloadInput] = useState(() => defaultPayloadText)
    const [tokenOutput, setTokenOutput] = useState('')
    const [signatureState, setSignatureState] = useState<SignatureState>('unknown')
    const [decodeErrors, setDecodeErrors] = useState<DecodeError[]>([])
    const [encodeError, setEncodeError] = useState<string | null>(null)

    const isDecodeMode = mode === 'decode'
    const segments = useMemo(() => splitToken(input), [input])

    const decodedSections = useMemo<DecodedSection[]>(() => {
      if (!isDecodeMode || segments.length === 0) {
        return []
      }

      const [header, payload, signature = ''] = segments
      const sections: DecodedSection[] = []

      try {
        const headerJson = decodeJsonBase64Url(header)
        sections.push({ title: 'Header', content: formatJson(headerJson) })
    } catch {
        sections.push({
          title: 'Header',
          content: 'Invalid header segment. Could not parse JSON.',
          error: true,
        })
      }

      try {
        const payloadJson = decodeJsonBase64Url(payload)
        sections.push({ title: 'Payload', content: formatJson(payloadJson) })
    } catch {
        sections.push({
          title: 'Payload',
          content: 'Invalid payload segment. Could not parse JSON.',
          error: true,
        })
      }

      sections.push({ title: 'Signature', content: signature || 'No signature present' })

      return sections
    }, [isDecodeMode, segments])

    const resetOutputs = useCallback(() => {
      setSignatureState('unknown')
      setDecodeErrors([])
      setEncodeError(null)
      setTokenOutput('')
    }, [])

    const handleDecode = useCallback(async () => {
      resetOutputs()

      const trimmed = input.trim()

      if (!trimmed) {
        setDecodeErrors([{ message: 'Enter a JWT to decode.' }])
        return
      }

      const [header, payload, signature = ''] = splitToken(trimmed)

      if (!header || !payload) {
        setDecodeErrors([{ message: 'JWT must contain header and payload segments.' }])
        return
      }

      try {
        const parsedHeader = decodeJsonBase64Url(header)
        decodeJsonBase64Url(payload)

        if (parsedHeader && typeof parsedHeader === 'object' && !Array.isArray(parsedHeader)) {
          const headerAlgorithm = (parsedHeader as Record<string, unknown>).alg

          if (headerAlgorithm === 'HS256' || headerAlgorithm === 'none') {
            setAlgorithm(headerAlgorithm)
          }
        }
  } catch {
        setDecodeErrors([
          { message: 'Unable to parse header or payload. Check that the token is valid.' },
        ])
        return
      }

      if (signature && algorithm !== 'none' && secret.trim()) {
        try {
          const data = `${header}.${payload}`
          const isValid = await verify(algorithm, secret, data, signature)
          setSignatureState(isValid ? 'valid' : 'invalid')
      } catch {
          setSignatureState('invalid')
        }
      } else {
        setSignatureState('unknown')
      }
    }, [algorithm, input, resetOutputs, secret])

    const handleEncode = useCallback(async () => {
      resetOutputs()

      try {
        const headerJson: unknown = JSON.parse(headerInput)
        const payloadJson: unknown = JSON.parse(payloadInput)

        if (!headerJson || typeof headerJson !== 'object' || Array.isArray(headerJson)) {
          setEncodeError('Header must be a JSON object.')
          return
        }

        const headerRecord = headerJson as Record<string, unknown>

        const preparedHeader: Record<string, unknown> = {
          typ: 'JWT',
          ...headerRecord,
          alg: algorithm,
        }

        setHeaderInput(JSON.stringify(preparedHeader, null, 2))

        const encodedHeader = encodeJsonBase64Url(preparedHeader)
        const encodedPayload = encodeJsonBase64Url(payloadJson)
        const baseToken = `${encodedHeader}.${encodedPayload}`

        if (algorithm === 'none') {
          setTokenOutput(baseToken)
          return
        }

        if (!secret.trim()) {
          setEncodeError('Provide a secret to sign this token.')
          return
        }

        const signature = await sign(algorithm, secret, baseToken)
        setTokenOutput(`${baseToken}.${signature}`)
  } catch {
        setEncodeError('Header and payload must be valid JSON.')
      }
    }, [algorithm, headerInput, payloadInput, resetOutputs, secret])

    const handleModeChange = useCallback(
      (nextMode: string) => {
        setMode(nextMode as Mode)
        resetOutputs()
      },
      [resetOutputs],
    )

    const handleAlgorithmChange = useCallback(
      (nextAlgorithm: JwtAlgorithm) => {
        setAlgorithm(nextAlgorithm)

        if (mode === 'encode') {
          try {
            const parsedHeader: unknown = JSON.parse(headerInput)

            if (parsedHeader && typeof parsedHeader === 'object' && !Array.isArray(parsedHeader)) {
              const headerRecord = parsedHeader as Record<string, unknown>
              const updatedHeader = {
                ...headerRecord,
                alg: nextAlgorithm,
              }

              setHeaderInput(JSON.stringify(updatedHeader, null, 2))
            }
          } catch {
            // Ignore invalid JSON while editing.
          }
        }
      },
      [headerInput, mode],
    )

    const handleClear = useCallback(() => {
      resetOutputs()
      setSecret('')

      if (isDecodeMode) {
        setInput('')
      } else {
        setHeaderInput('')
        setPayloadInput('')
        setTokenOutput('')
      }
    }, [isDecodeMode, resetOutputs])

    const handleRestoreDefaults = useCallback(() => {
      setHeaderInput(defaultHeaderText)
      setPayloadInput(defaultPayloadText)
    }, [])

    const signatureBadge = useMemo(() => {
      if (!isDecodeMode) {
        return null
      }

      if (signatureState === 'valid') {
        return (
          <Badge
            color="teal"
            variant="light"
            leftSection={<IconShieldCheck size={14} />}
            style={{ textTransform: 'none' }}
          >
            Signature verified
          </Badge>
        )
      }

      if (signatureState === 'invalid') {
        return (
          <Badge
            color="red"
            variant="light"
            leftSection={<IconShieldX size={14} />}
            style={{ textTransform: 'none' }}
          >
            Signature mismatch
          </Badge>
        )
      }

      return (
        <Badge
          color="gray"
          variant="light"
          leftSection={<IconLockOpen size={14} />}
          style={{ textTransform: 'none' }}
        >
          Signature not verified
        </Badge>
      )
    }, [isDecodeMode, signatureState])

    const signatureMetrics = useMemo(() => {
      if (!isDecodeMode || segments.length < 3 || !segments[2]) {
        return null
      }

      try {
        return decodeBase64UrlToBytes(segments[2]).length
    } catch {
        return null
      }
    }, [isDecodeMode, segments])

    const defaultsApplied =
      headerInput.trim() === defaultHeaderText && payloadInput.trim() === defaultPayloadText

    return (
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start" gap="lg">
          <Stack gap={6} style={{ flex: 1 }}>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              Mode
            </Text>
            <SegmentedControl
              value={mode}
              onChange={value => handleModeChange(value)}
              data={[
                { label: 'Decode token', value: 'decode' },
                { label: 'Encode token', value: 'encode' },
              ]}
              size="sm"
              fullWidth
            />
          </Stack>

          <Group gap="xs" align="center">
            {!isDecodeMode ? (
              <Tooltip label="Restore default header and payload" withArrow>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRestoreDefaults}
                  disabled={defaultsApplied}
                >
                  Defaults
                </Button>
              </Tooltip>
            ) : null}

            <Button variant="subtle" color="gray" onClick={handleClear}>
              Clear
            </Button>
          </Group>
        </Group>

        {isDecodeMode ? (
          <Stack gap="lg">
            <Textarea
              label="JWT token"
              placeholder="Paste a JWT (header.payload.signature)"
              value={input}
              onChange={event => setInput(event.currentTarget.value)}
              minRows={6}
              autosize
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />

            <Group gap="lg" wrap="wrap">
              <Stack gap={6} style={{ minWidth: 220 }}>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                  Algorithm
                </Text>
                <SegmentedControl
                  value={algorithm}
                  onChange={value => handleAlgorithmChange(value as JwtAlgorithm)}
                  data={algorithms}
                  size="sm"
                />
              </Stack>

              {algorithm !== 'none' ? (
                <PasswordInput
                  label="Secret"
                  placeholder="Required to verify the signature"
                  value={secret}
                  onChange={event => setSecret(event.currentTarget.value)}
                  leftSection={<IconKey size={16} />}
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 220 }}
                />
              ) : null}
            </Group>

            <Group justify="space-between" align="center">
              <Button
                onClick={() => {
                  void handleDecode()
                }}
                leftSection={<IconEye size={18} />}
              >
                Decode token
              </Button>

              {signatureBadge}
            </Group>

            {decodeErrors.length > 0 ? (
              decodeErrors.map((error, index) => (
                <Alert
                  key={`${error.message}-${index}`}
                  color="red"
                  variant="light"
                  icon={<IconAlertTriangle size={18} />}
                >
                  {error.message}
                </Alert>
              ))
            ) : decodedSections.length > 0 ? (
              <Tabs defaultValue={decodedSections[0]?.title ?? 'Header'} keepMounted={false}>
                <Tabs.List>
                  {decodedSections.map(section => (
                    <Tabs.Tab key={section.title} value={section.title}>
                      {section.title}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>

                {decodedSections.map(section => (
                  <Tabs.Panel key={section.title} value={section.title} mt="md">
                    <Stack gap="sm">
                      <Textarea
                        value={section.content}
                        minRows={section.title === 'Signature' ? 4 : 10}
                        autosize
                        readOnly
                        variant={section.error ? 'filled' : 'default'}
                        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                      />

                      <Group justify="space-between" align="center">
                        {section.title === 'Signature' && signatureMetrics !== null ? (
                          <Text size="xs" c="dimmed">
                            {signatureMetrics} bytes
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed">
                            {section.content.length.toLocaleString()} characters
                          </Text>
                        )}

                        <CopyButton value={section.content} timeout={1200}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                              <Button
                                variant={copied ? 'light' : 'subtle'}
                                color={copied ? 'teal' : 'gray'}
                                leftSection={copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
                                onClick={() => {
                                  void copy()
                                }}
                                size="xs"
                                disabled={!section.content.trim()}
                              >
                                {copied ? 'Copied' : 'Copy'}
                              </Button>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    </Stack>
                  </Tabs.Panel>
                ))}
              </Tabs>
            ) : (
              <Alert color="gray" variant="light" title="Waiting" icon={<IconEye size={18} />}>
                Paste a token and choose Decode to inspect its contents.
              </Alert>
            )}
          </Stack>
        ) : (
          <Stack gap="lg">
            <Group gap="lg" wrap="wrap">
              <Stack gap={6} style={{ minWidth: 220 }}>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                  Algorithm
                </Text>
                <SegmentedControl
                  value={algorithm}
                  onChange={value => handleAlgorithmChange(value as JwtAlgorithm)}
                  data={algorithms}
                  size="sm"
                />
              </Stack>

              {algorithm !== 'none' ? (
                <PasswordInput
                  label="Signing secret"
                  placeholder="Enter the key used to sign the token"
                  value={secret}
                  onChange={event => setSecret(event.currentTarget.value)}
                  leftSection={<IconKey size={16} />}
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 220 }}
                />
              ) : null}
            </Group>

            <Button
              onClick={() => {
                void handleEncode()
              }}
              leftSection={<IconLock size={18} />}
            >
              Encode & sign token
            </Button>

            <Stack gap="sm">
              <Textarea
                label="Header JSON"
                description="Automatically ensures the alg property matches the selected algorithm."
                value={headerInput}
                onChange={event => setHeaderInput(event.currentTarget.value)}
                minRows={10}
                autosize
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
              />

              <Textarea
                label="Payload JSON"
                description="Include any claims you want encoded inside the token."
                value={payloadInput}
                onChange={event => setPayloadInput(event.currentTarget.value)}
                minRows={12}
                autosize
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
              />
            </Stack>

            {encodeError ? (
              <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
                {encodeError}
              </Alert>
            ) : null}

            <Group justify="space-between" align="center">
              <CopyButton value={tokenOutput} timeout={1200}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy token'} withArrow>
                    <Button
                      variant={copied ? 'light' : 'subtle'}
                      color={copied ? 'teal' : 'gray'}
                      leftSection={copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
                      onClick={() => {
                        void copy()
                      }}
                      disabled={!tokenOutput}
                    >
                      {copied ? 'Copied' : 'Copy token'}
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>

              <Text size="xs" c="dimmed">
                {tokenOutput ? `${tokenOutput.length.toLocaleString()} characters` : 'No token yet'}
              </Text>
            </Group>

            <Textarea
              label="Result"
              value={tokenOutput}
              minRows={4}
              autosize
              readOnly
              placeholder="Encoded token appears here after signing."
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
          </Stack>
        )}
      </Stack>
  )
}