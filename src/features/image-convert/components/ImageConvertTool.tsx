import {
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  FileButton,
  Group,
  Image,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  IconAlertCircle,
  IconArrowsShuffle,
  IconCheck,
  IconClipboard,
  IconDownload,
  IconFileUpload,
  IconPhoto,
  IconRefresh,
} from '@tabler/icons-react'
import { type ReactElement, useEffect, useRef, useState } from 'react'

import {
  type ConversionOptions,
  convertImage,
  getMimeType,
  type ImageFormat,
  type LoadedImage,
  loadImageFromFile,
} from '../utils/convert'

type ConversionState = 'idle' | 'processing' | 'success' | 'error'

type ConvertedAsset = {
  blob: Blob
  url: string
  size: number
}

const supportedFormats: ImageFormat[] = ['png', 'jpeg', 'webp', 'gif']

const formatLabels: Record<ImageFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
  gif: 'GIF',
}

const formatDescriptions: Record<ImageFormat, string> = {
  png: 'Lossless format with transparency support.',
  jpeg: 'Good for photos. Adjustable quality.',
  webp: 'Modern format with strong compression.',
  gif: 'Legacy format for simple images. No animation support.',
}

const lossyFormats: ImageFormat[] = ['jpeg', 'webp']

const readableSize = (sizeInBytes: number): string => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let size = sizeInBytes

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  return `${size.toFixed(size < 10 && index > 0 ? 1 : 0)} ${units[index]}`
}

const buildDownloadName = (file: File, format: ImageFormat): string => {
  const extension = format === 'jpeg' ? 'jpg' : format
  const fileName = file.name.replace(/\.[^.]+$/u, '')
  return `${fileName || 'converted-image'}.${extension}`
}

const revokeUrls = (assets: ConvertedAsset[]) => {
  assets.forEach(asset => {
    URL.revokeObjectURL(asset.url)
  })
}

const releaseLoadedImage = (image: LoadedImage | null) => {
  if (image) {
    URL.revokeObjectURL(image.url)
  }
}

export function ImageConvertTool(): ReactElement {
  const [file, setFile] = useState<File | null>(null)
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('png')
  const [quality, setQuality] = useState<number>(90)
  const [conversionState, setConversionState] = useState<ConversionState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [converted, setConverted] = useState<ConvertedAsset | null>(null)
  const resultCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (converted) {
        URL.revokeObjectURL(converted.url)
      }
    }
  }, [converted])

  useEffect(() => {
    return () => {
      releaseLoadedImage(loadedImage)
    }
  }, [loadedImage])

  useEffect(() => {
    if (conversionState === 'success' && resultCardRef.current) {
      resultCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [conversionState])

  const reset = () => {
    if (converted) {
      revokeUrls([converted])
    }

    setConverted(null)
    setConversionState('idle')
    setErrorMessage(null)
  }

  const clearAll = () => {
    reset()
    setFile(null)
    releaseLoadedImage(loadedImage)
    setLoadedImage(null)
  }

  const handleFileSelect = async (files: File[]) => {
    const [selected] = files

    if (!selected) {
      return
    }

    reset()

    try {
      const nextImage = await loadImageFromFile(selected)

      releaseLoadedImage(loadedImage)
      setFile(selected)
      setLoadedImage(nextImage)
    } catch {
      setErrorMessage('We could not open that image. Try a different file.')
      setFile(null)
      setLoadedImage(null)
    }
  }

  const handleConvert = async () => {
    if (!file || !loadedImage) {
      setErrorMessage('Upload an image before converting.')
      return
    }

    reset()
    setConversionState('processing')

    const options: ConversionOptions = {
      format: targetFormat,
      quality: lossyFormats.includes(targetFormat) ? quality / 100 : undefined,
    }

    try {
      const blob = await convertImage(loadedImage.image, options)
      const url = URL.createObjectURL(blob)
      const asset: ConvertedAsset = {
        blob,
        url,
        size: blob.size,
      }

      setConverted(asset)
      setConversionState('success')
    } catch {
      setConversionState('error')
      setErrorMessage('Something went wrong while converting the image. Please try again.')
    }
  }

  const handleDownload = () => {
    if (!file || !converted) {
      return
    }

    const link = document.createElement('a')
    link.href = converted.url
    link.download = buildDownloadName(file, targetFormat)
    document.body.append(link)
    link.click()
    link.remove()
  }

  const sourceInfo = file && loadedImage ? (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Original image
        </Text>
        <Group gap="lg" wrap="wrap">
          <Group gap={4}>
            <Badge variant="light" color="gray">
              {file.type || 'Unknown'}
            </Badge>
            <Text size="sm" c="dimmed">
              {readableSize(file.size)}
            </Text>
          </Group>

          <Text size="sm" c="dimmed">
            {loadedImage.width.toLocaleString()} × {loadedImage.height.toLocaleString()} px
          </Text>
        </Group>
      </Stack>
    </Paper>
  ) : null

  const preview = loadedImage ? (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Preview
        </Text>
        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <Image
            src={loadedImage.url}
            alt="Uploaded preview"
            radius="md"
            style={{ maxHeight: 320, objectFit: 'contain' }}
          />
        </Box>
      </Stack>
    </Paper>
  ) : null

  const conversionResult = converted ? (
    <Box ref={resultCardRef}>
      <Paper
        withBorder
        radius="md"
        p="md"
        shadow="sm"
        style={{
          borderColor: 'var(--mantine-color-teal-4, #38d9a9)',
          borderLeft: '4px solid var(--mantine-color-teal-5, #20c997)',
          backgroundColor: 'var(--mantine-color-body, #ffffff)',
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                Converted image ready
              </Text>
              <Text size="xs" c="dimmed">
                Download or share without leaving this panel.
              </Text>
            </Stack>
            <Badge color="teal" variant="filled">
              Done
            </Badge>
          </Group>

          <Group gap="md" wrap="wrap">
            <Text size="sm" c="dimmed">
              Size: {readableSize(converted.size)}
            </Text>
            <Text size="sm" c="dimmed">
              MIME type: {getMimeType(targetFormat)}
            </Text>
          </Group>

          <Group gap="md" wrap="wrap">
            <Button leftSection={<IconDownload size={18} />} onClick={handleDownload}>
              Download image
            </Button>
            <CopyButton value={converted.url} timeout={1000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy link'} withArrow>
                  <Button
                    variant="light"
                    color={copied ? 'teal' : 'gray'}
                    leftSection={copied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
                    onClick={() => {
                      void copy()
                    }}
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Paper>
    </Box>
  ) : null

  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack gap="lg">
          <Dropzone
            onDrop={files => {
              void handleFileSelect(files)
            }}
            accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp, MIME_TYPES.gif]}
            maxFiles={1}
            multiple={false}
            radius="md"
            styles={{ inner: { padding: '3rem 1.5rem' } }}
          >
            <Stack align="center" gap="sm">
              <IconFileUpload size={48} stroke={1.5} />
              <Text size="lg" fw={600}>
                Drop your image here, or click to browse
              </Text>
              <Text size="sm" c="dimmed">
                Supports PNG, JPEG, WebP, and GIF. Max 1 image at a time.
              </Text>
            </Stack>
          </Dropzone>

          <Group gap="sm" justify="space-between">
            <FileButton
              onChange={fileList => {
                if (fileList) {
                  void handleFileSelect([fileList])
                }
              }}
              accept="image/*"
            >
              {props => (
                <Button leftSection={<IconPhoto size={18} />} {...props}>
                  Choose image
                </Button>
              )}
            </FileButton>

            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconRefresh size={16} />}
              onClick={clearAll}
              disabled={!file}
            >
              Clear
            </Button>
          </Group>

          {sourceInfo}
        </Stack>

        <Stack gap="lg">
          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Stack gap={4}>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                  Target format
                </Text>
                <SegmentedControl
                  value={targetFormat}
                  onChange={value => setTargetFormat(value as ImageFormat)}
                  data={supportedFormats.map(format => ({ label: formatLabels[format], value: format }))}
                  fullWidth
                  size="sm"
                />
              </Stack>

              <Text size="sm" c="dimmed">
                {formatDescriptions[targetFormat]}
              </Text>

              {lossyFormats.includes(targetFormat) ? (
                <NumberInput
                  label="Quality"
                  description="Controls the compression level. Higher is better quality but larger files."
                  value={quality}
                  onChange={value => setQuality(Number(value) || 0)}
                  min={10}
                  max={100}
                  step={5}
                  suffix="%"
                  clampBehavior="strict"
                />
              ) : null}

              <Button
                leftSection={<IconArrowsShuffle size={18} />}
                onClick={() => {
                  void handleConvert()
                }}
                disabled={!file || conversionState === 'processing'}
              >
                {conversionState === 'processing' ? 'Converting…' : 'Convert image'}
              </Button>

              {conversionState === 'error' && errorMessage ? (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  {errorMessage}
                </Alert>
              ) : null}

              {conversionState === 'processing' ? (
                <Alert color="blue" icon={<IconFileUpload size={18} />}>
                  Working on your image. This might take a moment for large files.
                </Alert>
              ) : null}

              {conversionResult}
            </Stack>
          </Paper>

          {preview}
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
