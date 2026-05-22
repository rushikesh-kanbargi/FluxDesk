import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { getToolById } from '@/lib/server/toolDefinitions'

/** Public endpoint — no auth required.
 *  Returns pipeline name, description, and ordered steps with tool names.
 *  Returns 404 for both missing and revoked tokens — no info leakage. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const pipeline = await prisma.pipeline.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      steps: {
        select: { toolId: true, order: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  const steps = pipeline.steps.map((s) => {
    const tool = getToolById(s.toolId)
    return {
      toolId: s.toolId,
      toolName: tool?.name ?? s.toolId,
      order: s.order,
    }
  })

  return NextResponse.json({
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description ?? null,
    stepCount: steps.length,
    steps,
    createdAt: pipeline.createdAt,
  })
}
