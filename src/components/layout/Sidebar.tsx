import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  QrCode,
  ScanLine,
  History,
  BarChart3,
  LogOut,
  ChevronRight,
  X,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

const ALL_NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',        icon: LayoutDashboard, end: true, roles: ['superadmin'] },
  { to: '/events',    label: 'Events',            icon: CalendarDays, roles: ['superadmin'] },
  { to: '/guests',    label: 'Guests',            icon: Users, roles: ['superadmin'] },
  { to: '/scanner',   label: 'QR Scanner',        icon: ScanLine, roles: ['superadmin', 'operator'] },
  { to: '/manual-checkin', label: 'Check-in Manual', icon: ClipboardCheck, roles: ['superadmin', 'operator'] },
  { to: '/history',   label: 'Check-in History',  icon: History, roles: ['superadmin', 'operator'] },
  { to: '/analytics', label: 'Analytics',         icon: BarChart3, roles: ['superadmin'] },
  { to: '/operators', label: 'Operators',         icon: Users, roles: ['superadmin'] },
]

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Signed out successfully')
    } catch {
      toast.error('Failed to sign out')
    }
  }
  
  const userRole = profile?.role || 'superadmin'
  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-200 dark:border-surface-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm shadow-primary-900/30">
          <QrCode className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-surface-900 dark:text-white tracking-tight">
            GuestSync
          </span>
          <p className="text-[10px] text-surface-400 dark:text-surface-500 leading-none mt-0.5">
            {userRole === 'superadmin' ? 'Event Management' : 'Operator Mode'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:translate-x-0.5')} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary-400 dark:text-primary-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-semibold shrink-0">
            {getInitials(profile?.full_name || user?.email || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-surface-900 shadow-2xl flex flex-col animate-slide-in">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
