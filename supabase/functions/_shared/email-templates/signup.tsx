/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Complete your account setup and start exploring LayerLoot.</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}><Heading style={logoText}>⬡ LAYERLOOT</Heading></Section>
        <Section style={content}>
          <Heading style={h1}>Verify your LayerLoot account</Heading>
          <Text style={text}>Welcome to <strong>{siteName}</strong>.</Text>
          <Text style={text}>Please confirm your email address ({recipient}) to activate your account and securely access your profile, orders, and custom requests.</Text>
          <Section style={btnWrap}><Button style={btn} href={confirmationUrl}>Verify my account</Button></Section>
          <Text style={muted}>If you did not create an account, you can safely ignore this email.</Text>
        </Section>
        <Hr style={hr} />
        <Section style={foot}>
          <Text style={footText}><Link href={siteUrl} style={footLink}>{siteName}</Link> — Custom 3D printed creations</Text>
          <Text style={footText}>Need help? <Link href="mailto:layerloot.support@neuraltune.me" style={footLink}>layerloot.support@neuraltune.me</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const wrapper = { maxWidth: '580px', margin: '0 auto' }
const header = { padding: '30px 25px 20px', textAlign: 'center' as const }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, color: '#3B82F6', letterSpacing: '3px', margin: '0' }
const content = { padding: '0 25px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0' }
const btn = { backgroundColor: '#3B82F6', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const muted = { fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0' }
const hr = { borderColor: '#e2e8f0', margin: '0' }
const foot = { padding: '20px 25px' }
const footText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 8px', textAlign: 'center' as const }
const footLink = { color: '#3B82F6', textDecoration: 'none' }
