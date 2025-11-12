import {
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
import { NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom'

import { type ToolDefinition, toolRegistry } from '@/app/tool-registry'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

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
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Group gap={6}>
              <IconTargetArrow size={26} stroke={1.6} />
              <Title order={3}>Tuneer</Title>
            </Group>
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
    </AppShell>
  )
}
