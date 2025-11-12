import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { type ReactElement } from 'react'
import { Link } from 'react-router-dom'

import { toolRegistry } from '@/app/tool-registry'

export function HomePage(): ReactElement {
  return (
    <Stack gap="xl">
      <Stack gap="sm">
        <Title order={1}>Tuneer Toolkit</Title>
        <Text size="lg" c="dimmed">
          A focused suite of client-side utilities for secure document, text, and media workflows.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {toolRegistry.map(tool => (
          <Card
            key={tool.id}
            component={Link}
            to={`/tools/${tool.id}`}
            padding="lg"
            radius="lg"
            withBorder
            shadow="sm"
          >
            <Stack gap="md">
              <Group gap="sm">
                <tool.icon size={22} />
                <Title order={3}>{tool.name}</Title>
              </Group>
              <Text size="sm" c="dimmed">
                {tool.description}
              </Text>
              <Group gap={8}>
                <Badge color="brand" variant="light">
                  {tool.category}
                </Badge>
                {tool.keywords.slice(0, 2).map((keyword: string) => (
                  <Badge key={keyword} color="gray" variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
