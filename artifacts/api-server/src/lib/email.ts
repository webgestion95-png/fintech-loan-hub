import { logger } from "./logger";

type EmailKind =
  | "ACCEPTED"
  | "REFUSED"
  | "CONTRACT_SENT"
  | "SIGNATURE_REQUEST"
  | "PROCESSING"
  | "FUNDS_AVAILABLE";

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  kind: EmailKind;
  attachments?: { filename: string; contentBase64: string }[];
}

let resendClientPromise: Promise<unknown> | null = null;

async function getResendClient(): Promise<{
  emails: {
    send: (args: {
      from: string;
      to: string | string[];
      subject: string;
      text: string;
      attachments?: { filename: string; content: Buffer }[];
    }) => Promise<unknown>;
  };
} | null> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return null;
  if (!resendClientPromise) {
    resendClientPromise = import("resend")
      .then((mod) => new mod.Resend(apiKey))
      .catch((err) => {
        logger.warn({ err }, "Resend not installed; falling back to console email");
        return null;
      });
  }
  return resendClientPromise as Promise<ReturnType<typeof getResendClient> extends Promise<infer R> ? R : never>;
}

export async function sendEmail(args: SendArgs): Promise<{ delivered: boolean }> {
  const fromAddress = process.env["EMAIL_FROM"] ?? "LoanFlow <onboarding@resend.dev>";
  const client = await getResendClient();
  if (client) {
    try {
      await client.emails.send({
        from: fromAddress,
        to: args.to,
        subject: args.subject,
        text: args.text,
        attachments: args.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.contentBase64, "base64"),
        })),
      });
      logger.info({ to: args.to, kind: args.kind }, "Email sent via Resend");
      return { delivered: true };
    } catch (err) {
      logger.error({ err, to: args.to, kind: args.kind }, "Resend send failed");
    }
  }
  logger.info(
    { to: args.to, subject: args.subject, kind: args.kind },
    "Email (simulated, Resend not configured)",
  );
  return { delivered: false };
}

export const EMAIL_TEMPLATES = {
  accepted(applicantName: string, amount: number, durationMonths: number): {
    subject: string;
    text: string;
  } {
    return {
      subject: "Votre demande de prêt a été acceptée",
      text: `Bonjour ${applicantName},

Excellente nouvelle ! Votre demande de prêt de ${amount.toFixed(2)} € sur ${durationMonths} mois a été acceptée par notre équipe.

Nous vous envoyons immédiatement le contrat de prêt par e-mail séparé. Merci de le consulter, le signer et nous le retourner via votre espace personnel pour finaliser votre dossier.

À très vite,
L'équipe LoanFlow`,
    };
  },
  refused(applicantName: string, adminNote: string | null): { subject: string; text: string } {
    return {
      subject: "Réponse à votre demande de prêt",
      text: `Bonjour ${applicantName},

Après étude attentive de votre dossier, nous ne sommes malheureusement pas en mesure de donner une suite favorable à votre demande de prêt.

${adminNote ? `Motif communiqué par notre équipe : ${adminNote}\n\n` : ""}Vous pouvez nous recontacter dans 3 mois pour soumettre une nouvelle demande.

Cordialement,
L'équipe LoanFlow`,
    };
  },
  contractSent(applicantName: string): { subject: string; text: string } {
    return {
      subject: "Votre contrat de prêt LoanFlow",
      text: `Bonjour ${applicantName},

Vous trouverez ci-joint votre contrat de prêt. Merci de le télécharger, le signer (signature manuscrite ou électronique) et nous le retourner depuis votre espace personnel LoanFlow.

Une fois le contrat signé reçu, nous procéderons au déblocage de vos fonds dans un délai de 72 heures.

Cordialement,
L'équipe LoanFlow`,
    };
  },
  signatureRequest(applicantName: string): { subject: string; text: string } {
    return {
      subject: "Action requise — signature de votre contrat",
      text: `Bonjour ${applicantName},

Votre contrat de prêt vous attend. Merci de le signer et de l'uploader depuis votre espace LoanFlow afin que nous puissions déclencher le versement des fonds.

À très vite,
L'équipe LoanFlow`,
    };
  },
  processing(applicantName: string): { subject: string; text: string } {
    return {
      subject: "Votre dossier est en cours de traitement",
      text: `Bonjour ${applicantName},

Nous avons bien reçu votre contrat signé. Votre dossier est désormais en cours de traitement, les fonds seront virés sur votre compte sous 72 heures.

Cordialement,
L'équipe LoanFlow`,
    };
  },
  fundsAvailable(applicantName: string, amount: number): { subject: string; text: string } {
    return {
      subject: "Vos fonds sont disponibles",
      text: `Bonjour ${applicantName},

Vos fonds d'un montant de ${amount.toFixed(2)} € sont disponibles. Vous pouvez dès à présent les retirer depuis votre espace LoanFlow.

Merci de votre confiance,
L'équipe LoanFlow`,
    };
  },
};
