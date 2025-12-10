import {
  Anchor,
  AppShell,
  Badge,
  Burger,
  Container,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconSearch, IconTargetArrow } from '@tabler/icons-react'
import { type ReactElement, useMemo, useState } from 'react'
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom'

import { type ToolDefinition, toolRegistry } from '@/app/tool-registry'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { siteConfig } from '@/config/site'

export function ShellLayout(): ReactElement {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [opened, { toggle, close }] = useDisclosure()

  const filteredTools = useMemo<ToolDefinition[]>(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return toolRegistry
    }

    return toolRegistry.filter(tool =>
      [tool.name, tool.description, ...tool.keywords].some(token =>
        token.toLowerCase().includes(query),
      ),
    )
  }, [search])

  return (
    <AppShell
      padding="lg"
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      footer={{ height: 80 }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Link to="/" className="no-underline text-inherit">
              <Group gap={6}>
                <IconTargetArrow size={26} stroke={1.6} />
                <Title order={3}>Tuneer</Title>
              </Group>
            </Link>
          </Group>
          <ThemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" h="100%">
          <TextInput
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            placeholder="Search tools…"
            leftSection={<IconSearch size={16} />}
            aria-label="Search tools"
          />

          <ScrollArea type="auto" style={{ flex: 1 }}>
            <Stack gap={4}>
              {filteredTools.map(tool => {
                const isActive = location.pathname.includes(tool.id)

                return (
                  <NavLink
                    key={tool.id}
                    component={RouterNavLink}
                    to={`/tools/${tool.id}`}
                    label={tool.name}
                    leftSection={<tool.icon size={18} />}
                    rightSection={
                      <Badge color="brand" variant="light">
                        {tool.category}
                      </Badge>
                    }
                    active={isActive}
                    onClick={close}
                  />
                )
              })}
              {filteredTools.length === 0 && (
                <Text c="dimmed" size="sm">
                  No tools match "{search}" yet.
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" py="lg">
          <Outlet />
        </Container>
      </AppShell.Main>

      <AppShell.Footer>
        <Container size="xl" py="md">
          <Group justify="space-between" align="center" gap="sm" wrap="wrap">
            <Stack gap={2}>
              <Text size="sm" fw={600}>
                {siteConfig.name} Toolkit
              </Text>
              <Text size="xs" c="dimmed">
                Fast, private browser utilities for daily PDF, media, and text workflows.
              </Text>
            </Stack>
            <Group gap="md" wrap="wrap">
              <Anchor component={RouterNavLink} to="/tools/pdf-join" size="sm">
                Merge PDFs
              </Anchor>
              <Anchor component={RouterNavLink} to="/tools/pdf-split" size="sm">
                Split PDFs
              </Anchor>
              <Anchor component={RouterNavLink} to="/tools/base64-encoder" size="sm">
                Base64 Encoder
              </Anchor>
              <Anchor component={RouterNavLink} to="/tools/image-convert" size="sm">
                Image Converter
              </Anchor>
            </Group>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  )
}
