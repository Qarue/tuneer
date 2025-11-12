import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconFileDescription,
  IconPlus,
  IconScissors,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { PDFDocument } from 'pdf-lib'
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react'

import { bytesToReadable } from '@/lib/formatters/bytes'
import { createId } from '@/lib/id'

const MAX_TOTAL_SIZE = 150 * 1024 * 1024 // 150 MB safety cap

type SplitState = 'idle' | 'processing' | 'success' | 'error'

type Segment = {
  id: string
  start: number
  end: number
}

type SplitResult = {
  id: string
  start: number
  end: number
  url: string
  name: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const ensureAscending = (start: number, end: number) => {
  if (start > end) {
    return [start, start] as const
  }

  return [start, end] as const
}

const getBaseFileName = (fileName: string) => {
  const match = fileName.match(/^(.*?)(\.pdf)?$/i)
  const base = match?.[1]?.trim()
  return base && base.length > 0 ? base : 'document'
}

const formatSegmentName = (baseName: string, start: number, end: number) =>
  `${baseName}-pages-${start}-${end}.pdf`

export function PDFSplitTool(): ReactElement {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [segments, setSegments] = useState<Segment[]>([])
  const [status, setStatus] = useState<SplitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SplitResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const hasFile = Boolean(file)
  const isProcessing = status === 'processing'
  const disableInputs = isProcessing || isAnalyzing

  const cleanupResults = useCallback((items: SplitResult[]) => {
    items.forEach(item => {
      URL.revokeObjectURL(item.url)
    })
  }, [])

  useEffect(() => {
    return () => {
      cleanupResults(results)
    }
  }, [cleanupResults, results])

  const resetResults = () => {
    setResults(current => {
      cleanupResults(current)
      return []
    })
  }

  const resetState = () => {
    resetResults()
    setStatus('idle')
    setError(null)
    setSegments([])
    setPageCount(0)
    setFile(null)
    setIsAnalyzing(false)
  }

  const normalizeSegment = useCallback(
    (segment: Segment, totalPages: number): Segment => {
      if (totalPages === 0) {
        return segment
      }

      const min = 1
      const max = totalPages
      const start = clamp(segment.start, min, max)
      const end = clamp(segment.end, min, max)
      const [normalizedStart, normalizedEnd] = ensureAscending(start, end)

      return {
        ...segment,
        start: normalizedStart,
        end: normalizedEnd,
      }
    },
    [],
  )

  const handleDrop = (droppedFiles: File[]) => {
    if (!droppedFiles.length) {
      return
    }

    const nextFile = droppedFiles[0]
    const isPdf = nextFile.type === MIME_TYPES.pdf || nextFile.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      setError(`Unsupported file skipped: ${nextFile.name}`)
      return
    }

    resetState()
    setIsAnalyzing(true)

    void (async () => {
      try {
        const arrayBuffer = await nextFile.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const totalPages = pdf.getPageCount()

        if (totalPages === 0) {
          throw new Error('PDF has no pages')
        }

        setFile(nextFile)
        setPageCount(totalPages)
        setSegments([
          {
            id: createId(),
            start: 1,
            end: totalPages,
          },
        ])
        setError(null)
        setStatus('idle')
      } catch (analysisError) {
        console.error(analysisError)
        resetState()
        setError('We could not read this PDF. Try another file or re-upload.')
      } finally {
        setIsAnalyzing(false)
      }
    })()
  }

  const handleSegmentChange = (id: string, field: 'start' | 'end', value: string | number | null) => {
    if (value === null || value === '') {
      return
    }

    setSegments(current =>
      current.map(segment => {
        if (segment.id !== id) {
          return segment
        }

          const parsed = typeof value === 'number' ? value : Number(value)

          if (Number.isNaN(parsed)) {
            return segment
          }

          const nextValue = parsed
        const updated = normalizeSegment({ ...segment, [field]: nextValue } as Segment, pageCount)
        return updated
      }),
    )
  }

  const handleAddSegment = () => {
    if (!pageCount) {
      return
    }

    setSegments(current => {
      const last = current[current.length - 1]
      const startCandidate = last ? clamp(last.end + 1, 1, pageCount) : 1
      const endCandidate = startCandidate <= pageCount ? pageCount : startCandidate

      const nextSegment = normalizeSegment(
        {
          id: createId(),
          start: startCandidate,
          end: endCandidate,
        },
        pageCount,
      )

      return [...current, nextSegment]
    })
  }

  const handleRemoveSegment = (id: string) => {
    setSegments(current => current.filter(segment => segment.id !== id))
  }

  const moveSegment = (id: string, direction: 'up' | 'down') => {
    setSegments(current => {
      const index = current.findIndex(segment => segment.id === id)

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

  const handleSplit = async () => {
    if (!file) {
      setError('Upload a PDF before splitting.')
      return
    }

    if (!segments.length) {
      setError('Add at least one segment to split.')
      return
    }

    if (file.size > MAX_TOTAL_SIZE) {
      setError('File is too large. Pick a PDF under 150 MB.')
      return
    }

    const validSegments = segments.map(segment => normalizeSegment(segment, pageCount))

    if (validSegments.some(segment => segment.start < 1 || segment.end > pageCount)) {
      setError('Segments must stay within the total page range.')
      return
    }

    resetResults()
    setStatus('processing')
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const baseName = getBaseFileName(file.name)

      const nextResults: SplitResult[] = []

      for (const segment of validSegments) {
        const segmentDoc = await PDFDocument.create()
        const pageIndices = Array.from({ length: segment.end - segment.start + 1 }, (_, index) =>
          segment.start + index - 1,
        )
        const copiedPages = await segmentDoc.copyPages(pdf, pageIndices)
        copiedPages.forEach(page => {
          segmentDoc.addPage(page)
        })

        const pdfBytes = await segmentDoc.save()
        const byteCopy = Uint8Array.from(pdfBytes)
        const blob = new Blob([byteCopy], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const name = formatSegmentName(baseName, segment.start, segment.end)

        nextResults.push({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          url,
          name,
        })
      }

      setResults(nextResults)
      setStatus('success')
    } catch (splitError) {
      console.error(splitError)
      setStatus('error')
      setError('We could not split this PDF. Try adjusting segments or re-uploading.')
    }
  }

  const handleClear = () => {
    resetState()
  }

  const statusIndicator = useMemo(() => {
    if (isAnalyzing) {
      return (
        <Badge color="brand" variant="light" leftSection={<IconUpload size={14} />}>
          Analyzing PDF...
        </Badge>
      )
    }

    if (status === 'processing') {
      return (
        <Badge color="brand" variant="light" leftSection={<IconScissors size={14} />}>
          Splitting...
        </Badge>
      )
    }

    if (status === 'success' && results.length) {
      return (
        <Badge color="teal" variant="light" leftSection={<IconCheck size={14} />}>
          Ready to download
        </Badge>
      )
    }

    if (status === 'error') {
      return (
        <Badge color="red" variant="light" leftSection={<IconX size={14} />}>
          Split failed
        </Badge>
      )
    }

    return null
  }, [isAnalyzing, results.length, status])

  return (
    <Stack gap="lg">
      <Dropzone
        accept={[MIME_TYPES.pdf]}
        onDrop={handleDrop}
        maxSize={MAX_TOTAL_SIZE}
        multiple={false}
        disabled={disableInputs}
        styles={{ inner: { paddingBlock: 'var(--mantine-spacing-lg)' } }}
      >
        <Stack gap="sm" align="center">
          <ThemeIcon size={56} radius="xl" color="brand" variant="light">
            <IconScissors size={28} />
          </ThemeIcon>
          <Text fw={600}>Drag a PDF here or click to browse</Text>
          <Text c="dimmed" size="sm">
            Files stay on your device. Select the page ranges you want to extract as separate PDFs.
          </Text>
        </Stack>
      </Dropzone>

      {hasFile && file && (
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start" gap="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="gray">
                <IconFileDescription size={18} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={600}>{file.name}</Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {bytesToReadable(file.size)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    · {pageCount} page{pageCount === 1 ? '' : 's'}
                  </Text>
                </Group>
              </Stack>
            </Group>
            {statusIndicator}
          </Group>
        </Paper>
      )}

      {hasFile && (
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={600}>Segments</Text>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddSegment}
              disabled={disableInputs}
            >
              Add segment
            </Button>
          </Group>

          <Stack gap="sm">
            {segments.map((segment, index) => (
              <Paper key={segment.id} withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Badge color="brand" variant="light">
                        Segment {index + 1}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        Pages {segment.start}–{segment.end}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Tooltip label="Move up" withArrow>
                        <ActionIcon
                          variant="subtle"
                          onClick={() => moveSegment(segment.id, 'up')}
                          disabled={index === 0 || disableInputs}
                          aria-label="Move segment up"
                        >
                          <IconArrowUp size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Move down" withArrow>
                        <ActionIcon
                          variant="subtle"
                          onClick={() => moveSegment(segment.id, 'down')}
                          disabled={index === segments.length - 1 || disableInputs}
                          aria-label="Move segment down"
                        >
                          <IconArrowDown size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove" withArrow>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleRemoveSegment(segment.id)}
                          disabled={segments.length === 1 || disableInputs}
                          aria-label="Remove segment"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>

                  <Group gap="md" align="flex-end" wrap="wrap">
                    <NumberInput
                      label="Start page"
                      value={segment.start}
                      min={1}
                      max={pageCount}
                      onChange={value => handleSegmentChange(segment.id, 'start', value)}
                      disabled={disableInputs}
                      allowDecimal={false}
                    />
                    <NumberInput
                      label="End page"
                      value={segment.end}
                      min={1}
                      max={pageCount}
                      onChange={value => handleSegmentChange(segment.id, 'end', value)}
                      disabled={disableInputs}
                      allowDecimal={false}
                    />
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      )}

      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Badge color="gray" variant="light">
            {segments.length} segment{segments.length === 1 ? '' : 's'}
          </Badge>
          {hasFile && (
            <Text size="sm" c="dimmed">
              {pageCount} page{pageCount === 1 ? '' : 's'} total
            </Text>
          )}
        </Group>

        <Group gap="sm">
          <Button variant="subtle" color="gray" onClick={handleClear} disabled={!hasFile || disableInputs}>
            Clear all
          </Button>
          <Button
            onClick={() => {
              void handleSplit()
            }}
            loading={isProcessing}
            disabled={!hasFile || disableInputs || segments.length === 0}
            leftSection={<IconScissors size={16} />}
          >
            Split PDF
          </Button>
        </Group>
      </Group>

      {results.length > 0 && (
        <Stack gap="sm">
          <Text fw={600}>Downloads</Text>
          {results.map(result => (
            <Button
              key={result.id}
              component="a"
              href={result.url}
              download={result.name}
              variant="light"
              color="teal"
              leftSection={<IconCheck size={16} />}
            >
              Download {result.name}
            </Button>
          ))}
        </Stack>
      )}

      {error && (
        <Alert variant="light" color="red" icon={<IconX size={16} />}>
          {error}
        </Alert>
      )}
    </Stack>
  )
}
