import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const total    = searchParams.get('total')    ?? '0'
  const month    = searchParams.get('month')    ?? '0'
  const streak   = searchParams.get('streak')   ?? '0'
  const topTool  = searchParams.get('topTool')  ?? '—'
  const topCount = searchParams.get('topCount') ?? '0'
  const provider = searchParams.get('provider') ?? '—'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          padding: '52px 60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '480px',
            height: '480px',
            background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              background: '#F5A623',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '14px', height: '14px', background: '#09090b', borderRadius: '3px', display: 'flex' }} />
          </div>
          <span
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            FluxDesk
          </span>
        </div>

        {/* Title */}
        <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            My Usage Stats
          </span>
          <span style={{ color: 'white', fontSize: '38px', fontWeight: 800, letterSpacing: '-1px', display: 'flex' }}>
            {Number(total).toLocaleString()} runs and counting
          </span>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '36px', flex: 1 }}>
          {/* This month */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              This Month
            </span>
            <span style={{ color: 'white', fontSize: '40px', fontWeight: 700, letterSpacing: '-1px', display: 'flex' }}>
              {Number(month).toLocaleString()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', display: 'flex' }}>runs in 30 days</span>
          </div>

          {/* Streak */}
          <div
            style={{
              flex: 1,
              background: 'rgba(245,166,35,0.06)',
              border: '1px solid rgba(245,166,35,0.15)',
              borderRadius: '14px',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ color: 'rgba(245,166,35,0.6)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Day Streak
            </span>
            <span style={{ color: '#F5A623', fontSize: '40px', fontWeight: 700, letterSpacing: '-1px', display: 'flex' }}>
              {streak}
            </span>
            <span style={{ color: 'rgba(245,166,35,0.4)', fontSize: '12px', display: 'flex' }}>consecutive days</span>
          </div>

          {/* Top tool */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Top Tool
            </span>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex' }}>
              {topTool.length > 14 ? topTool.slice(0, 14) + '…' : topTool}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', display: 'flex' }}>
              {Number(topCount).toLocaleString()} runs
            </span>
          </div>

          {/* Provider */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Top Provider
            </span>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex' }}>
              {provider.length > 10 ? provider.slice(0, 10) + '…' : provider}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', display: 'flex' }}>AI provider</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>fluxdesk.io</span>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', letterSpacing: '0.5px' }}>
            AI productivity · 21 tools
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
