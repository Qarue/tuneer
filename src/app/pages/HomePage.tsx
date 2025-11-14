import { Anchor, Badge, Card, Divider, Group, List, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { type ReactElement } from 'react'
import { Link } from 'react-router-dom'

import { toolRegistry } from '@/app/tool-registry'
import { siteConfig } from '@/config/site'
import { useSeo } from '@/hooks/useSeo'

export function HomePage(): ReactElement {
  useSeo({
    title: 'Privacy-first browser toolkit for PDFs, images, and text',
    description:
      'Tuneer offers fast, private, in-browser tools for PDFs, passport photos, Base64, JWTs, and image conversion—no uploads required.',
    keywords: siteConfig.keywords,
    canonical: `${siteConfig.url}/`,
  })

  return (
    <Stack gap="xl">
      <Stack gap="sm">
        <Title order={1}>Tuneer Toolkit</Title>
        <Text size="lg" c="dimmed">
          A focused suite of client-side utilities for secure document, text, and media workflows.
        </Text>
        <Text size="sm">
          Work entirely in the browser—your PDFs, images, and tokens never leave your device. Each tool is
          carefully tuned for instant feedback, accessibility, and responsive layouts so you can work efficiently on
          desktop or mobile.
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

      <Stack gap="lg">
        <Divider label="Why professionals choose Tuneer" labelPosition="left" />
        <List spacing="sm" size="sm" c="dimmed">
          <List.Item>
            All processing happens locally so sensitive client documents and biometric photos remain private.
          </List.Item>
          <List.Item>
            Built with modern performance patterns—debounced interactions, responsive layouts, and keyboard friendly
            forms keep teams productive.
          </List.Item>
          <List.Item>
            Works off-line after the first load, enabling recurring tasks like PDF compression or Base64 conversion
            even on restrictive networks.
          </List.Item>
        </List>
        <Group gap="md">
          <Anchor component={Link} to="/tools/pdf-compress" size="sm">
            Compress a PDF now
          </Anchor>
          <Anchor component={Link} to="/tools/passport-photo-resizer" size="sm">
            Create a passport photo
          </Anchor>
          <Anchor component={Link} to="/tools/jwt-encode-decode" size="sm">
            Inspect a JWT securely
          </Anchor>
        </Group>
      </Stack>
    </Stack>
  )
}
