import * as React from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { IconSend } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

export function RagChatScreen() {
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const listRef = React.useRef<HTMLDivElement>(null)

  const send = () => {
    const text = input.trim()
    if (!text) {
      toast.message('Type a message to send')
      return
    }
    setMessages((m) => [...m, { role: 'user', text }, { role: 'assistant', text: 'Demo mode — connect a RAG backend to answer from your data.' }])
    setInput('')
    toast.success('Message sent (demo)')
  }

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-15rem)] w-full max-w-3xl flex-col justify-center px-2 pb-10 md:min-h-[calc(100dvh-11rem)] md:pb-12">
      <div className="flex flex-col gap-8 md:gap-10">
        <div className="text-center">
          <h1 className="text-3xl font-light tracking-tight text-neutral-800 md:text-4xl">Ask a question about your knowledge base.</h1>
        </div>

        {messages.length > 0 && (
          <div
            ref={listRef}
            className="max-h-80 w-full space-y-7 overflow-y-auto rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] p-5 text-sm leading-relaxed shadow-sm md:max-h-96 md:p-6"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl px-4 py-3',
                  msg.role === 'user'
                    ? 'ml-6 bg-[color:var(--color-accent-muted)] text-neutral-900 md:ml-10'
                    : 'mr-6 bg-neutral-100 text-neutral-800 md:mr-10',
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 w-full rounded-3xl border border-neutral-200 bg-[color:var(--color-elevated)] p-1 shadow-md md:mt-16">        
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Forseen…"
          rows={5}
          className="min-h-[120px] resize-none border-0 bg-transparent px-4 py-2 text-[15px] shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-3 py-3">
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0 rounded-xl bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-hover)]"
            aria-label="Send message"
            onClick={send}
          >
            <IconSend className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
