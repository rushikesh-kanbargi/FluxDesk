import { ToolPage } from '@/components/tools/ToolPage'

interface Props {
  params: Promise<{ toolId: string }>
}

export default async function ToolRoute({ params }: Props) {
  const { toolId } = await params
  return <ToolPage toolId={toolId} />
}
