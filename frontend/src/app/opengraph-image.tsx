import { ImageResponse } from 'next/og'

export const alt = 'FluxDesk — The AI workspace that flows with your work'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '500px',
            background:
              'radial-gradient(ellipse at center, rgba(245,166,35,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              background: 'rgba(245,166,35,0.12)',
              border: '1.5px solid rgba(245,166,35,0.35)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: '38px',
              fontWeight: '700',
              color: '#fafaf9',
              letterSpacing: '-1px',
            }}
          >
            Flux
            <span style={{ color: '#F5A623' }}>Desk</span>
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '58px',
            fontWeight: '800',
            color: '#fafaf9',
            textAlign: 'center',
            lineHeight: 1.05,
            letterSpacing: '-2px',
            maxWidth: '840px',
            margin: '0 0 24px 0',
          }}
        >
          Work smarter,{' '}
          <span style={{ color: '#F5A623' }}>ship faster</span>
        </h1>

        {/* Subline */}
        <p
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            maxWidth: '620px',
            margin: '0',
            lineHeight: 1.45,
          }}
        >
          The AI workspace that flows with your work
        </p>

        {/* Bottom domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.08em',
            }}
          >
            fluxdesk.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
