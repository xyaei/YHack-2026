import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IconChevronLeft, IconChevronRight, IconMenu, IconRefresh, IconX, LogoGithub } from '@/components/icons'
import { AlertsNotificationsPanel } from '@/components/AlertsNotificationsPanel'
import { useForseen, type AppView } from '@/store/forseen-context'
import { Dashboard } from '@/screens/Dashboard'
import { RagChatScreen } from '@/screens/RagChatScreen'
import { SetupScreen } from '@/screens/SetupScreen'
import { DrillDownModal } from '@/components/DrillDownModal'

const SIDEBAR_STORAGE_KEY = 'forseen-sidebar-collapsed'

/** Replace with your repo / hackathon submission URLs */
const EXTERNAL_LINKS = {
  github: 'https://github.com/',
  devpost: 'https://devpost.com/',
} as const

function socialLinkClass(collapsed: boolean) {
  return cn(
    'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-light text-white/80 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
    collapsed && 'justify-center px-2',
  )
}

function DevpostLogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/devpost-logo.png"
      alt=""
      width={20}
      height={20}
      className={cn('size-5 shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}

function SidebarSocialLinks({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="mt-auto border-t border-white/15 p-2">
      <div className="flex flex-col gap-0.5">
        <a
          href={EXTERNAL_LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className={socialLinkClass(collapsed)}
          title={collapsed ? 'GitHub' : undefined}
        >
          <LogoGithub className="size-5 shrink-0" aria-hidden />
          {!collapsed && <span className="truncate">GitHub</span>}
        </a>
        <a
          href={EXTERNAL_LINKS.devpost}
          target="_blank"
          rel="noopener noreferrer"
          className={socialLinkClass(collapsed)}
          title={collapsed ? 'Devpost' : undefined}
        >
          <DevpostLogoMark />
          {!collapsed && <span className="truncate">Devpost</span>}
        </a>
      </div>
    </div>
  )
}

const nav: { id: AppView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'setup', label: 'Setup' },
  { id: 'rag', label: 'Chat' },
]

export function AppShell() {
  const { company, activeView, setActiveView, refreshMocks, loading, drillPredictionId, setDrillPredictionId } = useForseen()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  })

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const onNav = (id: AppView) => {
    setActiveView(id)
    setMobileOpen(false)
  }

  const navActive = (id: AppView) => activeView === id

  const navButtonClass = (active: boolean, collapsed: boolean) =>
    cn(
      'flex w-full items-center rounded-xl border border-transparent px-3 py-2.5 text-sm font-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-accent)]',
      collapsed ? 'justify-center px-2 text-center text-[11px] leading-snug' : 'text-left',
      active ? 'border-white/25 bg-white/15 text-white' : 'text-white/80 hover:border-white/15 hover:bg-white/10 hover:text-white',
    )

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-[color:var(--color-page)] text-neutral-800',
        activeView === 'setup' && 'h-dvh overflow-hidden',
      )}
    >
      <Toaster position="top-center" richColors closeButton />

      {/* Desktop sidebar — fixed full viewport height */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-dvh max-h-dvh flex-col overflow-hidden border-r border-white/10 bg-[color:var(--color-accent)] text-white transition-[width] duration-200 ease-out md:flex',
          sidebarCollapsed ? 'md:w-24' : 'md:w-56',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 border-b border-white/15 px-2',
            sidebarCollapsed ? 'h-14 items-center justify-center' : 'min-h-[3.75rem] items-center justify-between gap-1 py-2.5',
          )}
        >
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1 px-1">
              <span className="block truncate text-sm font-light tracking-tight">Forseen</span>
              <span className="mt-0.5 block text-[10px] font-light leading-snug text-white/75">
                your regulatory early-warning system
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <IconChevronRight className="size-5" aria-hidden /> : <IconChevronLeft className="size-5" aria-hidden />}
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              title={sidebarCollapsed ? item.label : undefined}
              onClick={() => onNav(item.id)}
              className={navButtonClass(navActive(item.id), sidebarCollapsed)}
            >
              <span className={sidebarCollapsed ? 'text-balance break-words text-center' : 'truncate'}>{item.label}</span>
            </button>
          ))}
        </nav>

        <SidebarSocialLinks collapsed={sidebarCollapsed} />
      </aside>

      {/* Main column — offset for fixed sidebar on md+ */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out',
          sidebarCollapsed ? 'md:ml-24' : 'md:ml-56',
          activeView === 'setup' && 'min-h-0 overflow-hidden',
        )}
      >
        <header className="sticky top-0 z-40 border-b border-neutral-200/50 bg-[color:var(--color-elevated)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <button
                type="button"
                className="inline-flex shrink-0 rounded-xl border border-neutral-200/80 bg-[color:var(--color-elevated)] p-2 md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <IconMenu aria-hidden />
              </button>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
                <div className="min-w-0 flex-1 sm:max-w-md md:max-w-lg lg:max-w-xl">
                  <div className="sm:hidden">
                    <p className="truncate text-sm font-light tracking-tight">Forseen</p>
                    <p className="mt-0.5 truncate text-[10px] font-light leading-snug text-neutral-500">
                      your regulatory early-warning system
                    </p>
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="truncate text-sm font-light text-neutral-800">{company.name}</p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {company.industry} · {company.operating_states.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 border-l border-neutral-200/80 pl-3 text-left sm:pl-4">
                  <p className="text-[11px] font-light leading-tight text-neutral-500">Last regulation refresh</p>
                  <p className="text-sm font-light tabular-nums text-neutral-800">Today</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AlertsNotificationsPanel />
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                disabled={loading}
                onClick={() => {
                  refreshMocks()
                }}
              >
                <IconRefresh className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <main
          className={cn(
            'min-w-0 flex-1',
            activeView === 'setup'
              ? 'flex min-h-0 flex-col overflow-hidden px-5 py-4 pb-2 md:px-10 md:py-5 md:pb-3 lg:px-14'
              : 'px-4 py-6 pb-32 md:px-8 md:py-8 md:pb-8',
          )}
        >
          {activeView === 'rag' ? (
            <RagChatScreen />
          ) : activeView === 'setup' ? (
            <SetupScreen />
          ) : (
            <div className="mx-auto max-w-7xl">
              {activeView === 'dashboard' && <Dashboard />}
            </div>
          )}
        </main>

        <footer
          className={cn(
            'border-t border-neutral-200/50 bg-[color:var(--color-elevated)] py-4 text-center text-xs text-neutral-500 md:mt-auto',
            activeView === 'setup' && 'hidden',
          )}
        >
         Powered by K2 / Hermes / Hex
        </footer>
      </div>

      {/* Mobile bottom nav + social strip (sidebar-style green) */}
      <div className={cn('sticky bottom-0 z-30 md:hidden', activeView === 'setup' && 'hidden')}>
        <nav className="flex overflow-x-auto border-t border-neutral-200/60 bg-[color:var(--color-elevated)] backdrop-blur-sm">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center px-1.5 py-2.5 text-center text-[10px] font-light leading-tight',
                navActive(item.id) ? 'text-[color:var(--color-accent)]' : 'text-neutral-500',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-center gap-1 border-t border-white/15 bg-[color:var(--color-accent)] px-2 py-2.5">
          <a
            href={EXTERNAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/10"
            aria-label="GitHub"
          >
            <LogoGithub className="size-6" aria-hidden />
          </a>
          <a
            href={EXTERNAL_LINKS.devpost}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/10"
            aria-label="Devpost"
          >
            <img src="/devpost-logo.png" alt="" width={24} height={24} className="size-6 object-contain" draggable={false} />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute left-0 top-0 flex h-full w-[min(280px,85vw)] flex-col border-r border-white/10 bg-[color:var(--color-accent)] p-0 text-white shadow-none"
            >
              <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/15 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-light">Forseen</span>
                  <span className="mt-0.5 block text-[10px] font-light leading-snug text-white/75">
                    your regulatory early-warning system
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-white/20 hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close"
                >
                  <IconX className="size-5" />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
                {nav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNav(item.id)}
                    className={navButtonClass(navActive(item.id), false)}
                  >
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
              <SidebarSocialLinks collapsed={false} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <DrillDownModal open={drillPredictionId != null} predictionId={drillPredictionId} onOpenChange={(o) => !o && setDrillPredictionId(null)} />
    </div>
  )
}
