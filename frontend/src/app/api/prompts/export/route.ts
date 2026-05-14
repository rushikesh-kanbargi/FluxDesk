import { type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { handleRouteError } from '@/lib/server/errors'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId) => {
    try {
      const prompts = await prisma.prompt.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })

      const lines = [
        '# Prompt Library Export',
        `_Exported ${new Date().toLocaleDateString()} — ${prompts.length} prompts_`,
        '',
        '---',
        '',
      ]

      prompts.forEach((p) => {
        lines.push(`## ${p.title}`)
        if (p.tags.length) lines.push(`**Tags:** ${p.tags.join(', ')}`)
        if (p.targetAi) lines.push(`**AI:** ${p.targetAi}`)
        if (p.framework) lines.push(`**Framework:** ${p.framework}`)
        if (p.isStarred) lines.push('**★ Starred**')
        lines.push('', '```', p.body, '```', '', '---', '')
      })

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="prompts-${Date.now()}.md"`,
        },
      })
    } catch (err) {
      return handleRouteError(err)
    }
  })
}
