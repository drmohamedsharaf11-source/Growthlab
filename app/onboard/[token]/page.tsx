import prisma from "@/lib/prisma";
import SignupForm from "./SignupForm";

type Props = { params: { token: string } };

function InvalidInvitePage({ reason }: { reason: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)", margin: "0 0 10px" }}>
          Invite link invalid
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text2)", margin: "0 0 24px", lineHeight: 1.6 }}>
          {reason}
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Go to login
        </a>
      </div>
    </div>
  );
}

export default async function OnboardTokenPage({ params }: Props) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { client: { select: { name: true } } },
  });

  if (!invite) {
    return <InvalidInvitePage reason="This invite link doesn't exist. It may have been revoked or the URL is incorrect." />;
  }
  if (invite.usedAt) {
    return <InvalidInvitePage reason="This invite link has already been used. If you already signed up, go to the login page." />;
  }
  if (invite.expiresAt < new Date()) {
    return <InvalidInvitePage reason="This invite link has expired (links are valid for 7 days). Please ask your admin to send a new invite." />;
  }

  return (
    <SignupForm
      token={params.token}
      email={invite.email}
      clientName={invite.client.name}
    />
  );
}
