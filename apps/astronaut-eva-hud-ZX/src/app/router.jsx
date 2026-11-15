import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { HelmetPage } from '../features/helmet/pages/HelmetPage';
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/helmet" replace /> },
      { path: 'helmet', element: <HelmetPage /> },
      {
        path: '*',
        element: (
          <main className="p-12">
            <h1>Display not found</h1>
            <a href="/helmet" className="text-cyan-200">
              Return to helmet HUD
            </a>
          </main>
        ),
      },
    ],
  },
]);
