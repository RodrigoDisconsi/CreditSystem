import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import NotFoundPage from './pages/NotFoundPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      { path: 'applications/new', element: <SuspenseWrapper><NewApplicationPage /></SuspenseWrapper> },
      { path: 'applications/:id', element: <SuspenseWrapper><ApplicationDetailPage /></SuspenseWrapper> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
