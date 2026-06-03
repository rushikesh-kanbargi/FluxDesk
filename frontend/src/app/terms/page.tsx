import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — FluxDesk',
  description: 'The terms and conditions that govern your use of FluxDesk.',
  alternates: {
    canonical: '/terms',
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-[rgba(255,255,255,0.4)] font-[var(--font-dm-mono)]">
            Last updated: April 2026
          </p>
          <div className="mt-6 h-px bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Intro */}
        <p className="text-sm text-[rgba(255,255,255,0.6)] leading-relaxed font-[var(--font-sora)] mb-8">
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and
          FluxDesk (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) governing your access to and use of the FluxDesk
          platform, software, and related services (collectively, the &ldquo;Service&rdquo;). Please read them carefully.
        </p>

        <div className="space-y-0 divide-y divide-[rgba(255,255,255,0.04)]">

          <Section id="acceptance" title="1. Acceptance of Terms">
            <P>By creating an account, accessing, or using FluxDesk in any way, you confirm that you are at least 16 years old, have the legal capacity to enter into a binding agreement, and agree to be bound by these Terms and our <Link href="/privacy" className="text-[#F5A623] hover:underline">Privacy Policy</Link>.</P>
            <P>If you are using FluxDesk on behalf of a company or organisation, you represent that you have authority to bind that entity to these Terms, and &ldquo;you&rdquo; refers to both you individually and that entity.</P>
            <P>If you do not agree with any part of these Terms, you must not access or use the Service.</P>
          </Section>

          <Section id="service-description" title="2. Service Description">
            <P>FluxDesk is a prompt engineering and AI workflow platform that allows users to create, organise, test, and run prompts against a variety of large language model (LLM) providers. The Service includes a web application, browser extension (where available), and any associated APIs.</P>
            <P>We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will make reasonable efforts to notify users of significant changes in advance.</P>
            <P>Some features are gated behind paid subscription plans. Free plan limitations (e.g. prompt storage limits, run quotas) are described on our pricing page and may change over time.</P>
          </Section>

          <Section id="account-responsibilities" title="3. Account Responsibilities">
            <P>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must:</P>
            <Ul items={[
              'Provide accurate, current, and complete information during registration',
              'Keep your password and any API keys stored in your account secure',
              'Notify us immediately at support@fluxdesk.app if you suspect unauthorised access',
              'Not share your account with other individuals or allow others to access the Service through your account',
              'Ensure that any sub-users or team members you invite also comply with these Terms',
            ]} />
            <P>We are not liable for any loss or damage arising from your failure to maintain account security.</P>
          </Section>

          <Section id="acceptable-use" title="4. Acceptable Use">
            <P>You agree to use FluxDesk only for lawful purposes. You must not use the Service to:</P>
            <Ul items={[
              'Generate, distribute, or store content that is illegal, defamatory, obscene, or infringes on third-party rights',
              'Conduct phishing, fraud, or social engineering attacks',
              'Circumvent rate limits, scrape the platform at scale, or perform denial-of-service attacks',
              'Reverse-engineer, decompile, or attempt to extract source code from FluxDesk',
              'Resell or sublicense access to the Service without our written consent',
              'Use the Service to build a directly competing product',
              'Violate the terms of service of any AI provider accessed through the platform',
              'Attempt to extract, infer, or reconstruct model weights or training data from AI outputs',
            ]} />
            <P>We reserve the right to suspend or terminate accounts that violate this policy, with or without prior notice depending on severity.</P>
          </Section>

          <Section id="ai-content" title="5. AI-Generated Content Disclaimer">
            <P>FluxDesk is a tool for interacting with third-party AI models. We do not own, operate, or control the AI models themselves. All AI-generated outputs are produced by external providers (e.g. OpenAI, Anthropic, Google) and are subject to their respective usage policies.</P>
            <P>AI-generated content may be inaccurate, incomplete, biased, or inappropriate. You are solely responsible for reviewing, validating, and determining the fitness of any AI output before acting on it. FluxDesk makes no warranty as to the accuracy, reliability, or suitability of any content generated by AI models.</P>
            <P>Do not rely on AI-generated output for medical, legal, financial, or safety-critical decisions without independent professional review.</P>
          </Section>

          <Section id="api-keys" title="6. API Keys & Third-Party Services">
            <P>FluxDesk allows you to connect external AI provider accounts by storing your API keys. By adding a key, you authorise FluxDesk to use it to make API calls on your behalf when you initiate a prompt run.</P>
            <P>You are solely responsible for:</P>
            <Ul items={[
              'The cost and usage incurred on your provider accounts as a result of using FluxDesk',
              'Compliance with each AI provider\'s terms of service',
              'Securing and rotating your API keys when necessary',
              'Promptly removing keys from FluxDesk if they are compromised',
            ]} />
            <P>FluxDesk encrypts stored API keys at rest, but is not liable for losses arising from unauthorised use of your keys if your account is compromised through your own negligence.</P>
          </Section>

          <Section id="intellectual-property" title="7. Intellectual Property">
            <P><span className="text-[#fafaf9] font-medium">Your content:</span> You retain all ownership rights to prompts, templates, and other content you create in FluxDesk. By using the Service, you grant us a limited, non-exclusive, royalty-free licence to host, store, and transmit your content solely to provide the Service.</P>
            <P><span className="text-[#fafaf9] font-medium">Our IP:</span> FluxDesk, its logo, product name, software, and all related intellectual property are owned by us and protected by copyright, trademark, and other applicable laws. These Terms do not grant you any right to use our trademarks or branding without written permission.</P>
            <P><span className="text-[#fafaf9] font-medium">Feedback:</span> If you submit ideas, bug reports, or suggestions, you grant us a perpetual, irrevocable, royalty-free licence to use them without any obligation to you.</P>
          </Section>

          <Section id="liability" title="8. Limitation of Liability">
            <P>To the maximum extent permitted by applicable law, FluxDesk and its affiliates, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from or related to your use of the Service.</P>
            <P>Our total aggregate liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid to FluxDesk in the 12 months preceding the claim, or (b) US $50.</P>
            <P>Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability — in those cases, our liability is limited to the minimum extent permitted by law.</P>
          </Section>

          <Section id="termination" title="9. Termination">
            <P>You may delete your account at any time from the Settings page. Upon deletion, we will remove your personal data in accordance with our <Link href="/privacy" className="text-[#F5A623] hover:underline">Privacy Policy</Link>.</P>
            <P>We may suspend or terminate your access immediately and without notice if we determine, in our sole discretion, that you have violated these Terms, pose a security risk, or that continued access would harm the Service or other users.</P>
            <P>Upon termination for any reason, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including IP ownership, disclaimers, limitation of liability, and dispute resolution) shall continue to apply.</P>
          </Section>

          <Section id="governing-law" title="10. Governing Law">
            <P>These Terms are governed by the laws of India, without regard to its conflict-of-law provisions. Any dispute arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts located in Belagavi, Karnataka, India.</P>
            <P>If you are a consumer in the EU or UK, you may also have rights under mandatory consumer protection laws in your country of residence. Nothing in these Terms limits those rights.</P>
            <P>Before initiating formal proceedings, both parties agree to attempt good-faith resolution by contacting <a href="mailto:support@fluxdesk.app" className="text-[#F5A623] hover:underline">support@fluxdesk.app</a>.</P>
          </Section>

          <Section id="changes" title="11. Changes to These Terms">
            <P>We may revise these Terms from time to time. For material changes, we will:</P>
            <Ul items={[
              'Update the "Last updated" date at the top of this page',
              'Send a notification email to registered users at least 14 days before the new Terms take effect',
              'Display an in-app notice for significant changes',
            ]} />
            <P>If you continue to use FluxDesk after the revised Terms take effect, you accept the new Terms. If you do not agree, you must stop using the Service and may delete your account before the effective date.</P>
          </Section>

          <Section id="contact" title="12. Contact">
            <P>For questions about these Terms, account issues, or legal notices, contact us at:</P>
            <P>
              <span className="font-[var(--font-dm-mono)] text-[#fafaf9]">Email:</span>{' '}
              <a href="mailto:support@fluxdesk.app" className="text-[#F5A623] hover:underline">support@fluxdesk.app</a>
            </P>
            <P>We aim to respond to all formal legal inquiries within 5 business days.</P>
          </Section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[rgba(255,255,255,0.3)] font-[var(--font-dm-mono)]">
            © {new Date().getFullYear()} FluxDesk. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs font-[var(--font-sora)]">
            <Link href="/privacy" className="text-[rgba(255,255,255,0.4)] hover:text-[#fafaf9] transition-colors">
              Privacy Policy
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
