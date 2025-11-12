import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconFileDescription,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { PDFDocument } from 'pdf-lib'
import { type ReactElement, useEffect, useMemo, useState } from 'react'

import { bytesToReadable } from '@/lib/formatters/bytes'
import { createId } from '@/lib/id'

type MergeState = 'idle' | 'processing' | 'success' | 'error'

type QueuedPdf = {
  id: string
  file: File
  name: string
  size: number
}

const MAX_TOTAL_SIZE = 150 * 1024 * 1024 // 150 MB safety cap

export function PDFJoinTool(): ReactElement {
  const [files, setFiles] = useState<QueuedPdf[]>([])
  const [status, setStatus] = useState<MergeState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [outputName, setOutputName] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
  const hasFiles = files.length > 0
  const isProcessing = status === 'processing'

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  const resetDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
    }
  }

  const handleDrop = (droppedFiles: File[]) => {
    if (!droppedFiles.length) {
      return
    }

    resetDownload()
    const accepted: QueuedPdf[] = []
    const rejectedNames: string[] = []

    droppedFiles.forEach(file => {
      const isPdf = file.type === MIME_TYPES.pdf || file.name.toLowerCase().endsWith('.pdf')

      if (!isPdf) {
        rejectedNames.push(file.name)
        return
      }

      accepted.push({
        id: createId(),
        file,
        name: file.name,
        size: file.size,
      })
    })

    if (rejectedNames.length) {
      setError(`Unsupported files skipped: ${rejectedNames.join(', ')}`)
    } else {
      setError(null)
    }

    setStatus('idle')
    setFiles(current => [...current, ...accepted])
  }

  const handleRemove = (id: string) => {
    resetDownload()
    setFiles(current => current.filter(item => item.id !== id))
    setStatus('idle')
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setFiles(current => {
      const index = current.findIndex(item => item.id === id)

      if (index === -1) {
        return current
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const handleClear = () => {
    resetDownload()
    setFiles([])
    setStatus('idle')
    setError(null)
    setOutputName('')
  }

  const ensurePdfExtension = (name: string) => {
    const trimmed = name.trim() || 'merged.pdf'
    return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`
  }

  const handleMerge = async () => {
    if (!files.length) {
      setError('Add at least one PDF to merge.')
      return
    }

    if (totalBytes > MAX_TOTAL_SIZE) {
      setError('Combined file size is too large. Remove files to stay below 150 MB.')
      return
    }

    try {
      setStatus('processing')
      setError(null)

      const mergedPdf = await PDFDocument.create()

      for (const { file } of files) {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        pages.forEach(page => {
          mergedPdf.addPage(page)
        })
      }

  const pdfBytes = await mergedPdf.save()
      resetDownload()

  const pdfBuffer = pdfBytes.slice().buffer
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setStatus('success')
    } catch (mergeError) {
      console.error(mergeError)
      setStatus('error')
      setDownloadUrl(null)
      setError('We could not merge these PDFs. Try removing a file or uploading again.')
    }
  }

  const statusIndicator = (() => {
    if (status === 'processing') {
      return (
        <Badge color="brand" variant="light" leftSection={<IconUpload size={14} />}>
          Merging...
        </Badge>
      )
    }

    if (status === 'success' && downloadUrl) {
      return (
        <Badge color="teal" variant="light" leftSection={<IconCheck size={14} />}>
          Ready to download
        </Badge>
      )
    }

    if (status === 'error') {
      return (
        <Badge color="red" variant="light" leftSection={<IconX size={14} />}>
          Merge failed
        </Badge>
      )
    }

    return null
  })()

  const sanitizedOutput = ensurePdfExtension(outputName)

  return (
    <Stack gap="lg">
      <Dropzone
        accept={[MIME_TYPES.pdf]}
        onDrop={handleDrop}
        maxSize={MAX_TOTAL_SIZE}
        multiple
        disabled={isProcessing}
        styles={{ inner: { paddingBlock: 'var(--mantine-spacing-lg)' } }}
      >
        <Stack gap="sm" align="center">
          <ThemeIcon size={56} radius="xl" color="brand" variant="light">
            <IconUpload size={28} />
          </ThemeIcon>
          <Text fw={600}>Drag PDFs here or click to browse</Text>
          <Text c="dimmed" size="sm">
            Files stay on your device. You can add multiple PDFs and reorder them before merging.
          </Text>
        </Stack>
      </Dropzone>

      {hasFiles && (
        <Stack gap="sm">
          {files.map((item, index) => (
            <Paper key={item.id} withBorder radius="md" p="sm">
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <ThemeIcon variant="light" color="gray">
                    <IconFileDescription size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={600}>{item.name}</Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {bytesToReadable(item.size)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        · Position {index + 1}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
                <Group gap="xs">
                  <Tooltip label="Move up" withArrow>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={index === 0 || isProcessing}
                      aria-label="Move file up"
                    >
                      <IconArrowUp size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Move down" withArrow>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={index === files.length - 1 || isProcessing}
                      aria-label="Move file down"
                    >
                      <IconArrowDown size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Remove" withArrow>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleRemove(item.id)}
                      disabled={isProcessing}
                      aria-label="Remove file"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      <Group justify="space-between" align="flex-end" wrap="wrap" gap="lg">
        <Stack gap={8} style={{ flex: 1 }}>
          <TextInput
            label="Output file name"
            value={outputName}
            onChange={event => setOutputName(event.currentTarget.value)}
            onBlur={event => {
              const rawValue = event.currentTarget.value
              if (!rawValue.trim()) {
                setOutputName('')
                return
              }

              setOutputName(ensurePdfExtension(rawValue))
            }}
            placeholder="merged.pdf"
            disabled={isProcessing}
          />
          <Group gap="xs" align="center">
            <Badge color="gray" variant="light">
              {files.length} file{files.length === 1 ? '' : 's'}
            </Badge>
            <Text size="sm" c="dimmed">
              {bytesToReadable(totalBytes)} total
            </Text>
            {statusIndicator}
          </Group>
        </Stack>

        <Group gap="sm">
          <Button variant="subtle" color="gray" onClick={handleClear} disabled={!hasFiles || isProcessing}>
            Clear all
          </Button>
          <Button
            onClick={() => {
              void handleMerge()
            }}
            loading={isProcessing}
            disabled={!hasFiles}
            leftSection={<IconUpload size={16} />}
          >
            Merge PDFs
          </Button>
        </Group>
      </Group>

      {status === 'success' && downloadUrl && (
        <Button
          component="a"
          href={downloadUrl}
          download={sanitizedOutput}
          variant="light"
          color="teal"
          leftSection={<IconCheck size={16} />}
        >
          Download {sanitizedOutput}
        </Button>
      )}

      {error && (
        <Alert variant="light" color="red" icon={<IconX size={16} />}>
          {error}
        </Alert>
      )}
    </Stack>
  )
}
