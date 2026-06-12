import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconArrowsMaximize,
  IconCircleCheck,
  IconDownload,
  IconMaximize,
  IconPhoto,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'

import { selectColorScheme, useThemeStore } from '@/state/theme-store'

import { downloadPng, downloadSvg } from '../utils/export'
import { renderMermaid, SAMPLE_DIAGRAM } from '../utils/render'

type RenderStatus = 'idle' | 'rendering' | 'success' | 'error'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

export function MermaidViewer(): ReactElement {
  const colorScheme = useThemeStore(selectColorScheme)
  const [source, setSource] = useState(SAMPLE_DIAGRAM)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<RenderStatus>('idle')
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [debouncedSource] = useDebouncedValue(source, 400)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const result = await renderMermaid(debouncedSource, colorScheme)

      if (cancelled) {
        return
      }

      if (result.ok) {
        setSvg(result.svg)
        setError(null)
        setStatus('success')
      } else {
        setSvg('')
        setError(result.error)
        setStatus('error')
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [debouncedSource, colorScheme])

  const lineCount = useMemo(() => source.split('\n').length, [source])

  const handleDownloadSvg = () => {
    if (!svg) {
      return
    }

    downloadSvg(svg)
  }

  const handleDownloadPng = async () => {
    if (!svg) {
      return
    }

    try {
      await downloadPng(
        svg,
        'diagram.png',
        undefined,
        colorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
      )
    } catch (downloadError) {
      notifications.show({
        color: 'red',
        title: 'PNG export failed',
        message:
          downloadError instanceof Error
            ? downloadError.message
            : 'Unable to export the diagram as PNG.',
      })
    }
  }

  const handleReset = () => {
    setSource(SAMPLE_DIAGRAM)
    setZoom(1)
  }

  const adjustZoom = (delta: number) => {
    setZoom(current => {
      const next = Math.round((current + delta) * 100) / 100
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    })
  }

  const statusIndicator = (() => {
    if (status === 'rendering') {
      return (
        <Group gap="xs" align="center">
          <Loader size="xs" color="brand" />
          <Text size="sm" c="dimmed">
            Rendering...
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
          Rendered
        </Badge>
      )
    }

    if (status === 'error' && error) {
      return (
        <Group gap="xs" align="center">
          <IconAlertCircle size={16} style={{ color: 'var(--mantine-color-red-6)' }} />
          <Text size="sm" c="red">
            Invalid diagram
          </Text>
        </Group>
      )
    }

    return null
  })()

  const zoomControls = (
    <Group gap="xs">
      <Tooltip label="Zoom out" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => adjustZoom(-ZOOM_STEP)}
          disabled={!svg || zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          <IconZoomOut size={18} />
        </ActionIcon>
      </Tooltip>
      <Text size="xs" c="dimmed" w={44} ta="center">
        {Math.round(zoom * 100)}%
      </Text>
      <Tooltip label="Zoom in" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => adjustZoom(ZOOM_STEP)}
          disabled={!svg || zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <IconZoomIn size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Reset zoom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setZoom(1)}
          disabled={!svg || zoom === 1}
          aria-label="Reset zoom"
        >
          <IconArrowsMaximize size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Fullscreen" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setFullscreen(true)}
          disabled={!svg}
          aria-label="View fullscreen"
        >
          <IconMaximize size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )

  const exportButtons = (
    <Group gap="xs">
      <Button
        variant="light"
        color="brand"
        size="xs"
        leftSection={<IconDownload size={16} />}
        onClick={handleDownloadSvg}
        disabled={!svg}
      >
        SVG
      </Button>
      <Button
        variant="light"
        color="brand"
        size="xs"
        leftSection={<IconPhoto size={16} />}
        onClick={() => {
          void handleDownloadPng()
        }}
        disabled={!svg}
      >
        PNG
      </Button>
    </Group>
  )

  const diagramSurface = ({ grow = false }: { grow?: boolean } = {}) => (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{
        minHeight: 320,
        overflow: 'auto',
        position: 'relative',
        ...(grow ? { flex: 1 } : {}),
      }}
    >
      {svg ? (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: 'fit-content',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <Group justify="center" align="center" h={288}>
          {status === 'error' ? (
            <Alert
              icon={<IconAlertCircle size={18} />}
              color="red"
              variant="light"
              title="Could not render diagram"
              w="100%"
            >
              {error}
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">
              Diagram preview appears here.
            </Text>
          )}
        </Group>
      )}
    </Paper>
  )

  const renderEditor = ({ fill = false }: { fill?: boolean } = {}) => (
    <Stack gap="sm" style={fill ? { flex: 1, minHeight: 0 } : undefined}>
      <Textarea
        label="Diagram definition"
        description="Renders automatically after you pause typing."
        value={source}
        onChange={event => {
          setSource(event.currentTarget.value)
          setStatus('rendering')
        }}
        placeholder="Enter Mermaid syntax..."
        autosize={!fill}
        minRows={fill ? 4 : 16}
        data-autofocus
        styles={{
          input: {
            fontFamily: 'var(--mantine-font-family-monospace)',
            ...(fill ? { height: '100%' } : {}),
          },
          ...(fill
            ? {
                root: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
                wrapper: { flex: 1, minHeight: 0 },
              }
            : {}),
        }}
        error={status === 'error' ? error : null}
      />
      <Text size="xs" c="dimmed">
        {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
      </Text>
    </Stack>
  )

  const renderPreview = ({ grow = false }: { grow?: boolean } = {}) => (
    <Stack gap="sm" style={grow ? { flex: 1, minHeight: 0 } : undefined}>
      <Group justify="space-between" align="center">
        {zoomControls}
        {exportButtons}
      </Group>
      {diagramSurface({ grow })}
    </Stack>
  )

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        {statusIndicator}
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconRefresh size={16} />}
          onClick={handleReset}
        >
          Reset to sample
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {renderEditor()}
        {renderPreview()}
      </SimpleGrid>

      <Modal
        opened={fullscreen}
        onClose={() => setFullscreen(false)}
        fullScreen
        title="Diagram editor"
        padding="md"
        styles={{
          body: {
            height: 'calc(100vh - 60px)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Flex gap="md" direction={{ base: 'column', md: 'row' }} style={{ flex: 1, minHeight: 0 }}>
          {renderEditor({ fill: true })}
          {renderPreview({ grow: true })}
        </Flex>
      </Modal>
    </Stack>
  )
}
