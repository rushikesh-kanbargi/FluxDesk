import { NextResponse } from 'next/server'
import { TOOLS } from '@/lib/server/toolDefinitions'

export async function GET() {
  return NextResponse.json(
    Object.values(TOOLS).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }))
  )
}
