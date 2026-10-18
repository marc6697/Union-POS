import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If undefined, any authenticated user can access. */
  allowedRoles?: UserRole[]
}

/**
 * Wraps routes that require authentication.
 * - Unauthenticated → redirect to /login
 * - Authenticated but wrong role → redirect to their home page
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to role-appropriate home
    const roleHome: Record<UserRole, string> = {
      superadmin: '/admin',
      owner: '/pos',
      staff: '/pos',
      kasir: '/pos',
    }
    return <Navigate to={roleHome[user.role]} replace />
  }

  return <Outlet />
}
