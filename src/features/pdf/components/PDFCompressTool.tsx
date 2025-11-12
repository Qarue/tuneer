import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { IconCheck, IconDownload, IconFileDescription, IconGauge, IconX } from '@tabler/icons-react'
import { PDFDocument } from 'pdf-lib'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react'

import { bytesToReadable } from '@/lib/formatters/bytes'

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc
}

type CompressionMode = 'optimize' | 'rasterize'

const MAX_TOTAL_SIZE = 150 * 1024 * 1024 // 150 MB safety cap

type CompressState = 'idle' | 'processing' | 'success' | 'error'

type CompressResult = {
  url: string
  name: string
  size: number
  originalSize: number
}

const ensurePdfExtension = (name: string) => {
  const trimmed = name.trim() || 'compressed.pdf'
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`
}

const getBaseFileName = (fileName: string) => {
  const match = fileName.match(/^(.*?)(\.pdf)?$/i)
  const base = match?.[1]?.trim()
  return base && base.length > 0 ? base : 'document'
}

export function PDFCompressTool(): ReactElement {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<CompressionMode>('optimize')
  const [status, setStatus] = useState<CompressState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [outputName, setOutputName] = useState('')
  const [rasterDpi, setRasterDpi] = useState(150)
  const [rasterQuality, setRasterQuality] = useState(0.75)
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  })

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [result])

  const rasterizePdf = useCallback(
    async (source: File, options: { dpi: number; quality: number }) => {
      const { dpi, quality } = options
      const data = await source.arrayBuffer()
      const loadingTask = getDocument({ data })
      let pdf: PDFDocumentProxy | null = null

      try {
        pdf = await loadingTask.promise

        const totalPages = pdf.numPages

        if (totalPages === 0) {
          throw new Error('PDF has no pages to rasterize.')
        }

        setProgress({ current: 0, total: totalPages })

        const targetDoc = await PDFDocument.create()

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
          setProgress({ current: pageIndex + 1, total: totalPages })

          const page = await pdf.getPage(pageIndex + 1)
          const viewport = page.getViewport({ scale: dpi / 72 })

          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d', { willReadFrequently: true })

          if (!context) {
            throw new Error('Unable to obtain a 2D canvas context. Try another browser.')
          }

          const width = Math.max(1, Math.round(viewport.width))
          const height = Math.max(1, Math.round(viewport.height))
          canvas.width = width
          canvas.height = height

          await page.render({ canvasContext: context, canvas, viewport }).promise

          const imageBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              blob => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error('Failed to convert rasterized page into an image.'))
                }
              },
              'image/jpeg',
              quality,
            )
          })

          const imageBytes = await imageBlob.arrayBuffer()
          const embeddedImage = await targetDoc.embedJpg(imageBytes)
          const pdfPage = targetDoc.addPage([embeddedImage.width, embeddedImage.height])

          pdfPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height,
          })

          canvas.width = 0
          canvas.height = 0
        }

        return await targetDoc.save()
      } finally {
        setProgress({ current: 0, total: 0 })
        await loadingTask.destroy()
        if (pdf) {
          await pdf.cleanup()
        }
      }
    },
    [],
  )

  const hasFile = Boolean(file)
  const isProcessing = status === 'processing'

  const resetResult = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url)
    }

    setResult(null)
    setProgress({ current: 0, total: 0 })
  }

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

    resetResult()
    setFile(nextFile)
    setStatus('idle')
    setError(null)
    setOutputName(`${getBaseFileName(nextFile.name)}-compressed.pdf`)
  }

  const handleCompress = async () => {
    if (!file) {
      setError('Upload a PDF before compressing.')
      return
    }

    if (file.size > MAX_TOTAL_SIZE) {
      setError('File is too large. Pick a PDF under 150 MB.')
      return
    }

    setStatus('processing')
    setError(null)
    resetResult()
    setProgress({ current: 0, total: 0 })

    try {
      const sanitizedName = ensurePdfExtension(
        outputName || `${getBaseFileName(file.name)}-compressed.pdf`,
      )

      let outputBytes: Uint8Array

      if (mode === 'rasterize') {
        outputBytes = await rasterizePdf(file, {
          dpi: rasterDpi,
          quality: rasterQuality,
        })
      } else {
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false })

        outputBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false })
      }

      const byteCopy = Uint8Array.from(outputBytes)
      const blob = new Blob([byteCopy], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      setResult({
        url,
        name: sanitizedName,
        size: byteCopy.byteLength,
        originalSize: file.size,
      })
      setStatus('success')
    } catch (compressError) {
      console.error(compressError)
      setStatus('error')
      setError(
        mode === 'rasterize'
          ? 'We could not rasterize this PDF. Try lowering the resolution or switch to Optimized mode.'
          : 'We could not compress this PDF. Try another file or re-upload.',
      )
    }
  }

  const handleClear = () => {
    resetResult()
    setFile(null)
    setStatus('idle')
    setError(null)
    setOutputName('')
    setProgress({ current: 0, total: 0 })
  }

  const savingsLabel = useMemo(() => {
    if (!result) {
      return null
    }

    const { size, originalSize } = result

    if (originalSize === 0) {
      return null
    }

    const difference = originalSize - size
    const percentage = (difference / originalSize) * 100

    if (difference > 0) {
      return `Saved ${bytesToReadable(difference)} (${percentage.toFixed(1)}%)`
    }

    if (difference < 0) {
      const absolute = Math.abs(difference)
      const negativePercentage = Math.abs(percentage)
      return `Grew by ${bytesToReadable(absolute)} (${negativePercentage.toFixed(1)}%)`
    }

    return 'No size change detected'
  }, [result])

  const statusIndicator = useMemo(() => {
    if (status === 'processing') {
      const label =
        mode === 'rasterize' && progress.total > 0
          ? `Rasterizing page ${Math.max(progress.current, 1)} of ${progress.total}`
          : 'Compressing...'

      return (
        <Badge color="brand" variant="light" leftSection={<IconGauge size={14} />}>
          {label}
        </Badge>
      )
    }

    if (status === 'success' && result) {
      return (
        <Badge color="teal" variant="light" leftSection={<IconCheck size={14} />}>
          Ready to download
        </Badge>
      )
    }

    if (status === 'error') {
      return (
        <Badge color="red" variant="light" leftSection={<IconX size={14} />}>
          Compression failed
        </Badge>
      )
    }

    return null
  }, [mode, progress, result, status])

  return (
    <Stack gap="lg">
      <Dropzone
        accept={[MIME_TYPES.pdf]}
        onDrop={handleDrop}
        maxSize={MAX_TOTAL_SIZE}
        multiple={false}
        disabled={isProcessing}
        styles={{ inner: { paddingBlock: 'var(--mantine-spacing-lg)' } }}
      >
        <Stack gap="sm" align="center">
          <ThemeIcon size={56} radius="xl" color="brand" variant="light">
            <IconDownload size={28} />
          </ThemeIcon>
          <Text fw={600}>Drag a PDF here or click to browse</Text>
          <Text c="dimmed" size="sm">
            We&apos;ll try to shrink your PDF without leaving your browser. Results depend on the source file.
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
                <Text size="xs" c="dimmed">
                  {bytesToReadable(file.size)}
                </Text>
              </Stack>
            </Group>
            {statusIndicator}
          </Group>
        </Paper>
      )}

      {hasFile && (
        <Stack gap="xl">
          <SegmentedControl
            value={mode}
            onChange={value => setMode(value as CompressionMode)}
            data={[
              { label: 'Optimized', value: 'optimize' },
              { label: 'Rasterized', value: 'rasterize' },
            ]}
            fullWidth
            disabled={isProcessing}
            aria-label="Compression mode"
          />

          {mode === 'rasterize' && (
            <Stack gap="lg">
              <Text size="sm" c="dimmed">
                Rasterizing converts each page into an image. Text, links, and forms will no longer be
                selectable.
              </Text>
              <Group align="flex-start" gap="lg" wrap="wrap">
                <Stack gap="xs" style={{ minWidth: 220 }}>
                  <Text size="sm" fw={500}>
                    Target resolution ({rasterDpi} DPI)
                  </Text>
                  <Slider
                    value={rasterDpi}
                    onChange={setRasterDpi}
                    min={100}
                    max={300}
                    step={25}
                    marks={[
                      { value: 100, label: '100' },
                      { value: 150, label: '150' },
                      { value: 200, label: '200' },
                      { value: 250, label: '250' },
                      { value: 300, label: '300' },
                    ]}
                    disabled={isProcessing}
                  />
                </Stack>
                <Stack gap="xs" style={{ minWidth: 220 }}>
                  <Text size="sm" fw={500}>
                    Image quality {(rasterQuality * 100).toFixed(0)}%
                  </Text>
                  <Slider
                    value={rasterQuality}
                    onChange={setRasterQuality}
                    min={0.4}
                    max={0.95}
                    step={0.05}
                    precision={2}
                    label={value => `${Math.round(value * 100)}%`}
                    disabled={isProcessing}
                  />
                </Stack>
              </Group>
            </Stack>
          )}

          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Output file name
            </Text>
            <TextInput
              value={outputName}
              onChange={event => setOutputName(event.currentTarget.value)}
              onBlur={event => setOutputName(ensurePdfExtension(event.currentTarget.value))}
              placeholder="document-compressed.pdf"
              disabled={isProcessing}
            />
          </Stack>
        </Stack>
      )}

      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Badge color="gray" variant="light">
            {hasFile ? 'PDF selected' : 'No file yet'}
          </Badge>
          {hasFile && (
            <Badge color="brand" variant="light">
              Mode: {mode === 'optimize' ? 'Optimized' : 'Rasterized'}
            </Badge>
          )}
          {savingsLabel && status === 'success' && (
            <Text size="sm" c="dimmed">
              {savingsLabel}
            </Text>
          )}
        </Group>

        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleClear}
            disabled={!hasFile || isProcessing}
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              void handleCompress()
            }}
            loading={isProcessing}
            disabled={!hasFile}
            leftSection={<IconGauge size={16} />}
          >
            Compress PDF
          </Button>
        </Group>
      </Group>

      {result && status === 'success' && (
        <Button
          component="a"
          href={result.url}
          download={result.name}
          variant="light"
          color="teal"
          leftSection={<IconDownload size={16} />}
        >
          Download {result.name} ({bytesToReadable(result.size)})
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
