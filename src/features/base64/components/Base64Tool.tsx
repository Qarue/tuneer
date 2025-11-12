import {
  ActionIcon,
  Badge,
  Button,
  CopyButton,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import {
  IconAlertCircle,
  IconArrowsLeftRight,
  IconChecks,
  IconCircleCheck,
  IconCopy,
} from '@tabler/icons-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'

import { decodeBase64, encodeBase64 } from '../utils/base64'

type Mode = 'encode' | 'decode'
type ConversionState = 'idle' | 'converting' | 'success' | 'error'

const encoder = new TextEncoder()

export function Base64Tool(): ReactElement {
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ConversionState>('idle')
  const [debouncedInput] = useDebouncedValue(input, 300)

  const inputPlaceholder =
    mode === 'encode' ? 'Paste text to encode...' : 'Paste a Base64 string to decode...'

  const outputMetrics = useMemo(() => {
    if (!output) {
      return { characters: 0, bytes: 0 }
    }

    return {
      characters: output.length,
      bytes: encoder.encode(output).length,
    }
  }, [output])

  useEffect(() => {
    const trimmed = debouncedInput.trim()

    if (!trimmed) {
      setOutput('')
      setError(null)
      setStatus('idle')
      return
    }

    const result = mode === 'encode' ? encodeBase64(debouncedInput) : decodeBase64(debouncedInput)

    if (result.ok) {
      setOutput(result.value)
      setError(null)
      setStatus('success')
    } else {
      setOutput('')
      setError(result.error)
      setStatus('error')
    }
  }, [debouncedInput, mode])

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
    setStatus(input.trim() ? 'converting' : 'idle')
  }

  const handleSwap = () => {
    const nextInput = output
    const nextOutput = input

    setInput(nextInput)
    setOutput(nextOutput)
    setMode(prev => (prev === 'encode' ? 'decode' : 'encode'))
    setError(null)
    setStatus(nextInput.trim() ? 'converting' : 'idle')
  }

  const handleReset = () => {
    setInput('')
    setOutput('')
    setError(null)
    setStatus('idle')
  }

  const statusIndicator = (() => {
    if (status === 'idle') {
      return null
    }

    if (status === 'converting') {
      return (
        <Group gap="xs" align="center">
          <Loader size="xs" color="brand" />
          <Text size="sm" c="dimmed">
            Converting...
          </Text>
        </Group>
      )
    }

    if (status === 'success') {
      return (
        <Badge
          color="teal"
          variant="light"
          leftSection={<IconCircleCheck size={14} style={{ marginRight: 4 }} />}
        >
          Converted
        </Badge>
      )
    }

    return (
      <Group gap="xs" align="center">
        <IconAlertCircle size={16} style={{ color: 'var(--mantine-color-red-6)' }} />
        <Text size="sm" c="red">
          {error}
        </Text>
      </Group>
    )
  })()

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="lg">
        <Stack gap={6} style={{ flex: 1 }}>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed">
            Mode
          </Text>
          <SegmentedControl
            value={mode}
            onChange={value => handleModeChange(value as Mode)}
            data={[{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }]}
            size="sm"
            fullWidth
          />
        </Stack>

        <Group gap="xs" align="flex-start">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleReset}
            disabled={!input && !output}
          >
            Clear
          </Button>
          <Tooltip label="Swap input and output" withArrow>
            <ActionIcon
              variant="light"
              color="brand"
              size="lg"
              onClick={handleSwap}
              disabled={!input && !output}
              aria-label="Swap input and output"
            >
              <IconArrowsLeftRight size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="sm">
          <Textarea
            label={mode === 'encode' ? 'Source text' : 'Base64 input'}
            description="Converts automatically after you pause typing."
            value={input}
            onChange={event => {
              const value = event.currentTarget.value
              setInput(value)
              setError(null)
              setStatus(value.trim() ? 'converting' : 'idle')
            }}
            placeholder={inputPlaceholder}
            minRows={8}
            autosize
            data-autofocus
            error={status === 'error' ? error : null}
          />
          {statusIndicator}
        </Stack>

        <Stack gap="sm">
          <Textarea
            label="Result"
            description="Output updates in real time."
            value={output}
            onChange={event => setOutput(event.currentTarget.value)}
            placeholder="Output appears here..."
            minRows={8}
            autosize
          />

          <Group justify="space-between" align="center">
            <CopyButton value={output} timeout={1200}>
              {({ copied, copy }) => (
                <Tooltip withArrow label={copied ? 'Copied' : 'Copy output'}>
                  <ActionIcon
                    variant={copied ? 'filled' : 'subtle'}
                    color={copied ? 'teal' : 'gray'}
                    onClick={() => {
                      void copy()
                    }}
                    disabled={!output}
                    aria-label="Copy output"
                  >
                    {copied ? <IconChecks size={18} /> : <IconCopy size={18} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>

            <Text size="xs" c="dimmed">
              {outputMetrics.bytes.toLocaleString()} bytes |{' '}
              {outputMetrics.characters.toLocaleString()} characters
            </Text>
          </Group>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
