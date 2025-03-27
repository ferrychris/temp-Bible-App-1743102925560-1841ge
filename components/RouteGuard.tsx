import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingIndicator } from './LoadingIndicator';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function RouteGuard({ 
  children, 
  requireAuth = false,
  requireAdmin = false,
}: RouteGuardProps) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.replace('/login');
      } else if (requireAdmin && (!user || !user.app_metadata?.isAdmin)) {
        router.replace('/');
      }
    }
  }, [isLoading, user, requireAuth, requireAdmin]);

  if (isLoading) {
    return <LoadingIndicator message="Checking authorization..." />;
  }

  if ((requireAuth && !user) || (requireAdmin && (!user || !user.app_metadata?.isAdmin))) {
    return null;
  }

  return <>{children}</>;
}