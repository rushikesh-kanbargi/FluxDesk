import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/server/prisma'
import { getToolById } from '@/lib/server/toolDefinitions'
import { ArrowRight, Workflow, ChevronRight } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fluxdesk.app'

// ── data fetching ──────────────────────────────────────────────────────────────

async function getPipelineByToken(token: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      description: true,
      steps: {
        select: { toolId: true, order: true },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!pipeline) return null

  const steps = pipeline.steps.map((s) => {
    const tool = getToolById(s.toolId)
    return {
      toolId: s.toolId,
      toolName: tool?.name ?? s.toolId,
      toolDescription: (tool as { description?: string } | undefined)?.description ?? null,
      order: s.order,
    }
  })

  return { ...pipeline, steps }
}

// ── dynamic metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const pipeline = await getPipelineByToken(token)

  if (!pipeline) {
    return {
      title: 'Pipeline not found',
      robots: { index: false, follow: false },
    }
  }

  const description =
    pipeline.description ||
    `A ${pipeline.steps.length}-step AI pipeline on FluxDesk. Sign up free to run it with your own API key.`

  const title = `${pipeline.name} — FluxDesk Pipeline`

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE}/share/${token}`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${BASE}/share/${token}`,
      siteName: 'FluxDesk',
      // og:image cascades from root opengraph-image.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

// ── page ───────────────────────────────────────────────────────────────────────

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const pipeline = await getPipelineByToken(token)

  if (!pipeline) notFound()

  return (
    <div className="min-h-dvh bg-[#09090b] text-[#fafaf9]">
      {/* Top bar */}
      <header className="border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.15)] border border-[rgba(245,166,35,0.3)] flex items-center justify-center flex-shrink-0">
            <Workflow size={14} className="text-amber-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#fafaf9] group-hover:text-amber-400 transition-colors">
            FluxDesk
          </span>
        </Link>

        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          Sign up to run this
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Pipeline identity */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.2)] text-xs text-amber-400 font-medium mb-4">
            <Workflow size={10} />
            FluxDesk Pipeline
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#fafaf9] leading-tight">
            {pipeline.name}
          </h1>
          {pipeline.description && (
            <p className="mt-3 text-base text-[rgba(255,255,255,0.5)] leading-relaxed">
              {pipeline.description}
            </p>
          )}
          <p className="mt-2 text-sm text-[rgba(255,255,255,0.3)]">
            {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Step list */}
        <div className="space-y-2">
          {pipeline.steps.map((step, index) => (
            <div
              key={step.toolId}
              className="flex items-start gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.2)] flex items-center justify-center text-xs font-semibold text-amber-400">
                {index + 1}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-[#fafaf9]">{step.toolName}</p>
                {step.toolDescription && (
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5 truncate">
                    {step.toolDescription}
                  </p>
                )}
              </div>

              {/* Connector arrow (not on last step) */}
              {index < pipeline.steps.length - 1 && (
                <ChevronRight size={14} className="flex-shrink-0 text-[rgba(255,255,255,0.2)] mt-0.5" />
              )}
            </div>
          ))}
        </div>

        {/* CTA card */}
        <div className="mt-12 rounded-xl border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.04)] px-6 py-6 text-center">
          <p className="text-base font-semibold text-[#fafaf9] mb-1">
            Want to run this pipeline?
          </p>
          <p className="text-sm text-[rgba(255,255,255,0.45)] mb-5">
            Sign up for FluxDesk and bring your own API key — Claude, GPT-4o, Gemini, or Groq.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            Create free account
            <ArrowRight size={14} />
          </Link>
          <p className="text-xs text-[rgba(255,255,255,0.25)] mt-3">
            No credit card required
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] py-6 px-6 text-center">
        <p className="text-xs text-[rgba(255,255,255,0.2)]">
          Built with{' '}
          <Link href="/" className="hover:text-[rgba(255,255,255,0.5)] transition-colors">
            FluxDesk
          </Link>
        </p>
      </footer>
    </div>
  )
}
