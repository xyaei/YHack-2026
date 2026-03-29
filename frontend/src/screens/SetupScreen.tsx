import * as React from 'react'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useForseen } from '@/store/forseen-context'
import { IconArrowRight } from '@/components/icons'
import {
  CERTIFICATION_OPTIONS,
  FUNDING_STAGES,
  INDUSTRY_OPTIONS,
  LEGAL_STRUCTURES,
  REVENUE_RANGES,
  type Company,
  type LegalStructure,
} from '@/data/mocks'

const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

const STATE_ORDER = new Map<string, number>(US_STATE_CODES.map((c, i) => [c, i]))

function sortStateCodes(codes: string[]) {
  return [...codes].sort((a, b) => (STATE_ORDER.get(a) ?? 99) - (STATE_ORDER.get(b) ?? 99))
}

const SELECT_FIELD_CLASS =
  'flex h-11 w-full cursor-pointer rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] px-4 text-sm text-[color:var(--color-ink)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:border-[color:var(--color-accent)]'

/** Legal + industry setup selects: white field, brand green border / focus */
const IDENTITY_SELECT_CLASS = cn(
  'flex h-11 w-full cursor-pointer rounded-2xl border px-4 text-sm transition-colors',
  'bg-white text-neutral-900 shadow-sm [color-scheme:light]',
  'border-[color:var(--color-accent)]/35 hover:border-[color:var(--color-accent)]/55',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:border-[color:var(--color-accent)]',
)

/** Older saves used this as a fallback name — keep the input empty so the placeholder shows. */
function nameForSetupField(stored: string) {
  return stored === 'Untitled company' ? '' : stored
}

// Section configuration
const SECTIONS = [
  { id: 'hero', label: 'Welcome', icon: null },
  { id: 'name', label: 'Name', icon: 'nameTag' },
  { id: 'identity', label: 'Identity', icon: 'identity' },
  { id: 'description', label: 'Description', icon: 'chat' },
  { id: 'scale', label: 'Scale', icon: 'chart' },
  { id: 'dataTech', label: 'Data', icon: 'database' },
  { id: 'compliance', label: 'Compliance', icon: 'shield' },
  { id: 'review', label: 'Review', icon: 'clipboard' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

// Animation variants
const fadeInUp = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const chipBounce = {
  tap: { scale: 0.95 },
  hover: { scale: 1.02 },
}

// Section icons
function SectionIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    building: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    /** Price / name tag — company naming step */
    nameTag: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    identity: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    chat: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    chart: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    database: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    shield: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    clipboard: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    search: (
      <svg className={cn('size-5', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    check: (
      <svg className={cn('size-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  }
  return icons[type] || null
}

function chipClass(active: boolean) {
  return active
    ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-muted)] text-[color:var(--color-accent-foreground)]'
    : 'border-neutral-200/80 bg-[color:var(--color-elevated)] hover:border-neutral-300'
}

// Animated chip component
function AnimatedChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${chipClass(active)}`}
      variants={chipBounce}
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  )
}

// Animated checkbox wrapper
function AnimatedCheckbox({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <motion.label
      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50"
      whileHover={{ x: 2 }}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <span>{children}</span>
    </motion.label>
  )
}

function OperatingStatesField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const toggle = (code: string) => {
    onChange(
      value.includes(code)
        ? value.filter((x) => x !== code)
        : sortStateCodes([...value, code]),
    )
  }
  const summary =
    value.length === 0
      ? 'Select states'
      : value.length <= 5
        ? sortStateCodes(value).join(', ')
        : `${value.length} states selected`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          id="co-states-trigger"
          type="button"
          className={cn(SELECT_FIELD_CLASS, 'items-center justify-between gap-2 text-left')}
        >
          <span className={cn('min-w-0 truncate', value.length === 0 && 'text-neutral-400')}>{summary}</span>
          <svg className="size-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,560px)] w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-neutral-200/60 px-6 py-4 text-left">
          <DialogTitle>Operating states</DialogTitle>
          <DialogDescription>Select every state where you operate. You can choose more than one.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(52vh,380px)] overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5" role="list">
            {US_STATE_CODES.map((code) => (
              <li key={code}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[color:var(--color-muted-surface)]">
                  <Checkbox
                    checked={value.includes(code)}
                    onCheckedChange={() => toggle(code)}
                  />
                  <span className="text-sm text-neutral-800">{code}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="border-t border-neutral-200/60 px-6 py-4 sm:justify-stretch">
          <Button type="button" variant="accent" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Section card wrapper with scroll reveal animation
function SectionCard({
  id,
  title,
  subtitle,
  icon,
  iconPosition = 'start',
  sectionRef,
  children,
}: {
  id: string
  title: string
  subtitle: string
  icon: string | null
  iconPosition?: 'start' | 'end'
  sectionRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
}) {
  const isInView = useInView(sectionRef, { once: true, margin: '-10%' })

  return (
    <motion.section
      ref={sectionRef as React.RefObject<HTMLElement>}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="min-h-[50vh] py-12 px-4 md:py-16"
    >
      <div className="max-w-2xl mx-auto">
        <div
          className={cn(
            'mb-6 flex items-center gap-3',
            iconPosition === 'end' && 'flex-row-reverse',
          )}
        >
          {icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-accent-muted)] text-[color:var(--color-accent)]">
              <SectionIcon type={icon} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-medium text-neutral-800">{title}</h2>
            <p className="text-neutral-500 text-sm">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </motion.section>
  )
}

// Vertical progress indicator for desktop
function VerticalProgressIndicator({
  sections,
  activeSection,
  completedSections,
  onSectionClick,
}: {
  sections: typeof SECTIONS
  activeSection: SectionId
  completedSections: Set<SectionId>
  onSectionClick: (id: SectionId) => void
}) {
  return (
    <div className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
      {sections.slice(1).map((section) => {
        const isActive = activeSection === section.id
        const isCompleted = completedSections.has(section.id)

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionClick(section.id)}
            className={cn(
              'flex items-center gap-2 rounded-full p-2 transition-all',
              isActive
                ? 'bg-[color:var(--color-accent)] text-white shadow-md'
                : isCompleted
                  ? 'bg-[color:var(--color-accent-muted)] text-[color:var(--color-accent)]'
                  : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
            )}
            title={section.label}
          >
            {isCompleted && !isActive ? (
              <SectionIcon type="check" className="size-4" />
            ) : section.icon ? (
              <SectionIcon type={section.icon} className="size-4" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

// Mobile progress bar
function MobileProgressBar({
  sections,
  activeSection,
  completedSections: _completedSections,
}: {
  sections: typeof SECTIONS
  activeSection: SectionId
  completedSections: Set<SectionId>
}) {
  const activeSectionData = sections.find((s) => s.id === activeSection)
  const activeIndex = sections.findIndex((s) => s.id === activeSection)
  const progress = ((activeIndex) / (sections.length - 1)) * 100

  if (activeSection === 'hero') return null

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-700">
          {activeSectionData?.label}
        </span>
        <span className="text-xs text-neutral-500">
          {activeIndex} of {sections.length - 1}
        </span>
      </div>
      <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[color:var(--color-accent)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}

export function SetupScreen() {
  const { company, setCompany, setActiveView, clearLastAnalyze } = useForseen()

  const [activeSection, setActiveSection] = React.useState<SectionId>('hero')
  const [completedSections, setCompletedSections] = React.useState<Set<SectionId>>(new Set())

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  // Section refs
  const sectionRefs = {
    hero: React.useRef<HTMLElement>(null),
    name: React.useRef<HTMLElement>(null),
    identity: React.useRef<HTMLElement>(null),
    description: React.useRef<HTMLElement>(null),
    scale: React.useRef<HTMLElement>(null),
    dataTech: React.useRef<HTMLElement>(null),
    compliance: React.useRef<HTMLElement>(null),
    review: React.useRef<HTMLElement>(null),
  }

  // Form state
  const [name, setName] = React.useState(() => nameForSetupField(company.name))
  const [legalStructure, setLegalStructure] = React.useState<LegalStructure>(company.legal_structure)
  const [industry, setIndustry] = React.useState(company.industry)
  const [description, setDescription] = React.useState(company.description)
  const [location, setLocation] = React.useState(company.location)
  const SIZE_STOPS = [1, 10, 25, 50, 100, 250, 500, 1000] as const
  const toSizeIndex = (val: number) => {
    const idx = SIZE_STOPS.indexOf(val as any)
    return idx >= 0 ? idx : 0
  }
  const [sizeIndex, setSizeIndex] = React.useState([toSizeIndex(company.size)])
  const [revenueRange, setRevenueRange] = React.useState<string | null>(company.revenue_range)
  const [operatingStates, setOperatingStates] = React.useState<string[]>(company.operating_states)
  const [handlesPii, setHandlesPii] = React.useState(company.handles_pii)
  const [handlesPhi, setHandlesPhi] = React.useState(company.handles_phi)
  const [handlesFinancial, setHandlesFinancial] = React.useState(company.handles_financial_data)
  const [usesAiMl, setUsesAiMl] = React.useState(company.uses_ai_ml)
  const [b2b, setB2b] = React.useState(company.b2b)
  const [customerCount, setCustomerCount] = React.useState(company.customer_count != null ? String(company.customer_count) : '')
  const [certifications, setCertifications] = React.useState<string[]>(company.certifications)
  const [hasLegalCounsel, setHasLegalCounsel] = React.useState(company.has_legal_counsel)
  const [hasComplianceTeam, setHasComplianceTeam] = React.useState(company.has_compliance_team)
  const [fundingStage, setFundingStage] = React.useState<string | null>(company.funding_stage)
  const [isPublic, setIsPublic] = React.useState(company.is_public)

  React.useEffect(() => {
    setName(nameForSetupField(company.name))
    setLegalStructure(company.legal_structure)
    setIndustry(company.industry)
    setDescription(company.description)
    setLocation(company.location)
    setSizeIndex([toSizeIndex(company.size)])
    setRevenueRange(company.revenue_range)
    setOperatingStates(company.operating_states)
    setHandlesPii(company.handles_pii)
    setHandlesPhi(company.handles_phi)
    setHandlesFinancial(company.handles_financial_data)
    setUsesAiMl(company.uses_ai_ml)
    setB2b(company.b2b)
    setCustomerCount(company.customer_count != null ? String(company.customer_count) : '')
    setCertifications(company.certifications)
    setHasLegalCounsel(company.has_legal_counsel)
    setHasComplianceTeam(company.has_compliance_team)
    setFundingStage(company.funding_stage)
    setIsPublic(company.is_public)
  }, [company])

  // Intersection observer to track active section
  React.useEffect(() => {
    const observers: IntersectionObserver[] = []

    Object.entries(sectionRefs).forEach(([id, ref]) => {
      if (!ref.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
              setActiveSection(id as SectionId)
            }
          })
        },
        { threshold: 0.3 }
      )

      observer.observe(ref.current)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  const scrollToSection = (sectionId: SectionId) => {
    sectionRefs[sectionId].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const markCompleteAndScroll = (currentSection: SectionId, nextSection: SectionId) => {
    setCompletedSections((prev) => new Set([...prev, currentSection]))
    setTimeout(() => scrollToSection(nextSection), 100)
  }

  const toggleCert = (c: string) => {
    setCertifications((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const buildCompany = (): Company => {
    const parsed = customerCount.trim() === '' ? null : Number.parseInt(customerCount, 10)
    return {
      name: name.trim(),
      legal_structure: legalStructure,
      industry,
      size: SIZE_STOPS[sizeIndex[0]],
      revenue_range: revenueRange,
      location: location.trim() || '—',
      operating_states: operatingStates,
      operating_countries: company.operating_countries ?? ['US'],
      description: description.trim(),
      handles_pii: handlesPii,
      handles_phi: handlesPhi,
      handles_financial_data: handlesFinancial,
      uses_ai_ml: usesAiMl,
      b2b,
      customer_count: parsed != null && !Number.isNaN(parsed) ? parsed : null,
      certifications,
      has_legal_counsel: hasLegalCounsel,
      has_compliance_team: hasComplianceTeam,
      funding_stage: fundingStage,
      is_public: isPublic,
    }
  }

  const saveProfile = () => {
    setCompany(buildCompany())
  }

  const handleCompleteSetup = () => {
    saveProfile()
    clearLastAnalyze()
    setActiveView('analysis')
  }


  return (
    <div className="relative h-full w-full">
      {/* Progress indicators */}
      <VerticalProgressIndicator
        sections={SECTIONS}
        activeSection={activeSection}
        completedSections={completedSections}
        onSectionClick={scrollToSection}
      />
      <MobileProgressBar
        sections={SECTIONS}
        activeSection={activeSection}
        completedSections={completedSections}
      />

      {/* Main scrollable container */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scroll-smooth lg:pt-0 pt-14"
      >
        {/* Hero Section */}
        <motion.section
          ref={sectionRefs.hero as React.RefObject<HTMLElement>}
          id="hero"
          className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="mb-8">
            <motion.div
              className="mx-auto mb-3 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            >
              <img
                src="/favicon.png"
                alt="Forseen"
                className="size-36 object-contain"
              />
            </motion.div>
            <motion.h1
              className="text-3xl font-light tracking-tight text-neutral-800 md:text-4xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
            >
              Welcome to Forseen
            </motion.h1>
            <motion.p
              className="mt-4 max-w-md text-base text-neutral-500 md:text-lg"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
            >
              Compliance intelligence, tailored to your business
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
          >
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={() => scrollToSection('name')}
              className="gap-2 px-8 py-6 text-base"
            >
              Get Started
              <IconArrowRight className="size-5" />
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { delay: 1.5 },
              y: { delay: 1.5, duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            <svg className="size-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </motion.div>
        </motion.section>

        {/* Name Section */}
        <SectionCard
          id="name"
          title="What's your company called?"
          subtitle="We'll personalize your experience"
          icon="nameTag"
          sectionRef={sectionRefs.name}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-6">
            <motion.div variants={fadeInUp}>
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company name"
                className="h-14 text-center text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    markCompleteAndScroll('name', 'identity')
                  }
                }}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('name', 'identity')}
                disabled={!name.trim()}
                className="w-full py-6"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Identity Section */}
        <SectionCard
          id="identity"
          title="Company identity"
          subtitle="Tell us about your business structure"
          icon="identity"
          sectionRef={sectionRefs.identity}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate">
            <div className="grid gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
              <motion.div variants={fadeInUp} className="space-y-2.5">
                <Label htmlFor="co-legal">Legal structure</Label>
                <select
                  id="co-legal"
                  className={IDENTITY_SELECT_CLASS}
                  value={legalStructure}
                  onChange={(e) => setLegalStructure(e.target.value as LegalStructure)}
                >
                  {LEGAL_STRUCTURES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </motion.div>
              <motion.div variants={fadeInUp} className="space-y-2.5 md:col-span-1">
                <Label htmlFor="co-ind">Industry</Label>
                <select
                  id="co-ind"
                  className={IDENTITY_SELECT_CLASS}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">Select an industry</option>
                  {INDUSTRY_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </motion.div>
              <motion.div variants={fadeInUp} className="space-y-2.5 md:col-span-2">
                <Label htmlFor="co-loc">Headquarters (city / state)</Label>
                <Input
                  id="co-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="transition-all focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:border-[color:var(--color-accent)]"
                />
              </motion.div>
            </div>
            <motion.div variants={fadeInUp} className="mt-6">
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('identity', 'description')}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Description Section */}
        <SectionCard
          id="description"
          title="Description"
          subtitle="What does your company do?"
          icon="chat"
          sectionRef={sectionRefs.description}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-4">
            <motion.div variants={fadeInUp} className="space-y-2">
              <Label htmlFor="co-desc">Describe your business</Label>
              <p className="text-sm text-neutral-500">
                A brief description helps us understand your compliance context better.
              </p>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Textarea
                id="co-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. We provide cloud-based software for managing patient scheduling and care coordination."
                rows={5}
                className="min-h-[140px] resize-none placeholder:text-neutral-400 transition-all focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:border-[color:var(--color-accent)]"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('description', 'scale')}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Scale Section */}
        <SectionCard
          id="scale"
          title="Scale & operations"
          subtitle="Help us understand your reach"
          icon="chart"
          sectionRef={sectionRefs.scale}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-6 md:space-y-8">
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="flex justify-between">
                <Label>Company size (employees)</Label>
                <span className="text-sm font-medium tabular-nums text-[color:var(--color-accent)]">{SIZE_STOPS[sizeIndex[0]].toLocaleString()}</span>
              </div>
              <Slider value={sizeIndex} onValueChange={setSizeIndex} min={0} max={SIZE_STOPS.length - 1} step={1} />
            </motion.div>
            <motion.div variants={fadeInUp} className="space-y-2.5">
              <Label htmlFor="co-rev">Revenue range</Label>
              <select
                id="co-rev"
                className={SELECT_FIELD_CLASS}
                value={revenueRange ?? ''}
                onChange={(e) => setRevenueRange(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">Prefer not to say</option>
                {REVENUE_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </motion.div>
            <motion.div variants={fadeInUp} className="space-y-2.5">
              <Label htmlFor="co-states-trigger">Operating states</Label>
              <OperatingStatesField value={operatingStates} onChange={setOperatingStates} />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('scale', 'dataTech')}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Data & Tech Section */}
        <SectionCard
          id="dataTech"
          title="Data & technology"
          subtitle="What kind of data do you handle?"
          icon="database"
          sectionRef={sectionRefs.dataTech}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-4 md:space-y-5">
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4">
              <p className="mb-4 text-sm font-medium text-neutral-700">What data do you handle?</p>
              <div className="space-y-1">
                <AnimatedCheckbox checked={handlesPii} onCheckedChange={setHandlesPii}>
                  Personal Identifiable Information (PII)
                </AnimatedCheckbox>
                <AnimatedCheckbox checked={handlesPhi} onCheckedChange={setHandlesPhi}>
                  Protected Health Information (PHI / HIPAA)
                </AnimatedCheckbox>
                <AnimatedCheckbox checked={handlesFinancial} onCheckedChange={setHandlesFinancial}>
                  Financial data
                </AnimatedCheckbox>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4">
              <p className="mb-4 text-sm font-medium text-neutral-700">Technology & business model</p>
              <div className="space-y-1">
                <AnimatedCheckbox checked={usesAiMl} onCheckedChange={setUsesAiMl}>
                  Uses AI / ML in product
                </AnimatedCheckbox>
                <AnimatedCheckbox checked={b2b} onCheckedChange={setB2b}>
                  B2B (sells to businesses)
                </AnimatedCheckbox>
              </div>
              {!b2b && (
                <p className="mt-2 ml-3 text-xs text-neutral-500">Unchecking implies a primarily B2C model.</p>
              )}
            </motion.div>
            <motion.div variants={fadeInUp} className="space-y-2">
              <Label htmlFor="co-cust">Customer count (optional)</Label>
              <Input
                id="co-cust"
                inputMode="numeric"
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value.replace(/\D/g, ''))}
                placeholder="Approximate active customers"
                className="transition-all focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:border-[color:var(--color-accent)]"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('dataTech', 'compliance')}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Compliance Section */}
        <SectionCard
          id="compliance"
          title="Compliance posture"
          subtitle="Your current compliance setup"
          icon="shield"
          sectionRef={sectionRefs.compliance}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-6 md:space-y-8">
            <motion.div variants={fadeInUp}>
              <p className="mb-3 text-sm font-medium text-neutral-700">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATION_OPTIONS.map((c) => (
                  <AnimatedChip
                    key={c}
                    active={certifications.includes(c)}
                    onClick={() => toggleCert(c)}
                  >
                    {c}
                  </AnimatedChip>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4">
              <p className="mb-4 text-sm font-medium text-neutral-700">Internal resources</p>
              <div className="space-y-1">
                <AnimatedCheckbox checked={hasLegalCounsel} onCheckedChange={setHasLegalCounsel}>
                  Has dedicated legal counsel
                </AnimatedCheckbox>
                <AnimatedCheckbox checked={hasComplianceTeam} onCheckedChange={setHasComplianceTeam}>
                  Has a compliance team / role
                </AnimatedCheckbox>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="space-y-2.5">
              <Label htmlFor="co-fund">Funding stage</Label>
              <select
                id="co-fund"
                className={SELECT_FIELD_CLASS}
                value={fundingStage ?? ''}
                onChange={(e) => setFundingStage(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">Prefer not to say</option>
                {FUNDING_STAGES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <AnimatedCheckbox checked={isPublic} onCheckedChange={setIsPublic}>
                Public company
              </AnimatedCheckbox>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={() => markCompleteAndScroll('compliance', 'review')}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Review Section */}
        <SectionCard
          id="review"
          title="Review your profile"
          subtitle="Make sure everything looks right"
          icon="clipboard"
          sectionRef={sectionRefs.review}
        >
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-4">
            {/* Company Overview */}
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon type="building" />
                <p className="text-sm font-medium text-neutral-700">Company Overview</p>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <p><span className="font-medium text-neutral-800">{name || '—'}</span> · {legalStructure}</p>
                <p>{industry || 'No industry specified'}</p>
                <p>{location || 'No location specified'}</p>
                {description.trim() && (
                  <p className="mt-3 text-neutral-700 italic">"{description.trim()}"</p>
                )}
              </div>
            </motion.div>

            {/* Scale & Operations */}
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon type="chart" />
                <p className="text-sm font-medium text-neutral-700">Scale & Operations</p>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <p>~{SIZE_STOPS[sizeIndex[0]].toLocaleString()} employees</p>
                {revenueRange && <p>Revenue: {revenueRange}</p>}
                <p>States: {operatingStates.join(', ') || '—'}</p>
              </div>
            </motion.div>

            {/* Data & Technology */}
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon type="database" />
                <p className="text-sm font-medium text-neutral-700">Data & Technology</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {handlesPii && <span className="rounded-lg bg-neutral-200/70 px-2 py-1">PII</span>}
                {handlesPhi && <span className="rounded-lg bg-neutral-200/70 px-2 py-1">PHI</span>}
                {handlesFinancial && <span className="rounded-lg bg-neutral-200/70 px-2 py-1">Financial</span>}
                {usesAiMl && <span className="rounded-lg bg-neutral-200/70 px-2 py-1">AI/ML</span>}
                <span className="rounded-lg bg-neutral-200/70 px-2 py-1">{b2b ? 'B2B' : 'B2C'}</span>
                {customerCount && <span className="rounded-lg bg-neutral-200/70 px-2 py-1">{customerCount} customers</span>}
              </div>
            </motion.div>

            {/* Compliance */}
            <motion.div variants={fadeInUp} className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon type="shield" />
                <p className="text-sm font-medium text-neutral-700">Compliance Posture</p>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <p>Certifications: {certifications.length ? certifications.join(', ') : 'None listed'}</p>
                <p>Legal counsel: {hasLegalCounsel ? 'Yes' : 'No'} · Compliance team: {hasComplianceTeam ? 'Yes' : 'No'}</p>
                {fundingStage && <p>Funding: {fundingStage}</p>}
                <p>Public company: {isPublic ? 'Yes' : 'No'}</p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Button
                type="button"
                variant="accent"
                onClick={handleCompleteSetup}
              >
                Complete Setup
              </Button>
            </motion.div>
          </motion.div>
        </SectionCard>

        {/* Spacer at end */}
        <div className="h-32" />
      </div>

    </div>
  )
}
