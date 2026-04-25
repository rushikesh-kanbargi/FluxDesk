'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Clock, Cpu } from 'lucide-react'
import { Button, Skeleton, EmptyState, Badge, ErrorAlert, cn } from '@/components/ui/index'
import { useToolHistory } from '@/hooks/useTools'
import { getErrorMessage } from '@/lib/errors'
import { formatDistanceToNow } from 'date-fns'

interface HistoryDrawerProps {
  toolId: string
  toolName: string
  open: boolean
  onClose: () => void
  onRestore: (output: string) => void
}

export function HistoryDrawer({ toolId, toolName, open, onClose, onRestore }: HistoryDrawerProps) {
  const { data: history, isLoading, isError, error, refetch } = useToolHistory(toolId)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-[360px] bg-[#111113] border-l border-[rgba(255,255,255,0.06)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <div>
                <h2 className="text-sm font-semibold text-ink">History</h2>
                <p className="text-xs text-ink-dim">{toolName}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                <X size={14} />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isError && (
                <ErrorAlert
                  title="Could not load tool history"
                  message={getErrorMessage(error, 'Request failed.')}
                  onRetry={() => void refetch()}
                />
              )}
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="space-y-2 p-4 rounded-xl border border-[rgba(255,255,255,0.06)]"
                  >
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-[70%]" />
                  </div>
                ))
              ) : !history?.length ? (
                <EmptyState
                  illustration="history"
                  title="No history yet"
                  description="Your tool runs will appear here"
                />
              ) : (
                history.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'group p-4 rounded-xl border border-[rgba(255,255,255,0.06)]',
                      'hover:border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.02)]',
                      'transition-colors duration-150 cursor-pointer',
                    )}
                    onClick={() => onRestore(item.output)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px]">
                          <Clock size={9} className="mr-1" />
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </Badge>
                        <Badge variant="default" className="text-[10px] capitalize">
                          <Cpu size={9} className="mr-1" />
                          {item.provider}
                        </Badge>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-dim hover:text-amber transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestore(item.output)
                        }}
                        title="Restore this output"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-3 leading-relaxed">
                      {item.output.slice(0, 200)}...
                    </p>
                    <div className="mt-2 text-[10px] text-ink-dim">
                      {(item.durationMs / 1000).toFixed(1)}s
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
