'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Brain, User, Trash2, HelpCircle, ExternalLink, MessageSquare, Bug } from 'lucide-react'
import {
  Button, Input, Card, Badge, Skeleton, ErrorAlert,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Dialog, DialogContent, ProgressBar, cn,
} from '@/components/ui'
import { getErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { useMemory, useUpdateMemory, useClearMemory } from '@/hooks/useMemory'
import { useApiKeys, useSaveApiKey, useDeleteApiKey, useVerifyApiKey } from '@/hooks/useApiKeys'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { AI_PROVIDERS } from '@/types'
import toast from 'react-hot-toast'

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  claude:  'Anthropic Claude — Best for reasoning and code',
  openai:  'OpenAI GPT-4o — Best for general tasks',
  gemini:  'Google Gemini — Best for multimodal tasks',
  groq:    'Groq Llama — Ultra-fast inference',
}

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-ink">Settings</h1>
          <p className="text-xs text-ink-dim mt-0.5">Configure your FluxDesk workspace</p>
        </div>

        <Tabs defaultValue="keys">
          <TabsList className="mb-5">
            <TabsTrigger value="keys"><Key size={12} />API Keys</TabsTrigger>
            <TabsTrigger value="memory"><Brain size={12} />Memory</TabsTrigger>
            <TabsTrigger value="profile"><User size={12} />Profile</TabsTrigger>
            <TabsTrigger value="support"><HelpCircle size={12} />Support</TabsTrigger>
          </TabsList>

          <TabsContent value="keys"><ApiKeysTab /></TabsContent>
          <TabsContent value="memory"><MemoryTab /></TabsContent>
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="support"><SupportTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ── API Keys Tab ───────────────────────────────────────────────
function ApiKeysTab() {
  const { data: keys, isError: keysLoadError, error: keysError, refetch: refetchKeys } = useApiKeys()
  const saveKey = useSaveApiKey()
  const deleteKey = useDeleteApiKey()
  const verifyKey = useVerifyApiKey()
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [testingFor, setTestingFor] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, string>>({})
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ key: string }>()
  const { register: registerTest, handleSubmit: handleTestSubmit, reset: resetTest, formState: { errors: testErrors } } = useForm<{ key: string }>()

  const handleTest = handleTestSubmit(async ({ key }) => {
    if (!testingFor) return
    const start = Date.now()
    const result = await verifyKey.mutateAsync({ provider: testingFor, key })
    const ms = Date.now() - start
    if (result.valid) {
      setTestResults((prev) => ({ ...prev, [testingFor]: `Connected · ${ms}ms` }))
      toast.success(`Key verified in ${ms}ms`)
    } else {
      setTestResults((prev) => ({ ...prev, [testingFor]: 'Invalid key' }))
      toast.error('API key is invalid — check it in Settings')
    }
    setTestingFor(null)
    resetTest()
  })

  const handleSave = handleSubmit(async ({ key }) => {
    if (!addingFor) return
    await saveKey.mutateAsync({ provider: addingFor, key })
    setAddingFor(null)
    reset()
  })

  return (
    <div className="space-y-3">
      {keysLoadError && (
        <ErrorAlert
          title="Could not load API keys"
          message={getErrorMessage(keysError, 'Request failed.')}
          onRetry={() => void refetchKeys()}
        />
      )}
      {Object.entries(AI_PROVIDERS).map(([provider, info]) => {
        const savedKey = keys?.find((k) => k.provider === provider)
        const isConnected = !!savedKey

        return (
          <motion.div
            key={provider}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Provider dot */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: info.color,
                        boxShadow: isConnected ? `0 0 6px ${info.color}60` : 'none',
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{info.label}</span>
                      {isConnected ? (
                        <Badge variant="emerald" dot className="text-[10px]">Connected</Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">Not configured</Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-dim mt-0.5">{PROVIDER_DESCRIPTIONS[provider]}</p>
                    {savedKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs text-ink-dim font-mono">
                          ••••••••{savedKey.hint}
                        </code>
                        {testResults[provider] && (
                          <span className={cn(
                            'text-[10px] font-medium',
                            testResults[provider].includes('Invalid') ? 'text-rose-400' : 'text-emerald-400',
                          )}>
                            {testResults[provider]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTestingFor(provider)}
                    >
                      Test
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddingFor(provider)}
                  >
                    {isConnected ? 'Update' : 'Add'}
                  </Button>
                  {isConnected && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteKey.mutate(provider)}
                      loading={deleteKey.isPending}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}

      {/* Add Key Dialog */}
      <Dialog open={!!addingFor} onOpenChange={(open) => { if (!open) { setAddingFor(null); reset() } }}>
        <DialogContent
          title={`${addingFor ? AI_PROVIDERS[addingFor as keyof typeof AI_PROVIDERS]?.label : ''} API Key`}
          description="Your key is encrypted and stored securely. Never shared."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="API Key"
              type="password"
              placeholder="sk-..."
              required
              autoFocus
              {...register('key', { required: 'API key is required' })}
              error={errors.key?.message}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => { setAddingFor(null); reset() }}>Cancel</Button>
              <Button variant="primary" type="submit" loading={saveKey.isPending}>Save Key</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Key Dialog */}
      <Dialog open={!!testingFor} onOpenChange={(open) => { if (!open) { setTestingFor(null); resetTest() } }}>
        <DialogContent
          title={`Test ${testingFor ? AI_PROVIDERS[testingFor as keyof typeof AI_PROVIDERS]?.label : ''} Connection`}
          description="Enter your key to verify it's valid and measure latency."
        >
          <form onSubmit={handleTest} className="space-y-4">
            <Input
              label="API Key"
              type="password"
              placeholder="sk-..."
              required
              autoFocus
              {...registerTest('key', { required: 'API key is required' })}
              error={testErrors.key?.message}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => { setTestingFor(null); resetTest() }}>Cancel</Button>
              <Button variant="primary" type="submit" loading={verifyKey.isPending}>Test Connection</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Memory Tab ─────────────────────────────────────────────────
function MemoryTab() {
  const { data: memory, isLoading, isError, error, refetch } = useMemory()
  const updateMemory = useUpdateMemory()
  const clearMemory = useClearMemory()
  const [confirmClear, setConfirmClear] = useState(false)

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      inferredRole: memory?.inferredRole || '',
      inferredDomain: memory?.inferredDomain || '',
      writingStyle: memory?.writingStyle || '',
      outputLength: memory?.outputLength || '',
    },
  })

  const topFrameworks = Object.entries(memory?.frameworkAffinities || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6) as [string, number][]
  const maxScore = topFrameworks[0]?.[1] || 1

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorAlert
        title="Could not load memory"
        message={getErrorMessage(error, 'Request failed.')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Framework affinities */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-ink mb-4">Framework Preferences</h3>
        {topFrameworks.length > 0 ? (
          <div className="space-y-3">
            {topFrameworks.map(([fw, score]) => (
              <div key={fw}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink-muted">{fw}</span>
                  <span className="text-[10px] text-ink-dim">{Math.round((score / maxScore) * 100)}%</span>
                </div>
                <ProgressBar value={(score / maxScore) * 100} color="#F5A623" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-dim">Use tools to build up your framework preferences</p>
        )}
      </Card>

      {/* Tech stack */}
      {memory?.inferredStack && memory.inferredStack.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-ink mb-3">Inferred Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {memory.inferredStack.map((tech: string) => (
              <Badge key={tech} variant="default">{tech}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Context preferences */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-ink mb-4">Your Context</h3>
        <form onSubmit={handleSubmit((v) => updateMemory.mutate(v))} className="space-y-4">
          <Input
            label="Role"
            placeholder="e.g. Senior Frontend Engineer"
            {...register('inferredRole')}
          />
          <Input
            label="Domain"
            placeholder="e.g. B2B SaaS, Fintech, Healthcare"
            {...register('inferredDomain')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Writing style"
              placeholder="e.g. concise, detailed"
              {...register('writingStyle')}
            />
            <Input
              label="Output length"
              placeholder="e.g. short, medium, long"
              {...register('outputLength')}
            />
          </div>
          {isDirty && (
            <Button type="submit" variant="primary" size="sm" loading={updateMemory.isPending}>
              Save preferences
            </Button>
          )}
        </form>
      </Card>

      {/* Memory notes */}
      {memory?.notes && memory.notes.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-ink mb-3">Memory Notes</h3>
          <div className="space-y-2">
            {memory.notes.map((note: string, i: number) => (
              <p key={i} className="text-xs text-ink-muted leading-relaxed p-2 bg-[#18181b] rounded-lg border border-[rgba(255,255,255,0.06)]">
                {note}
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <Card padding="md" className="border-[rgba(244,63,94,0.15)]">
        <h3 className="text-sm font-semibold text-rose mb-2">Danger Zone</h3>
        <p className="text-xs text-ink-dim mb-3">Clear all learned preferences and memory. This cannot be undone.</p>
        <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
          Clear All Memory
        </Button>
      </Card>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent
          title="Clear memory?"
          description="All your learned preferences, framework affinities, and tech stack will be permanently deleted."
        >
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={clearMemory.isPending}
              onClick={async () => {
                await clearMemory.mutateAsync()
                setConfirmClear(false)
              }}
            >
              Clear Memory
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Support Tab ────────────────────────────────────────────────
function SupportTab() {
  return (
    <div className="space-y-4">
      {/* Contact */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-ink mb-1">Get in touch</h3>
        <p className="text-xs text-ink-dim mb-4">Our team is here to help. Expect a response within 24 hours.</p>
        <div className="space-y-2">
          <a
            href="mailto:support@fluxdesk.app"
            className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(245,166,35,0.2)] hover:bg-[rgba(245,166,35,0.04)] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={14} className="text-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink">Email support</p>
              <p className="text-[11px] text-ink-dim">support@fluxdesk.app</p>
            </div>
            <ExternalLink size={12} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>

          <a
            href="https://github.com/fluxdesk/fluxdesk/issues/new?template=bug_report.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(245,166,35,0.2)] hover:bg-[rgba(245,166,35,0.04)] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center flex-shrink-0">
              <Bug size={14} className="text-ink-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink">Report a bug</p>
              <p className="text-[11px] text-ink-dim">Open a GitHub issue</p>
            </div>
            <ExternalLink size={12} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </Card>

      {/* Legal links */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-ink mb-3">Legal</h3>
        <div className="flex gap-3">
          <Link href="/privacy" className="text-xs text-ink-dim hover:text-amber transition-colors underline underline-offset-2">
            Privacy Policy
          </Link>
          <span className="text-ink-dim text-xs">·</span>
          <Link href="/terms" className="text-xs text-ink-dim hover:text-amber transition-colors underline underline-offset-2">
            Terms of Service
          </Link>
        </div>
        <p className="text-[11px] text-ink-dim mt-3">FluxDesk v1.0.0 · © 2026 FluxDesk. All rights reserved.</p>
      </Card>
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────
function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="space-y-4">
      <Card padding="md">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center text-lg font-semibold text-amber">
            {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{user?.user_metadata?.name || user?.email?.split('@')[0]}</p>
            <p className="text-xs text-ink-dim">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-t border-[rgba(255,255,255,0.06)]">
            <span className="text-xs text-ink-dim">Name</span>
            <span className="text-xs text-ink-muted">{user?.user_metadata?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[rgba(255,255,255,0.06)]">
            <span className="text-xs text-ink-dim">Email</span>
            <span className="text-xs text-ink-muted">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[rgba(255,255,255,0.06)]">
            <span className="text-xs text-ink-dim">Role</span>
            <Badge variant="default" className="text-[10px]">
              {user?.role ?? 'USER'}
            </Badge>
          </div>
        </div>
      </Card>

      <Button variant="danger" size="md" onClick={() => signOut()} className="w-full">
        Sign out
      </Button>
    </div>
  )
}
