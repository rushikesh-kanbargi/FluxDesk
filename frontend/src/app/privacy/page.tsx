import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — FluxDesk',
  description: 'How FluxDesk collects, uses, and protects your personal data.',
  alternates: {
    canonical: '/privacy',
  },
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-lg font-semibold text-[#fafaf9] font-[var(--font-sora)] mb-3 mt-10 first:mt-0">
        {title}
      </h2>
      <div className="space-y-3 text-[rgba(255,255,255,0.6)] text-sm leading-relaxed font-[var(--font-sora)]">
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start">
          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-[#F5A623]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#09090b]">

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.06)] bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.4)] hover:text-[#fafaf9] transition-colors duration-150 font-[var(--font-sora)]"
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          <span className="text-sm font-semibold text-[#fafaf9] font-[var(--font-sora)] tracking-tight">
            Flux<span className="text-[#F5A623]">Desk</span>
          </span>
        </div>
      </header>

      {/* Document */}
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-medium font-[var(--font-dm-mono)] text-[#F5A623] uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="text-3xl font-bold text-[#fafaf9] font-[var(--font-sora)] tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-[rgba(255,255,255,0.4)] font-[var(--font-dm-mono)]">
            Last updated: April 2026
          </p>
          <div className="mt-6 h-px bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Intro */}
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed font-[var(--font-sora)] mb-8">
          FluxDesk (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your privacy. This
          Privacy Policy explains what information we collect when you use FluxDesk, how we use
          it, and the choices you have. By using FluxDesk you agree to the practices described here.
        </p>

        <div className="space-y-0 divide-y divide-[rgba(255,255,255,0.04)]">

          <Section id="data-collection" title="1. Data We Collect">
            <P>We collect information in three ways: information you provide directly, information generated automatically when you use the service, and information from third-party integrations you connect.</P>
            <P><span className="text-[#fafaf9] font-medium">Account data:</span> When you register, we collect your email address, display name, and a hashed password (via Supabase Auth). If you sign in with OAuth (Google, GitHub), we receive your email and public profile information from that provider.</P>
            <P><span className="text-[#fafaf9] font-medium">Content data:</span> Prompts, templates, collections, and any other content you create or import inside FluxDesk is stored on our servers so it can be synced across your devices.</P>
            <P><span className="text-[#fafaf9] font-medium">Usage data:</span> We log actions such as prompt runs, feature usage, and navigation events to understand how the product is used and to improve it. These logs are pseudonymous and tied to your account ID, not your name.</P>
            <P><span className="text-[#fafaf9] font-medium">Technical data:</span> IP address, browser type, operating system, referring URLs, and device identifiers collected automatically by our infrastructure and analytics providers.</P>
          </Section>

          <Section id="how-we-use" title="2. How We Use Your Data">
            <P>We use the data we collect strictly to operate and improve FluxDesk. Specific purposes include:</P>
            <Ul items={[
              'Authenticating your identity and maintaining your session',
              'Syncing your prompts, templates, and settings across devices',
              'Processing AI inference requests you initiate (your prompt content is forwarded to the AI provider you select)',
              'Sending transactional emails: account verification, password reset, billing receipts',
              'Analysing aggregate usage patterns to prioritise features and fix bugs',
              'Detecting and preventing abuse, fraud, and security threats',
              'Complying with legal obligations',
            ]} />
            <P>We do not sell your personal data to third parties. We do not use your prompt content to train AI models.</P>
          </Section>

          <Section id="storage-security" title="3. Storage & Security">
            <P>Your data is stored in Supabase-managed PostgreSQL databases hosted on AWS infrastructure in the EU (eu-west-1) by default. Backups are encrypted at rest using AES-256. Data in transit is protected by TLS 1.2 or higher.</P>
            <P>Access to production databases is restricted to a minimum set of personnel via multi-factor-authenticated tooling. All access is logged and audited.</P>
            <P>API keys you add to connect external AI providers (OpenAI, Anthropic, etc.) are encrypted at rest using envelope encryption before being stored. We never log raw API key values.</P>
            <P>While we implement industry-standard safeguards, no system is 100% secure. In the event of a data breach that affects your rights, we will notify affected users within 72 hours as required by GDPR.</P>
          </Section>

          <Section id="third-parties" title="4. Third-Party Services">
            <P>FluxDesk integrates with the following categories of third-party services. Each operates under its own privacy policy:</P>
            <Ul items={[
              'Supabase — database, authentication, and real-time infrastructure',
              'Stripe — payment processing; we never store raw card numbers',
              'AI providers (OpenAI, Anthropic, Google, etc.) — inference for prompts you run; these providers receive prompt text when you execute a run',
              'PostHog — product analytics (pseudonymous event tracking)',
              'Resend — transactional email delivery',
              'Cloudflare — CDN, DDoS protection, and edge caching',
            ]} />
            <P>We select vendors who offer data processing agreements (DPAs) compatible with GDPR requirements. We do not share your personal data with advertisers or data brokers.</P>
          </Section>

          <Section id="your-rights" title="5. Your Rights (GDPR & CCPA)">
            <P>Depending on where you live, you have specific legal rights regarding your personal data. We honour all of the following regardless of jurisdiction:</P>
            <Ul items={[
              'Right to access — request a copy of all personal data we hold about you',
              'Right to rectification — correct inaccurate or incomplete data',
              'Right to erasure — request deletion of your account and all associated data',
              'Right to data portability — export your prompts and settings in a machine-readable format',
              'Right to restrict processing — ask us to pause processing your data while a complaint is resolved',
              'Right to object — opt out of any processing based on legitimate interests',
              'Right to opt out of sale — we do not sell data, but you may confirm this at any time',
            ]} />
            <P>To exercise any right, email us at <a href="mailto:support@fluxdesk.app" className="text-[#F5A623] hover:underline">support@fluxdesk.app</a> with the subject line &ldquo;Privacy Request&rdquo;. We respond within 30 days. For EU residents, you also have the right to lodge a complaint with your local supervisory authority.</P>
          </Section>

          <Section id="cookies" title="6. Cookies & Tracking">
            <P>FluxDesk uses a minimal set of cookies and local storage values:</P>
            <Ul items={[
              'Session cookies — set by Supabase Auth to maintain your login state; strictly necessary',
              'Preference cookies — store UI preferences such as sidebar state and theme; strictly necessary',
              'Analytics cookies — PostHog collects pseudonymous usage events; can be declined via our cookie banner',
            ]} />
            <P>We do not use advertising cookies or third-party tracking pixels. You can manage cookie preferences at any time via the banner shown on first visit, or by clearing your browser storage.</P>
          </Section>

          <Section id="contact" title="7. Contact">
            <P>For any privacy-related questions, data subject requests, or concerns, contact our privacy team:</P>
            <P>
              <span className="font-[var(--font-dm-mono)] text-[#fafaf9]">Email:</span>{' '}
              <a href="mailto:support@fluxdesk.app" className="text-[#F5A623] hover:underline">support@fluxdesk.app</a>
            </P>
            <P>We aim to acknowledge all privacy requests within 48 hours and resolve them within 30 days.</P>
          </Section>

          <Section id="updates" title="8. Updates to This Policy">
            <P>We may update this Privacy Policy to reflect changes in our practices, technology, legal requirements, or for other operational reasons. When we make material changes, we will:</P>
            <Ul items={[
              'Update the "Last updated" date at the top of this page',
              'Send a notification email to registered users at least 14 days before the change takes effect',
              'Show an in-app banner for significant changes',
            ]} />
            <P>Continued use of FluxDesk after the effective date constitutes acceptance of the updated policy.</P>
          </Section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[rgba(255,255,255,0.3)] font-[var(--font-dm-mono)]">
            © {new Date().getFullYear()} FluxDesk. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs font-[var(--font-sora)]">
            <Link href="/terms" className="text-[rgba(255,255,255,0.4)] hover:text-[#fafaf9] transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:support@fluxdesk.app" className="text-[rgba(255,255,255,0.4)] hover:text-[#fafaf9] transition-colors">
              Contact
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
