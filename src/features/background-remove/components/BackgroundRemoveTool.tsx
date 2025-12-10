import {
  Alert,
  Button,
  Center,
  Group,
  Image,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
} from '@mantine/core'
import { type FileRejection } from '@mantine/dropzone'
import { IconDownload, IconPhotoOff } from '@tabler/icons-react'
import { type ReactElement, useEffect, useState } from 'react'

import { ImageDropzone } from '@/components/ui/ImageDropzone'
import { ImageComparison } from '@/components/ui/ImageComparison'

import { removeBackground } from '../utils/segmentation'

const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

export function BackgroundRemoveTool(): ReactElement {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>('image')
  const [processedImageSrc, setProcessedImageSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [imageSrc])

  useEffect(() => {
    return () => {
      if (processedImageSrc) {
        URL.revokeObjectURL(processedImageSrc)
      }
    }
  }, [processedImageSrc])

  const handleRemoveBackground = async (url?: string | unknown) => {
    const targetUrl = typeof url === 'string' ? url : imageSrc
    if (!targetUrl) return

    setIsLoading(true)
    setProgress(0)
    setStatus('Initializing AI model (this may take a moment)...')
    setError(null)

    try {
      const resultUrl = await removeBackground(targetUrl, (data: any) => {
        // transformers.js progress callback
        if (data.status === 'progress') {
          setProgress(data.progress)
          setStatus(`Downloading model: ${Math.round(data.progress)}%`)
        } else if (data.status === 'initiate') {
          setStatus(`Downloading ${data.file}...`)
        } else if (data.status === 'done') {
          setStatus('Processing image...')
        }
      })
      setProcessedImageSrc(resultUrl)
    } catch (err) {
      console.error(err)
      setError('Failed to remove background. Please try again.')
    } finally {
      setIsLoading(false)
      setStatus('')
    }
  }

  const handleDrop = (files: File[]) => {
    const file = files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, ''))
    setProcessedImageSrc(null)
    setError(null)
    handleRemoveBackground(url)
  }

  const handleDownload = () => {
    if (!processedImageSrc) return
    const link = document.createElement('a')
    link.href = processedImageSrc
    link.download = `${originalFileName}-bg-removed.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Stack gap="xl">
      {error && (
        <Alert color="red" title="Error" icon={<IconPhotoOff />}>
          {error}
        </Alert>
      )}

      {!imageSrc ? (
        <ImageDropzone
          onDrop={handleDrop}
          onReject={(files: FileRejection[]) => console.log('rejected files', files)}
          maxSize={5 * 1024 ** 2}
          accept={ACCEPTED_MIME_TYPES}
          title="Upload an image"
        />
      ) : (
        <Paper p="md" withBorder>
          <Stack gap="md">
            {processedImageSrc ? (
              <Stack gap="md">
                <ImageComparison before={imageSrc!} after={processedImageSrc} />
                <Group justify="center">
                  <Button onClick={() => setImageSrc(null)} variant="light" color="gray">
                    Reset
                  </Button>
                  <Button onClick={handleDownload} leftSection={<IconDownload size={16} />}>
                    Download PNG
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="md">
                <Center>
                  <Image
                    src={imageSrc}
                    radius="md"
                    fit="contain"
                    h={400}
                    bd="1px solid var(--mantine-color-gray-3)"
                  />
                </Center>

                {isLoading && (
                  <Stack align="center">
                    <Loader type="dots" />
                    <Text size="sm">{status}</Text>
                    {progress > 0 && progress < 100 && <Progress value={progress} w={200} />}
                  </Stack>
                )}

                <Group justify="center">
                  <Button onClick={() => setImageSrc(null)} variant="light" color="gray">
                    Reset
                  </Button>
                  <Button onClick={handleRemoveBackground} loading={isLoading}>
                    Remove Background
                  </Button>
                </Group>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
