// React-Email template — fires when a compliance deadline is approaching for a
// property. Rendered to HTML by the Resend SDK (see lib/email/emailService.ts).
// Used to exercise the core notification loop end-to-end with simulated data.
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

/**
 * The compliance obligation being chased. A loose union: the common UK letting
 * obligations get autocomplete, but any string is accepted so new item types
 * (or simulated test values) don't require a code change.
 */
export type ComplianceAlertType =
  | "Gas Safety Certificate"
  | "EPC"
  | "EICR"
  | "Right to Rent"
  | "Landlord Insurance"
  | "Smoke & CO Alarms"
  | (string & {});

export interface ComplianceAlertEmailProps {
  /** The property the obligation belongs to, e.g. "12 Acacia Avenue, Leeds". */
  propertyAddress: string;
  /** Which compliance obligation is due. */
  alertType: ComplianceAlertType;
  /** Absolute URL to the compliance area of the app. */
  appUrl: string;
  /** Human deadline text. Defaults to a simulated 14-day window. */
  deadlineText?: string;
}

export function ComplianceAlertEmail({
  propertyAddress,
  alertType,
  appUrl,
  deadlineText = "due within the next 14 days",
}: ComplianceAlertEmailProps) {
  const complianceUrl = `${appUrl.replace(/\/$/, "")}/compliance`;
  return (
    <Html>
      <Head />
      <Preview>
        {alertType} {deadlineText} for {propertyAddress}
      </Preview>
      <Body style={main}>
        <Container style={card}>
          <Section style={banner}>
            <Text style={bannerText}>⚠ Compliance deadline approaching</Text>
          </Section>

          <Section style={padded}>
            <Text style={paragraph}>
              A compliance obligation for one of your properties needs attention
              soon. Acting before the deadline keeps you compliant and avoids
              potential penalties.
            </Text>

            <Section style={detail}>
              <Row>
                <Column style={labelCol}>Property</Column>
                <Column style={valueCol}>{propertyAddress}</Column>
              </Row>
              <Row>
                <Column style={labelCol}>Obligation</Column>
                <Column style={valueCol}>{alertType}</Column>
              </Row>
              <Row>
                <Column style={labelCol}>Deadline</Column>
                <Column style={valueColAccent}>{deadlineText}</Column>
              </Row>
            </Section>

            <Button style={button} href={complianceUrl}>
              Review compliance →
            </Button>
          </Section>

          <Section style={padded}>
            <Text style={footer}>
              You&apos;re receiving this because compliance alerts are enabled for
              your PropManage account. This is general information, not legal
              advice.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ComplianceAlertEmail;

// --- styles (inline objects, React-Email convention) ---

const ACCENT = "#b45309"; // amber — "approaching", not yet overdue

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

const banner: React.CSSProperties = {
  backgroundColor: ACCENT,
  padding: "16px 24px",
};

const bannerText: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "16px",
};

const padded: React.CSSProperties = { padding: "20px 24px" };

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#3f3f46",
};

const detail: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  padding: "8px 16px",
  margin: "0 0 20px",
};

const labelCol: React.CSSProperties = {
  padding: "8px 0",
  width: "120px",
  color: "#71717a",
  fontSize: "13px",
  verticalAlign: "top",
};

const valueCol: React.CSSProperties = {
  padding: "8px 0",
  color: "#18181b",
  fontSize: "14px",
  fontWeight: 600,
};

const valueColAccent: React.CSSProperties = {
  ...valueCol,
  color: ACCENT,
};

const button: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: ACCENT,
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "14px",
  padding: "11px 20px",
  borderRadius: "8px",
};

const footer: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#a1a1aa",
};
