import { Loader, Stack, Text, Title } from '@mantine/core'
import { Dropzone, type DropzoneProps, IMAGE_MIME_TYPE } from '@mantine/dropzone'
import { IconPhotoPlus } from '@tabler/icons-react'
import { type ReactElement, useEffect } from 'react'

type ImageDropzoneProps = Omit<DropzoneProps, 'children'> & {
  title?: string
  description?: string
  subDescription?: string
}

export function ImageDropzone({
  title = 'Upload an image',
  description,
  subDescription,
  loading,
  maxSize = 5 * 1024 * 1024,
  accept = IMAGE_MIME_TYPE,
  onDrop,
  ...props
}: ImageDropzoneProps): ReactElement {
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (loading) return
      const items = event.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            files.push(file)
          }
        }
      }

      if (files.length > 0 && onDrop) {
        onDrop(files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [loading, onDrop])

  const getFormats = () => {
    const types = Array.isArray(accept) ? accept : Object.keys(accept)
    const exts = types.map(t => {
      if (t === 'image/jpeg') return 'JPEG'
      if (t === 'image/png') return 'PNG'
      if (t === 'image/webp') return 'WebP'
      if (t === 'image/avif') return 'AVIF'
      if (t === 'image/gif') return 'GIF'
      if (t === 'image/svg+xml') return 'SVG'
      return t.split('/')[1].toUpperCase()
    })
    return [...new Set(exts)].join(', ')
  }

  const formats = getFormats()
  const sizeLimit = `${(maxSize / (1024 * 1024)).toFixed(0)} MB`

  const displayDescription = description ?? `Supported: ${formats}`
  const displaySubDescription =
    subDescription ?? `Drag & drop, paste, or click to browse (max ${sizeLimit})`

  return (
    <Dropzone
      maxFiles={1}
      accept={accept}
      maxSize={maxSize}
      loading={loading}
      onDrop={onDrop}
      radius="lg"
      p="xl"
      className="cursor-pointer border-dashed border-2"
      {...props}
    >
      <Stack align="center" gap="md" className="pointer-events-none">
        {loading ? <Loader /> : <IconPhotoPlus size={48} stroke={1.4} />}
        <Stack gap={4} align="center">
          <Title order={3}>{title}</Title>
          <Text size="sm" c="dimmed" ta="center">
            {displayDescription}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {displaySubDescription}
          </Text>
        </Stack>
      </Stack>
    </Dropzone>
  )
}
