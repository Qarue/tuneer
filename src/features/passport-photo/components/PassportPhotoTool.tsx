import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Dropzone, type FileRejection, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { IconDownload, IconPhotoPlus, IconRefresh } from '@tabler/icons-react'
import { type CSSProperties, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { canvasToBlobUrl, cropImageToCanvas } from '../utils/canvas'
import { loadFileWithOrientation } from '../utils/image'
import {
  defaultPassportPresetId,
  type PassportPreset,
  passportPresetMap,
  passportPresets,
} from '../utils/presets'

const EXPORT_MIME = 'image/jpeg'

export function PassportPhotoTool(): ReactElement {
  const [activePresetId, setActivePresetId] = useState(defaultPassportPresetId)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activePreset = useMemo<PassportPreset | undefined>(
    () => passportPresetMap.get(activePresetId) ?? passportPresets[0],
    [activePresetId],
  )

  type CropperCustomStyles = {
    containerStyle?: CSSProperties
    mediaStyle?: CSSProperties
    cropAreaStyle?: CSSProperties
  }

  const cropperStyles = useMemo<CropperCustomStyles>(
    () => ({
      cropAreaStyle: {
        border: '2px solid rgba(255, 255, 255, 0.92)',
        borderRadius: 16,
        boxShadow: '0 0 0 1600px rgba(15, 23, 42, 1)',
      },
    }),
    [],
  )

  useEffect(() => {
    if (!imageSrc) {
      setImageElement(null)
      return
    }

    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    image.onload = () => {
      if (!cancelled) {
        setImageElement(image)
      }
    }
    image.onerror = () => {
      if (!cancelled) {
        setError('Unable to render the uploaded image. Please try a different file.')
      }
    }

    return () => {
      cancelled = true
    }
  }, [imageSrc])

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const loaded = await loadFileWithOrientation(file)
      setImageSrc(loaded.dataUrl)
      setImageMeta({ width: loaded.width, height: loaded.height })
      setZoom(1)
      setRotation(0)
      setCrop({ x: 0, y: 0 })
      setCroppedAreaPixels(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to read the selected file.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return
      }

      await handleFile(files[0])
    },
    [handleFile],
  )

  const handleReject = useCallback((rejections: FileRejection[]) => {
    if (rejections.length === 0) {
      return
    }

    const firstError = rejections[0]?.errors[0]?.message
    setError(firstError ?? 'File not accepted. Please upload a JPEG or PNG under 8 MB.')
  }, [])

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.currentTarget.files?.[0]
      if (nextFile) {
        await handleFile(nextFile)
      }

      event.currentTarget.value = ''
    },
    [handleFile],
  )

  const handleResetAdjustments = useCallback(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
  }, [])

  const buildPassportCanvas = useCallback(
    (preset: PassportPreset) => {
      if (!imageElement) {
        throw new Error('Image not ready for export')
      }
      if (!croppedAreaPixels) {
        throw new Error('Finalize the crop area before exporting.')
      }

      const croppedCanvas = cropImageToCanvas(imageElement, croppedAreaPixels, rotation)

      const subjectCanvas = document.createElement('canvas')
      subjectCanvas.width = preset.widthPx
      subjectCanvas.height = preset.heightPx
      const subjectCtx = subjectCanvas.getContext('2d', { willReadFrequently: true })

      if (!subjectCtx) {
        throw new Error('Unable to initialise canvas context for scaling.')
      }

      subjectCtx.drawImage(croppedCanvas, 0, 0, preset.widthPx, preset.heightPx)

      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = preset.widthPx
      finalCanvas.height = preset.heightPx
      const finalCtx = finalCanvas.getContext('2d')

      if (!finalCtx) {
        throw new Error('Unable to initialise export canvas context.')
      }

      finalCtx.fillStyle = '#ffffff'
      finalCtx.fillRect(0, 0, preset.widthPx, preset.heightPx)
      finalCtx.drawImage(subjectCanvas, 0, 0)

      return finalCanvas
    },
    [croppedAreaPixels, imageElement, rotation],
  )

  const handleExport = useCallback(
    async (preset: PassportPreset | undefined) => {
      if (!preset) {
        return
      }

      setError(null)
      setIsExporting(true)

      try {
        const canvas = buildPassportCanvas(preset)

        const blobUrl = await canvasToBlobUrl(canvas, EXPORT_MIME)
        const anchor = document.createElement('a')
        anchor.href = blobUrl
        anchor.download = `passport-${preset.id}.jpg`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(blobUrl)
      } catch (exportError) {
        setError(exportError instanceof Error ? exportError.message : 'Export failed. Please retry.')
      } finally {
        setIsExporting(false)
      }
    },
    [buildPassportCanvas],
  )

  const presetOptions = useMemo(
    () =>
      passportPresets.map(preset => ({
        value: preset.id,
        label: preset.label,
      })),
    [],
  )

  return (
    <Stack gap="xl">
      {error ? (
        <Alert color="red" variant="light" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_MIME_TYPE.join(',')}
        style={{ display: 'none' }}
        onChange={event => {
          void handleFileInputChange(event)
        }}
      />

      {!imageSrc ? (
        <Dropzone
          maxFiles={1}
          accept={IMAGE_MIME_TYPE}
          maxSize={8 * 1024 * 1024}
          loading={isLoading}
          onDrop={files => {
            void handleDrop(files)
          }}
          onReject={handleReject}
          radius="lg"
          p="xl"
          style={{ borderStyle: 'dashed' }}
        >
          <Stack align="center" gap="md">
            {isLoading ? <Loader /> : <IconPhotoPlus size={48} stroke={1.4} />}
            <Stack gap={4} align="center">
              <Title order={3}>Upload a portrait photo</Title>
              <Text size="sm" c="dimmed">
                JPEG or PNG, up to 8 MB. Use a neutral, evenly lit background for best results.
              </Text>
              <Text size="sm" c="dimmed">
                Drag & drop or click to browse.
              </Text>
            </Stack>
          </Stack>
        </Dropzone>
      ) : (
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Stack gap="md">
              <Paper withBorder radius="lg" shadow="xs" p="xs" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(70vw, 480px)',
                    backgroundColor: 'var(--mantine-color-gray-1)',
                  }}
                >
                  <Cropper
                    image={imageSrc ?? undefined}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={activePreset ? activePreset.widthPx / activePreset.heightPx : 1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                    zoomWithScroll
                    showGrid
                    cropShape="rect"
                    style={cropperStyles}
                  />
                  {isLoading ? (
                    <Group
                      justify="center"
                      align="center"
                      style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.65)' }}
                    >
                      <Loader />
                    </Group>
                  ) : null}
                </div>
              </Paper>

              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>
                    Zoom
                  </Text>
                  <Text size="xs" c="dimmed">
                    {(zoom * 100).toFixed(0)}%
                  </Text>
                </Group>
                <Slider min={1} max={4} step={0.05} value={zoom} onChange={setZoom} aria-label="Zoom" />

                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>
                    Rotation
                  </Text>
                  <Text size="xs" c="dimmed">
                    {rotation.toFixed(0)}°
                  </Text>
                </Group>
                <Slider
                  min={-45}
                  max={45}
                  step={1}
                  value={rotation}
                  onChange={setRotation}
                  aria-label="Rotation"
                />

                <Group justify="flex-start" gap="sm">
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleResetAdjustments}
                  >
                    Reset crop
                  </Button>
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                      fileInputRef.current?.click()
                    }}
                  >
                    Replace photo
                  </Button>
                </Group>
              </Stack>
            </Stack>

            <Stack gap="lg">
              <Stack gap="sm">
                <Text size="sm" fw={600}>
                  Country preset
                </Text>
                <Select
                  value={activePreset?.id ?? defaultPassportPresetId}
                  data={presetOptions}
                  onChange={value => {
                    if (value) {
                      setActivePresetId(value)
                    }
                  }}
                  nothingFoundMessage="No presets"
                />
                {activePreset ? (
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Badge color="brand" variant="light">
                        {activePreset.country}
                      </Badge>
                      <Badge color="gray" variant="outline">
                        {activePreset.widthPx}×{activePreset.heightPx} px
                      </Badge>
                      <Badge color="gray" variant="outline">
                        {activePreset.widthInches}" × {activePreset.heightInches}" @{activePreset.dpi}
                        dpi
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {activePreset.description}
                    </Text>
                    {activePreset.notes ? (
                      <Text size="xs" c="dimmed">
                        {activePreset.notes}
                      </Text>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>

              {imageMeta ? (
                <Text size="xs" c="dimmed">
                  Original resolution: {imageMeta.width.toLocaleString()} × {imageMeta.height.toLocaleString()} px
                </Text>
              ) : null}

              <Divider />

              <Stack gap="sm">
                <Text size="sm" fw={600}>
                  Export
                </Text>
                <Text size="xs" c="dimmed">
                  Downloads a JPEG ready for printing or online submission at the chosen preset size.
                </Text>
                <Button
                  leftSection={<IconDownload size={18} />}
                  loading={isExporting}
                  onClick={() => {
                    void handleExport(activePreset)
                  }}
                  disabled={isExporting || !activePreset}
                >
                  Export {activePreset?.label}
                </Button>
              </Stack>
            </Stack>
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  )
}
