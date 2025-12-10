import { Box, Image, Paper } from '@mantine/core'
import { IconArrowsLeftRight } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

interface ImageComparisonProps {
  before: string
  after: string
  height?: number | string
}

export function ImageComparison({ before, after }: Omit<ImageComparisonProps, 'height'>) {
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const percentage = (x / rect.width) * 100
      setPosition(percentage)
    }
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleTouchStart = () => setIsDragging(true)

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX)
      }
    }
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX)
      }
    }
    const handleGlobalTouchEnd = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('touchend', handleGlobalTouchEnd)
      window.addEventListener('touchmove', handleGlobalTouchMove)
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('touchend', handleGlobalTouchEnd)
      window.removeEventListener('touchmove', handleGlobalTouchMove)
    }
  }, [isDragging])

  return (
    <Box
      ref={containerRef}
      pos="relative"
      className="cursor-ew-resize select-none touch-none overflow-hidden rounded-md"
      style={{
        border: '1px solid var(--mantine-color-gray-3)',
        lineHeight: 0,
      }}
      onMouseDown={e => {
        handleMove(e.clientX)
        handleMouseDown()
      }}
      onTouchStart={e => {
        handleMove(e.touches[0].clientX)
        handleTouchStart()
      }}
    >
      {/* After Image (Background Removed) - Bottom Layer */}
      <Box
        pos="relative"
        style={{
          backgroundImage:
            'linear-gradient(45deg, var(--mantine-color-gray-0) 25%, transparent 25%), linear-gradient(-45deg, var(--mantine-color-gray-0) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--mantine-color-gray-0) 75%), linear-gradient(-45deg, transparent 75%, var(--mantine-color-gray-0) 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        <Image
          src={after}
          className="pointer-events-none block w-full h-auto"
        />
      </Box>

      {/* Before Image (Original) - Top Layer */}
      <Box
        pos="absolute"
        inset={0}
        style={{
          clipPath: `inset(0 calc(100% - ${position}%) 0 0)`,
        }}
      >
        <Image
          src={before}
          className="pointer-events-none block w-full h-full"
        />
      </Box>

      {/* Slider Handle */}
      <Box
        pos="absolute"
        top={0}
        bottom={0}
        w={2}
        bg="white"
        className="pointer-events-none -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{
          left: `${position}%`,
        }}
      >
        <Paper
          shadow="sm"
          radius="xl"
          p={4}
          pos="absolute"
          top="50%"
          left="50%"
          bg="white"
          c="gray.7"
          className="flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        >
          <IconArrowsLeftRight size={16} />
        </Paper>
      </Box>
    </Box>
  )
}
