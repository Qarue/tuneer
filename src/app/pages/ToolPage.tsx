import { Alert, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { type ReactElement, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { defaultToolId, toolMap } from '@/app/tool-registry'

export function ToolPage(): ReactElement {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = toolId ? toolMap.get(toolId) : undefined

  if (!tool) {
    if (defaultToolId) {
      return <Navigate to={`/tools/${defaultToolId}`} replace />
    }

    return (
      <Alert
        icon={<IconAlertTriangle size={18} />}
        title="No tools registered"
        color="red"
        variant="light"
      >
        We could not locate the requested tool. Please check back once tools are registered.
      </Alert>
    )
  }

  const ToolComponent = tool.component

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <tool.icon size={24} />
        <Title order={2}>{tool.name}</Title>
      </Group>
      <Text c="dimmed">{tool.description}</Text>
      <Paper withBorder shadow="xs" radius="lg" p="lg">
        <Suspense
          fallback={
            <Group justify="center" py="xl">
              <Loader type="oval" />
            </Group>
          }
        >
          <ToolComponent />
        </Suspense>
      </Paper>
    </Stack>
  )
}
