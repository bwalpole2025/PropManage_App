// React-Email template — welcomes a new PropManage beta tester. Rendered to HTML
// by the Resend SDK (see lib/email/emailService.ts). Pure/presentational: all
// dynamic values arrive as props so it stays trivially unit-testable.
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface BetaWelcomeEmailProps {
  /** Absolute URL to the signed-in app (dashboard). */
  appUrl: string;
  /** Address beta testers should send bug reports / questions to. */
  supportEmail: string;
}

export function BetaWelcomeEmail({ appUrl, supportEmail }: BetaWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your PropManage beta account is active — here&apos;s how to get started</Preview>
      <Body style={main}>
        <Container style={card}>
          <Section style={header}>
            <Text style={brand}>PropManage</Text>
            <Heading style={heading}>Welcome to the beta 🎉</Heading>
          </Section>

          <Section style={padded}>
            <Text style={paragraph}>
              Thanks for joining the PropManage private beta. Your account is
              <strong> active and ready to use</strong> — sign in any time to add
              properties, log transactions and track compliance.
            </Text>

            <Button style={button} href={appUrl}>
              Open your dashboard →
            </Button>
          </Section>

          <Hr style={rule} />

          <Section style={padded}>
            <Heading as="h2" style={subheading}>
              Found a bug? Tell us.
            </Heading>
            <Text style={paragraph}>
              As a beta tester your feedback shapes the product. The fastest way
              to report a problem is the <strong>“Send feedback”</strong> button in
              the app footer — it captures the page you&apos;re on automatically. You
              can also email us directly at{" "}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
              .
            </Text>
            <Text style={paragraph}>
              When you report a bug, it helps to include what you expected to
              happen, what actually happened, and the property or screen involved.
            </Text>
          </Section>

          <Hr style={rule} />

          <Section style={padded}>
            <Text style={footer}>
              You&apos;re receiving this because you signed up for the PropManage
              beta. This is general product information, not legal or tax advice.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BetaWelcomeEmail;

// --- styles (inline objects, React-Email convention) ---

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "24px 12px",
};

const card: React.CSSProperties = {
  maxWidth: "600px",
  width: "100%",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e4e4e7",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  padding: "28px 24px",
  color: "#ffffff",
};

const brand: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: "#c7d2fe",
};

const heading: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "22px",
  fontWeight: 700,
  color: "#ffffff",
};

const subheading: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "16px",
  fontWeight: 700,
  color: "#18181b",
};

const padded: React.CSSProperties = { padding: "20px 24px" };

const paragraph: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#3f3f46",
};

const button: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "14px",
  padding: "11px 20px",
  borderRadius: "8px",
};

const link: React.CSSProperties = { color: "#4f46e5", fontWeight: 600 };

const rule: React.CSSProperties = {
  borderColor: "#f1f1f4",
  margin: "4px 0",
};

const footer: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#a1a1aa",
};
