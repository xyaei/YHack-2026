import * as React from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { buildCompanyContext, postChat, type ApiChatMessage } from '@/lib/api'
import { loadRagMessages, saveRagMessages, type RagMessage } from '@/lib/persisted-session'
import { useForseen } from '@/store/forseen-context'

const URL_RE = /(https?:\/\/[^\s<>)"']+)/g

/** Extract all unique URLs from text */
function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE)
  if (!matches) return []
  return [...new Set(matches)]
}

/** Strip URLs from text, cleaning up leftover whitespace */
function stripUrls(text: string): string {
  return text.replace(URL_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/** Try to get a readable hostname label from a URL */
function urlLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const host = hostname.replace(/^www\./, '')
    // Show first meaningful path segment if it exists
    const seg = pathname.split('/').filter(Boolean)[0]
    return seg ? `${host}/${seg}` : host
  } catch {
    return url
  }
}

function SourceCard({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-0 items-center gap-2 rounded-lg border border-neutral-200/80 bg-white/60 px-3 py-2 transition-all hover:border-[color:var(--color-accent)]/30 hover:bg-white hover:shadow-sm"
    >
      <img
        src={`https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-sm"
        draggable={false}
      />
      <span className="min-w-0 truncate text-xs text-neutral-600 group-hover:text-[color:var(--color-accent)]">
        {urlLabel(url)}
      </span>
      <svg className="size-3 shrink-0 text-neutral-400 group-hover:text-[color:var(--color-accent)]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.5 1.5h7m0 0v7m0-7L2 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

/** Renders message text. For assistant messages, extracts links into source cards. */
function MessageContent({ text, role }: { text: string; role: string }) {
  const urls = role === 'assistant' ? extractUrls(text) : []
  const body = urls.length > 0 ? stripUrls(text) : text

  // For user messages or messages with no URLs, render inline with clickable links
  if (role === 'user' || urls.length === 0) {
    const parts = text.split(URL_RE)
    return (
      <>
        {parts.map((part, i) =>
          URL_RE.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[color:var(--color-accent)] underline decoration-[color:var(--color-accent)]/40 underline-offset-2 transition-colors hover:decoration-[color:var(--color-accent)]"
            >
              {part}
            </a>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          ),
        )}
      </>
    )
  }

  return (
    <>
      <span className="whitespace-pre-wrap">{body}</span>
      <div className="mt-3 border-t border-neutral-200/60 pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M6 3.5v3l2 1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sources
        </p>
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <SourceCard key={url} url={url} />
          ))}
        </div>
      </div>
    </>
  )
}

export function RagChatScreen() {
  const { company, lastAnalyze } = useForseen()
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState<RagMessage[]>(() => loadRagMessages())
  const [sending, setSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    saveRagMessages(messages)
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text) {
      toast.message('Type a message to send')
      return
    }
    const userMsg: RagMessage = { role: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    const history: ApiChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.text,
    }))

    const signals = lastAnalyze?.signals ?? undefined
    const predictions = lastAnalyze?.predictions?.length
      ? (lastAnalyze.predictions as unknown as Record<string, unknown>[])
      : undefined
    const company_context = buildCompanyContext(company)

    try {
      const { reply } = await postChat({
        message: text,
        history,
        signals,
        predictions,
        company_context,
      })
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      toast.error(msg)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: `Could not reach the chat service. ${msg} — check that the API is running (e.g. backend on port 8000).`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sending])

  return (
    <div className="flex min-h-full w-full flex-col md:h-full">
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto px-5 py-8 md:px-8">
        {/* Header */}
        <div
          className={cn(
            'mx-auto w-full max-w-[min(48rem,100%)] text-center',
            messages.length === 0 && !sending ? 'my-auto pb-4' : 'mb-8',
          )}
        >
          <h1 className="text-2xl font-light tracking-tight text-neutral-800 md:text-3xl">
            Ask a question about your knowledge base.
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {lastAnalyze
              ? 'Using signals and predictions from your last regulatory analysis.'
              : 'Run "Regulatory analysis" from Setup to ground answers on retrieved signals; otherwise the backend still searches live data.'}
          </p>
        </div>

        {/* Messages */}
        {(messages.length > 0 || sending) && (
          <div className="mx-auto w-full max-w-[min(48rem,100%)] space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'overflow-hidden break-words rounded-xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'ml-6 bg-[color:var(--color-accent-muted)] text-neutral-900 md:ml-10'
                    : 'mr-6 bg-neutral-100/80 text-neutral-800 md:mr-10',
                )}
              >
                <MessageContent text={msg.text} role={msg.role} />
              </div>
            ))}

            {/* Thinking indicator */}
            {sending && (
              <div className="mr-6 rounded-xl bg-neutral-100/80 px-4 py-3 md:mr-10">
                <span
                  className="text-sm font-light italic"
                  style={{
                    background: 'linear-gradient(90deg, #a3a3a3 0%, #525252 40%, #a3a3a3 60%, #a3a3a3 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 2s ease-in-out infinite',
                  }}
                >
                  Forseen is thinking…
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — sticks to bottom */}
      <div className="shrink-0 border-t border-neutral-200/50 bg-[color:var(--color-page)] px-5 py-3 md:px-8">
        <div className="mx-auto max-w-[min(48rem,100%)] rounded-3xl border border-neutral-200/60 bg-[color:var(--color-page)] p-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Forseen…"
            rows={1}
            disabled={sending}
            className="min-h-[40px] resize-none border-0 bg-transparent px-4 py-2 text-[15px] shadow-none focus-visible:ring-0 disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-neutral-400">
              <img src="/logo-hermes.png" alt="" width={14} height={14} className="size-3.5 rounded-sm object-contain" draggable={false} />
              <span className="font-light">NousResearch/Hermes</span>
            </div>
            <button
              type="button"
              disabled={sending}
              className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              aria-label="Send message"
              onClick={() => void send()}
            >
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.573a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-3.961V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
