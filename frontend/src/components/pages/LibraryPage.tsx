'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, Tag, X, Trash2, Copy, ExternalLink } from 'lucide-react'
import {
  Button, Badge, Skeleton, EmptyState, ErrorAlert,
  cn,
} from '@/components/ui'
import { getErrorMessage } from '@/lib/errors'
import { usePrompts, useDeletePrompt, useToggleStar, usePromptTags, type Prompt } from '@/hooks/usePrompts'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [starredOnly, setStarredOnly] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)

  const {
    data,
    isLoading,
    isError: promptsError,
    error: promptsQueryError,
    refetch: refetchPrompts,
  } = usePrompts({ search, tag: selectedTag || undefined, starred: starredOnly || undefined })
  const {
    data: tags,
    isError: tagsError,
    error: tagsQueryError,
    refetch: refetchTags,
  } = usePromptTags()
  const deletePrompt = useDeletePrompt()
  const toggleStar = useToggleStar()

  const prompts = data?.prompts || []

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left sidebar */}
      <div className="w-[180px] flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-[#111113] p-3 space-y-1 overflow-y-auto hidden md:block">
        <p className="text-[10px] text-ink-dim uppercase tracking-widest font-medium px-2 py-1">Filter</p>

        <SidebarFilter
          label="All Prompts"
          active={!starredOnly && !selectedTag}
          count={data?.total}
          onClick={() => { setStarredOnly(false); setSelectedTag(null) }}
        />
        <SidebarFilter
          label="Starred"
          active={starredOnly}
          icon={<Star size={11} />}
          onClick={() => { setStarredOnly(!starredOnly); setSelectedTag(null) }}
        />

        {tags && tags.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] text-ink-dim uppercase tracking-widest font-medium px-2 py-1">Tags</p>
            {tags.map((tag) => (
              <SidebarFilter
                key={tag}
                label={tag}
                active={selectedTag === tag}
                icon={<Tag size={10} />}
                onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setStarredOnly(false) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className={cn(
                'w-full h-8 pl-8 pr-3 bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-md',
                'text-sm text-ink placeholder:text-ink-dim',
                'focus:outline-none focus:border-[rgba(245,166,35,0.4)]',
                'transition-colors duration-150',
              )}
            />
          </div>
          <span className="text-xs text-ink-dim hidden sm:block">{data?.total || 0} prompts</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {promptsError && (
            <ErrorAlert
              title="Could not load prompts"
              message={getErrorMessage(promptsQueryError, 'Request failed.')}
              onRetry={() => void refetchPrompts()}
            />
          )}
          {tagsError && (
            <ErrorAlert
              title="Could not load tags"
              message={getErrorMessage(tagsQueryError, 'Request failed.')}
              onRetry={() => void refetchTags()}
            />
          )}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[70%]" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !prompts.length ? (
            <EmptyState
              illustration="library"
              title="No prompts yet"
              description="Save outputs from any tool to build your prompt library"
              action={
                <Link href="/tools/forge">
                  <Button variant="amber" size="sm">Try PromptForge</Button>
                </Link>
              }
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
            >
              {prompts.map((prompt) => (
                <motion.div
                  key={prompt.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <PromptCard
                    prompt={prompt}
                    onSelect={() => setSelectedPrompt(prompt)}
                    onToggleStar={() => toggleStar.mutate(prompt.id)}
                    onDelete={() => deletePrompt.mutate(prompt.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Right drawer */}
      <AnimatePresence>
        {selectedPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black"
              onClick={() => setSelectedPrompt(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-40 w-[400px] bg-[#111113] border-l border-[rgba(255,255,255,0.06)] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
                <h2 className="text-sm font-semibold text-ink truncate max-w-[300px]">{selectedPrompt.title}</h2>
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Tags */}
                {selectedPrompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selectedPrompt.tags.map((tag) => (
                      <Badge key={tag} variant="default" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 mb-4 text-xs text-ink-dim">
                  {selectedPrompt.framework && (
                    <Badge variant="amber" className="text-xs">{selectedPrompt.framework}</Badge>
                  )}
                  {selectedPrompt.provider && (
                    <span className="capitalize">{selectedPrompt.provider}</span>
                  )}
                  <span>{formatDistanceToNow(new Date(selectedPrompt.createdAt), { addSuffix: true })}</span>
                </div>

                <pre className="whitespace-pre-wrap text-sm text-ink leading-relaxed font-sans bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 overflow-x-auto">
                  {selectedPrompt.body}
                </pre>
              </div>

              <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedPrompt.body)
                    toast.success('Copied!')
                  }}
                >
                  <Copy size={13} />
                  Copy
                </Button>
                {selectedPrompt.toolId && (
                  <Link href={`/tools/${selectedPrompt.toolId}`} className="flex-1">
                    <Button variant="amber" size="sm" className="w-full gap-2">
                      <ExternalLink size={13} />
                      Open Tool
                    </Button>
                  </Link>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deletePrompt.mutate(selectedPrompt.id)
                    setSelectedPrompt(null)
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarFilter({
  label,
  active,
  count,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  count?: number
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150',
        active
          ? 'bg-[rgba(245,166,35,0.10)] text-amber'
          : 'text-ink-muted hover:text-ink hover:bg-[rgba(255,255,255,0.04)]',
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-ink-dim">{count}</span>
      )}
    </button>
  )
}

function PromptCard({
  prompt,
  onSelect,
  onToggleStar,
  onDelete,
}: {
  prompt: Prompt
  onSelect: () => void
  onToggleStar: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111113]',
        'hover:border-[rgba(255,255,255,0.12)] hover:bg-[#18181b]',
        'transition-all duration-150 cursor-pointer',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-ink line-clamp-2 flex-1">{prompt.title}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar() }}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            prompt.starred ? 'text-amber' : 'text-ink-dim opacity-0 group-hover:opacity-100',
          )}
        >
          <Star size={12} fill={prompt.starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="text-xs text-ink-dim line-clamp-2 mb-3">{prompt.body.slice(0, 120)}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {prompt.framework && (
          <Badge variant="amber" className="text-[10px]">{prompt.framework}</Badge>
        )}
        {prompt.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
        ))}
        <span className="ml-auto text-[10px] text-ink-dim">
          {formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
