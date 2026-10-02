'use client'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { logout, selectUser, selectOrg, selectSub } from '@/store/slices/authSlice'
import {
  LayoutDashboard, Package, Store, Map, ShoppingCart, CreditCard,
  FileText, Users, LogOut, Truck, Wallet, Building2, ChevronRight, AlertTriangle, FileSpreadsheet, History
} from 'lucide-react'
import Avatar from '@/components/ui/Avatar'

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/shops', label: 'Shops', icon: Store },
  { href: '/admin/routes', label: 'Routes', icon: Map },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/users', label: 'Team', icon: Users },
  { href: '/admin/exports', label: 'Reports & Exports', icon: FileSpreadsheet },
  { href: '/admin/audit', label: 'Audit Log', icon: History },
]

const SALESMAN_NAV = [
  { href: '/salesman', label: 'My Route Today', icon: Map, exact: true },
]

const DELIVERY_NAV = [
  { href: '/delivery', label: 'Deliveries', icon: Truck, exact: true },
]

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const user = useSelector(selectUser)
  const org = useSelector(selectOrg)
  const sub = useSelector(selectSub)
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()

  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : user?.role === 'SALESMAN' ? SALESMAN_NAV : DELIVERY_NAV

  const isActive = (item) => item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const trialDaysLeft = () => {
    if (sub?.status !== 'TRIALING' || !sub?.trialEndsAt) return null
    const diff = new Date(sub.trialEndsAt) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const days = trialDaysLeft()

  return (
    <>
      {/* Mobile/tablet backdrop — only rendered below the lg breakpoint */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 sm:w-60 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-50 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{org?.name || 'FranchiseManager'}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role?.toLowerCase()} panel</p>
            </div>
          </div>
        </div>

        {/* Trial warning */}
        {days !== null && days <= 7 && (
          <div className="mx-3 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-300 text-xs font-semibold">{days} days left in trial</p>
                <Link href="/admin/billing" onClick={onClose} className="text-amber-400 text-xs underline">Upgrade now →</Link>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive({ href, exact: href === '/admin' || href === '/salesman' || href === '/delivery' })
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-3 pb-1"><p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Account</p></div>
              <Link href="/admin/billing" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith('/admin/billing') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}>
                <Wallet className="w-4 h-4" />
                Billing & Plan
                {sub?.status === 'TRIALING' && <span className="ml-auto text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">TRIAL</span>}
              </Link>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-slate-400 text-[11px] truncate">{user?.email}</p>
            </div>
            <button onClick={() => { dispatch(logout()); router.push('/login') }}
              className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-800">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
