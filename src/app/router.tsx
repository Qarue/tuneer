import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ShellLayout } from './layout/ShellLayout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { defaultToolId } from './tool-registry'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tools/:toolId', element: <ToolPage /> },
      {
        path: '*',
        element: <Navigate to={defaultToolId ? `/tools/${defaultToolId}` : '/'} replace />,
      },
    ],
  },
])
