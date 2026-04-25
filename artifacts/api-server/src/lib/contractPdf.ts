import PDFDocument from "pdfkit";
import { type Loan } from "@workspace/db";

export function generateContractPdf(loan: Loan, userFullName: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const amount = Number(loan.amount).toFixed(2);
    const monthly = (Number(loan.amount) / loan.durationMonths).toFixed(2);
    const totalInterest = "0.00";
    const taeg = "Indicatif — voir conditions";

    doc.fontSize(22).fillColor("#111").text("Contrat de prêt personnel", { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#555").text(`LoanFlow — Référence : ${loan.id}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(11).fillColor("#000");
    doc.font("Helvetica-Bold").text("Entre les soussignés :", { underline: true });
    doc.font("Helvetica").moveDown(0.5);
    doc.text("LoanFlow SAS, organisme prêteur, ci-après dénommé « le Prêteur »,");
    doc.moveDown(0.4);
    doc.text("ET");
    doc.moveDown(0.4);
    doc.text(`${loan.applicantName}${userFullName && userFullName !== loan.applicantName ? ` (${userFullName})` : ""}, demeurant à l'adresse communiquée lors de la souscription, ci-après dénommé « l'Emprunteur ».`);

    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").text("Article 1 — Objet du prêt");
    doc.font("Helvetica");
    doc.text(
      `Le Prêteur consent à l'Emprunteur, qui accepte, un prêt personnel d'un montant de ${amount} € (montant en chiffres), remboursable sur ${loan.durationMonths} mois.${loan.purpose ? ` Objet déclaré du prêt : ${loan.purpose}.` : ""}`,
    );

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text("Article 2 — Modalités de remboursement");
    doc.font("Helvetica");
    doc.text(`Mensualité indicative : ${monthly} € pendant ${loan.durationMonths} mois.`);
    doc.text(`Coût total des intérêts : ${totalInterest} € (offre MVP, taux promotionnel à 0%).`);
    doc.text(`TAEG : ${taeg}.`);

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text("Article 3 — Conditions");
    doc.font("Helvetica");
    doc.text(
      "Les fonds seront mis à disposition de l'Emprunteur dans un délai maximum de 72 heures à compter de la réception du présent contrat dûment signé. L'Emprunteur reconnaît avoir pris connaissance des conditions générales du Prêteur.",
    );

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text("Article 4 — Droit de rétractation");
    doc.font("Helvetica");
    doc.text(
      "Conformément à la réglementation française, l'Emprunteur dispose d'un délai de rétractation de 14 jours calendaires à compter de la signature du présent contrat.",
    );

    doc.moveDown(2);
    doc.text(`Fait à Paris, le ${new Date().toLocaleDateString("fr-FR")}.`);
    doc.moveDown(2);

    const yStart = doc.y;
    doc.font("Helvetica-Bold").text("Le Prêteur :", 56, yStart);
    doc.font("Helvetica").text("LoanFlow SAS", 56, yStart + 16);
    doc.font("Helvetica").text("Signature électronique vérifiée", 56, yStart + 32);

    doc.font("Helvetica-Bold").text("L'Emprunteur :", 320, yStart);
    doc.font("Helvetica").text(loan.applicantName, 320, yStart + 16);
    doc.font("Helvetica").text("Signature : __________________________", 320, yStart + 32);

    doc.end();
  });
}
