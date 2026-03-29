import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useForseen } from '@/store/forseen-context'
import { IconArrowRight } from '@/components/icons'
import { Card, CardContent } from '@/components/ui/card'
import {
  CERTIFICATION_OPTIONS,
  FUNDING_STAGES,
  INDUSTRY_OPTIONS,
  LEGAL_STRUCTURES,
  REVENUE_RANGES,
  type Company,
  type LegalStructure,
} from '@/data/mocks'

const allStates = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL']
const countryOptions = ['US', 'CA', 'UK', 'EU']

const FORM_STEPS = 5

function chipClass(active: boolean) {
  return active
    ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-muted)] text-[color:var(--color-accent-foreground)]'
    : 'border-neutral-200/80 bg-[color:var(--color-elevated)]'
}

export function SetupScreen() {
  const { company, setCompany, setActiveView } = useForseen()
  const [step, setStep] = React.useState(1)

  const [name, setName] = React.useState(company.name)
  const [legalStructure, setLegalStructure] = React.useState<LegalStructure>(company.legal_structure)
  const [industry, setIndustry] = React.useState(company.industry)
  const [description, setDescription] = React.useState(company.description)
  const [location, setLocation] = React.useState(company.location)
  const [size, setSize] = React.useState([company.size])
  const [revenueRange, setRevenueRange] = React.useState<string | null>(company.revenue_range)
  const [operatingStates, setOperatingStates] = React.useState<string[]>(company.operating_states)
  const [operatingCountries, setOperatingCountries] = React.useState<string[]>(
    company.operating_countries.length ? company.operating_countries : ['US'],
  )
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
    setName(company.name)
    setLegalStructure(company.legal_structure)
    setIndustry(company.industry)
    setDescription(company.description)
    setLocation(company.location)
    setSize([company.size])
    setRevenueRange(company.revenue_range)
    setOperatingStates(company.operating_states)
    setOperatingCountries(company.operating_countries.length ? company.operating_countries : ['US'])
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

  const toggleState = (s: string) => {
    setOperatingStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const toggleCountry = (c: string) => {
    setOperatingCountries((prev) => {
      if (prev.includes(c)) {
        const next = prev.filter((x) => x !== c)
        return next.length ? next : ['US']
      }
      return [...prev, c]
    })
  }

  const toggleCert = (c: string) => {
    setCertifications((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const buildCompany = (): Company => {
    const parsed = customerCount.trim() === '' ? null : Number.parseInt(customerCount, 10)
    return {
      name: name.trim() || 'Untitled company',
      legal_structure: legalStructure,
      industry,
      size: size[0],
      revenue_range: revenueRange,
      location: location.trim() || '—',
      operating_states: operatingStates.length ? operatingStates : ['CA'],
      operating_countries: operatingCountries.length ? operatingCountries : ['US'],
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
    toast.success('Profile saved — demo banner updated')
  }

  const goToDashboard = () => setActiveView('dashboard')
  const goToRag = () => setActiveView('rag')

  const subtitle = step <= FORM_STEPS ? `Step ${step} of ${FORM_STEPS}` : ''

  const displayName = name.trim() || 'Your company'

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-0 py-3 md:py-6">
      <div
        className={cn(
          'shrink-0 text-center md:text-left',
          step === 6 ? 'mb-5 md:mb-6' : 'mb-6 md:mb-8',
        )}
      >
        <h1 className="text-2xl font-light tracking-tight text-neutral-800 md:text-3xl">
          {step === 6 ? 'You’re in' : 'Business profile setup'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500 md:mt-3 md:text-base">
          {step === 6 ? (
            <>
              <span className="text-neutral-700">{displayName}</span>
              {industry.trim() ? (
                <>
                  {' '}
                  · <span className="text-neutral-700">{industry.trim()}</span>
                </>
              ) : null}
              <span className="block pt-1 text-neutral-500">
                Risk views and answers will reflect this profile. Choose where to explore first—you can switch anytime.
              </span>
            </>
          ) : (
            subtitle
          )}
        </p>
      </div>

      {step <= FORM_STEPS && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
                <div className="space-y-2.5 md:col-span-1">
                  <Label htmlFor="co-name">Company name</Label>
                  <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="co-legal">Legal structure</Label>
                  <select
                    id="co-legal"
                    className="flex h-11 w-full rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
                    value={legalStructure}
                    onChange={(e) => setLegalStructure(e.target.value as LegalStructure)}
                  >
                    {LEGAL_STRUCTURES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label htmlFor="co-ind">Industry</Label>
                  <Input
                    id="co-ind"
                    list="industry-suggestions"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare SaaS, FinTech"
                  />
                  <datalist id="industry-suggestions">
                    {INDUSTRY_OPTIONS.map((i) => (
                      <option key={i} value={i} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label htmlFor="co-loc">Headquarters (city / state)</Label>
                  <Input
                    id="co-loc"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="co-desc">What does your company do?</Label>
                  <Textarea
                    id="co-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short plain-English description."
                    rows={2}
                    className="min-h-[72px] resize-none"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 md:space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Company size (employees)</Label>
                    <span className="text-sm tabular-nums text-neutral-600">{size[0]}</span>
                  </div>
                  <Slider value={size} onValueChange={setSize} min={1} max={500} step={1} />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="co-rev">Revenue range</Label>
                  <select
                    id="co-rev"
                    className="flex h-11 w-full rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
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
                </div>
                <div>
                  <p className="mb-3 text-sm font-light md:mb-4">Operating states</p>
                  <div className="flex flex-wrap gap-2">
                    {allStates.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleState(s)}
                        className={`rounded-xl border px-3 py-2 text-sm transition-colors ${chipClass(operatingStates.includes(s))}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-light md:mb-4">Operating countries</p>
                  <div className="flex flex-wrap gap-2">
                    {countryOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCountry(c)}
                        className={`rounded-xl border px-3 py-2 text-sm transition-colors ${chipClass(operatingCountries.includes(c))}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 md:space-y-5">
                <p className="text-sm font-light text-neutral-600">Data &amp; technology</p>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={handlesPii} onCheckedChange={(v) => setHandlesPii(v === true)} />
                  Handles PII
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={handlesPhi} onCheckedChange={(v) => setHandlesPhi(v === true)} />
                  Handles PHI (HIPAA-covered health data)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={handlesFinancial} onCheckedChange={(v) => setHandlesFinancial(v === true)} />
                  Handles financial data
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={usesAiMl} onCheckedChange={(v) => setUsesAiMl(v === true)} />
                  Uses AI / ML in product
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={b2b} onCheckedChange={(v) => setB2b(v === true)} />
                  B2B (sells to businesses)
                </label>
                {!b2b && (
                  <p className="text-xs text-neutral-500">Unchecking implies a primarily B2C model.</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="co-cust">Customer count (optional)</Label>
                  <Input
                    id="co-cust"
                    inputMode="numeric"
                    value={customerCount}
                    onChange={(e) => setCustomerCount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Approximate active customers"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 md:space-y-6">
                <div>
                  <p className="mb-3 text-sm font-light">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATION_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCert(c)}
                        className={`rounded-xl border px-3 py-2 text-sm transition-colors ${chipClass(certifications.includes(c))}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={hasLegalCounsel} onCheckedChange={(v) => setHasLegalCounsel(v === true)} />
                  Has dedicated legal counsel
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={hasComplianceTeam} onCheckedChange={(v) => setHasComplianceTeam(v === true)} />
                  Has a compliance team / role
                </label>
                <div className="space-y-2.5">
                  <Label htmlFor="co-fund">Funding stage</Label>
                  <select
                    id="co-fund"
                    className="flex h-11 w-full rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
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
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isPublic} onCheckedChange={(v) => setIsPublic(v === true)} />
                  Public company
                </label>
              </div>
            )}

            {step === 5 && (
              <div className="rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 text-sm md:p-6">
                <p className="font-light text-neutral-800">Review</p>
                <p className="mt-3 text-neutral-600">
                  {name || '—'} · {legalStructure} · {industry}
                </p>
                <p className="mt-2 text-neutral-600">{location || '—'} · ~{size[0]} employees</p>
                {revenueRange && <p className="mt-1 text-neutral-600">Revenue: {revenueRange}</p>}
                <p className="mt-2 text-neutral-600">States: {operatingStates.join(', ') || '—'}</p>
                <p className="mt-1 text-neutral-600">Countries: {operatingCountries.join(', ')}</p>
                {description.trim() && <p className="mt-3 text-neutral-700">{description.trim()}</p>}
                <p className="mt-3 text-neutral-600">
                  Data: PII {handlesPii ? 'Yes' : 'No'} · PHI {handlesPhi ? 'Yes' : 'No'} · Financial{' '}
                  {handlesFinancial ? 'Yes' : 'No'} · AI/ML {usesAiMl ? 'Yes' : 'No'} · {b2b ? 'B2B' : 'B2C'}
                </p>
                <p className="mt-2 text-neutral-600">
                  Compliance: {certifications.length ? certifications.join(', ') : 'None listed'} · Counsel{' '}
                  {hasLegalCounsel ? 'Yes' : 'No'} · Team {hasComplianceTeam ? 'Yes' : 'No'}
                </p>
                {fundingStage && <p className="mt-1 text-neutral-600">Funding: {fundingStage}</p>}
                <p className="mt-1 text-neutral-600">Public: {isPublic ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-transparent pt-2 sm:flex-row sm:items-center sm:justify-between md:mt-6">
            <div className="flex gap-2">
              {step > 1 && (
                <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < FORM_STEPS ? (
                <Button type="button" variant="accent" onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    saveProfile()
                    setStep(6)
                  }}
                >
                  Save &amp; continue
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 md:space-y-5">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-neutral-400 md:text-left">
              Start here
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={goToDashboard}
                className="group text-left transition-[transform,box-shadow] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25"
              >
                <Card className="h-full border-neutral-200/80 bg-[color:var(--color-elevated)] shadow-sm transition-shadow group-hover:border-neutral-300/90 group-hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 pt-6 md:p-6">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100/40">
                      <img
                        src="/forseen-dashboard-preview.png"
                        alt=""
                        width={1280}
                        height={800}
                        className="aspect-[16/10] w-full object-cover object-top"
                        draggable={false}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-light text-neutral-900">Dashboard</p>
                        <p className="mt-1 text-sm text-neutral-500">Forecasts, timelines, and your company at a glance.</p>
                      </div>
                      <IconArrowRight
                        className="mt-0.5 size-5 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600"
                        aria-hidden
                      />
                    </div>
                  </CardContent>
                </Card>
              </button>

              <button
                type="button"
                onClick={goToRag}
                className="group text-left transition-[transform,box-shadow] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25"
              >
                <Card className="h-full border-neutral-200/80 bg-[color:var(--color-elevated)] shadow-sm transition-shadow group-hover:border-neutral-300/90 group-hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 pt-6 md:p-6">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100/40">
                      <img
                        src="/forseen-demo-preview.png"
                        alt=""
                        width={1280}
                        height={800}
                        className="aspect-[16/10] w-full object-cover object-top"
                        draggable={false}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-light text-neutral-900">Compliance chat</p>
                        <p className="mt-1 text-sm text-neutral-500">Ask how obligations apply to your situation.</p>
                      </div>
                      <IconArrowRight
                        className="mt-0.5 size-5 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600"
                        aria-hidden
                      />
                    </div>
                  </CardContent>
                </Card>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
