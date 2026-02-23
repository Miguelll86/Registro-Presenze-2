import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type RigaRapportino = {
  dipendente: string;
  mattinaEntrata: string;
  mattinaUscita: string;
  mattinaOre: string;
  pomeriggioEntrata: string;
  pomeriggioUscita: string;
  pomeriggioOre: string;
  totaleOre: string;
};

export type RapportinoPdfData = {
  dataFmt: string;
  cantiereNome: string;
  righe: RigaRapportino[];
  descrizioneLavori: string;
  firmaResponsabileDataUrl: string | null;
  firmaVisoreDataUrl: string | null;
};

export type GiornoRapportino = {
  dataFmt: string;
  righe: RigaRapportino[];
};

export type RapportinoPeriodoPdfData = {
  dataDaFmt: string;
  dataAFmt: string;
  cantiereNome: string;
  giorni: GiornoRapportino[];
  descrizioneLavori: string;
  firmaResponsabileDataUrl: string | null;
  firmaVisoreDataUrl: string | null;
};

function addFirmaToPdf(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  label: string
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, x, y);
  y += 6;
  if (dataUrl) {
    try {
      doc.addImage(dataUrl, "PNG", x, y - 3, 45, 22);
    } catch {
      doc.setFont("helvetica", "italic");
      doc.text("[Firma non disponibile]", x, y + 5);
    }
  }
  // Se non c'è firma: lasciare vuoto (nessun testo)
}

/** Genera il documento PDF del rapportino (stesso layout della pagina Genera). */
export function buildRapportinoPdf(data: RapportinoPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginR = 14;
  let y = 16;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LC INSTALLATION SRL", marginR, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Rapportino giornaliero", marginR, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DATA", pageW - marginR, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.dataFmt, pageW - marginR, y + 6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("CANTIERE", pageW - marginR, y + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(data.cantiereNome, pageW - marginR, y + 20, { align: "right" });
  y += 28;

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Dipendente",
        "MATTINA Entrata",
        "MATTINA Uscita",
        "MATTINA Ore",
        "POMERIGGIO Entrata",
        "POMERIGGIO Uscita",
        "POMERIGGIO Ore",
        "Totale ore",
      ],
    ],
    body: data.righe.map((r) => [
      r.dipendente,
      r.mattinaEntrata,
      r.mattinaUscita,
      r.mattinaOre,
      r.pomeriggioEntrata,
      r.pomeriggioUscita,
      r.pomeriggioOre,
      r.totaleOre,
    ]),
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: marginR, right: marginR },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      6: { cellWidth: 20 },
      7: { cellWidth: 18 },
    },
  });
  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Descrizione dei lavori", marginR, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const descr = (data.descrizioneLavori || "").trim() || "—";
  const descrLines = doc.splitTextToSize(descr, pageW - 2 * marginR);
  doc.text(descrLines, marginR, y);
  y += Math.max(descrLines.length * 5, 10) + 16;

  addFirmaToPdf(doc, data.firmaResponsabileDataUrl, marginR, y, "Firma Responsabile di cantiere");
  addFirmaToPdf(doc, data.firmaVisoreDataUrl, pageW - marginR - 55, y, "Firma Visore Cliente");

  return doc;
}

const TABLE_HEAD = [
  "Dipendente",
  "MATTINA E",
  "MATTINA U",
  "MATT. Ore",
  "POM. E",
  "POM. U",
  "POM. Ore",
  "Totale",
];

function drawRigheTable(
  doc: jsPDF,
  righe: RigaRapportino[],
  startY: number,
  marginR: number,
  pageW: number
): number {
  if (righe.length === 0) return startY;
  autoTable(doc, {
    startY,
    head: [TABLE_HEAD],
    body: righe.map((r) => [
      r.dipendente,
      r.mattinaEntrata,
      r.mattinaUscita,
      r.mattinaOre,
      r.pomeriggioEntrata,
      r.pomeriggioUscita,
      r.pomeriggioOre,
      r.totaleOre,
    ]),
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: marginR, right: marginR },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 14 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 14 },
      7: { cellWidth: 14 },
    },
  });
  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return (docWithTable.lastAutoTable?.finalY ?? startY) + 6;
}

/** Genera il PDF del rapportino di periodo (dal...al, più giorni + descrizione + firme). */
export function buildRapportinoPeriodoPdf(data: RapportinoPeriodoPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginR = 14;
  const pageH = 297;
  const maxY = pageH - 25;
  let y = 16;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LC INSTALLATION SRL", marginR, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Rapportino di periodo", marginR, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Dal", pageW - marginR, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(data.dataDaFmt, pageW - marginR, y + 5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Al", pageW - marginR, y + 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(data.dataAFmt, pageW - marginR, y + 17, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("CANTIERE", pageW - marginR, y + 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(data.cantiereNome, pageW - marginR, y + 30, { align: "right" });
  y += 36;

  for (let i = 0; i < data.giorni.length; i++) {
    const giorno = data.giorni[i];
    if (y > maxY - 40) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Giorno ${giorno.dataFmt}`, marginR, y);
    y += 6;
    y = drawRigheTable(doc, giorno.righe, y, marginR, pageW);
  }

  if (y > maxY - 50) {
    doc.addPage();
    y = 16;
  }
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Descrizione dei lavori", marginR, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const descr = (data.descrizioneLavori || "").trim() || "—";
  const descrLines = doc.splitTextToSize(descr, pageW - 2 * marginR);
  doc.text(descrLines, marginR, y);
  y += Math.max(descrLines.length * 5, 10) + 14;

  addFirmaToPdf(doc, data.firmaResponsabileDataUrl, marginR, y, "Firma Responsabile di cantiere");
  addFirmaToPdf(doc, data.firmaVisoreDataUrl, pageW - marginR - 55, y, "Firma Visore Cliente");

  return doc;
}
