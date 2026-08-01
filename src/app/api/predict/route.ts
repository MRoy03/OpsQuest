export const dynamic = 'force-dynamic'
import { mockNodes } from '@/lib/mock-data'

export async function GET() {
  const predictions = mockNodes
    .filter(n => n.status !== 'offline')
    .map(node => {
      const riskScore = Math.round(
        node.cpu * 0.4 + node.memory * 0.35 + node.disk * 0.25
      )
      let issue = null
      let timeframe = null

      if (node.cpu > 85) {
        issue = `High CPU usage (${node.cpu}%) — potential service degradation`
        timeframe = node.cpu > 92 ? '< 1 hour' : '~4 hours'
      } else if (node.memory > 85) {
        issue = `Memory pressure (${node.memory}%) — risk of OOM kill`
        timeframe = '~3 hours'
      } else if (node.disk > 85) {
        issue = `Disk approaching capacity (${node.disk}%) — risk of write failures`
        timeframe = '~8 hours'
      }

      return {
        nodeId: node.id,
        nodeName: node.name,
        status: node.status,
        riskScore,
        issue,
        timeframe,
        metrics: { cpu: node.cpu, memory: node.memory, disk: node.disk },
      }
    })
    .filter(p => p.riskScore > 40)
    .sort((a, b) => b.riskScore - a.riskScore)

  return Response.json({ predictions, generatedAt: new Date().toISOString() })
}
