"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./rapportino.module.css";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type CantiereOption = { id: string; nome: string };
type PresenzaRow = {
  id: string;
  tipo: string;
  createdAt: string;
  dipendenteId: string;
  dipendente: { id: string; nome: string; cognome: string };
  cantiere: { id: string; nome: string };
};

const ORA_SPLIT = 13; // 13:00 = confine mattina / pomeriggio

type RigaRapportino = {
  dipendente: string;
  mattinaEntrata: string;
  mattinaUscita: string;
  mattinaOre: string;
  pomeriggioEntrata: string;
  pomeriggioUscita: string;
  pomeriggioOre: string;
  totaleOre: string;
};

const DESCrizione_MAX = 300;

function aggregatePresenze(presenze: PresenzaRow[]): RigaRapportino[] {
  const sorted = [...presenze].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const byDip: Record<
    string,
    {
      nome: string;
      mattina: { entrata: string; uscita: string; ore: number };
      pomeriggio: { entrata: string; uscita: string; ore: number };
      totale: number;
    }
  > = {};
  const lastEntrata: Record<string, Date> = {};

  for (const row of sorted) {
    const key = row.dipendenteId;
    const nome = `${row.dipendente.cognome} ${row.dipendente.nome}`;
    if (!byDip[key]) {
      byDip[key] = {
        nome,
        mattina: { entrata: "—", uscita: "—", ore: 0 },
        pomeriggio: { entrata: "—", uscita: "—", ore: 0 },
        totale: 0,
      };
    }
    if (row.tipo === "ENTRATA") {
      lastEntrata[key] = new Date(row.createdAt);
    } else {
      const lastE = lastEntrata[key];
      if (lastE) {
        const uscitaDate = new Date(row.createdAt);
        const ore = (uscitaDate.getTime() - lastE.getTime()) / (1000 * 60 * 60);
        const hourEntrata = lastE.getHours() + lastE.getMinutes() / 60;
        const isMattina = hourEntrata < ORA_SPLIT;
        if (isMattina) {
          byDip[key].mattina.entrata = format(lastE, "HH:mm", { locale: it });
          byDip[key].mattina.uscita = format(uscitaDate, "HH:mm", { locale: it });
          byDip[key].mattina.ore += ore;
        } else {
          byDip[key].pomeriggio.entrata = format(lastE, "HH:mm", { locale: it });
          byDip[key].pomeriggio.uscita = format(uscitaDate, "HH:mm", { locale: it });
          byDip[key].pomeriggio.ore += ore;
        }
        byDip[key].totale += ore;
        delete lastEntrata[key];
      }
    }
  }

  return Object.values(byDip).map((r) => ({
    dipendente: r.nome,
    mattinaEntrata: r.mattina.entrata,
    mattinaUscita: r.mattina.uscita,
    mattinaOre:
      r.mattina.ore > 0 ? `${Math.round(r.mattina.ore * 100) / 100} h` : "—",
    pomeriggioEntrata: r.pomeriggio.entrata,
    pomeriggioUscita: r.pomeriggio.uscita,
    pomeriggioOre:
      r.pomeriggio.ore > 0 ? `${Math.round(r.pomeriggio.ore * 100) / 100} h` : "—",
    totaleOre: r.totale > 0 ? `${Math.round(r.totale * 100) / 100} h` : "—",
  }));
}

export default function RapportinoPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasVisoreRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cantieri, setCantieri] = useState<CantiereOption[]>([]);
  const [presenze, setPresenze] = useState<PresenzaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [presenzeLoading, setPresenzeLoading] = useState(false);
  const [dataSelezionata, setDataSelezionata] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [cantiereId, setCantiereId] = useState("");
  const [descrizioneLavori, setDescrizioneLavori] = useState("");
  const [generando, setGenerando] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const loadCantieri = useCallback(async () => {
    const res = await fetch("/api/responsabile/cantieri");
    if (res.status === 403) {
      router.replace("/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCantieri(data.map((c: CantiereOption) => ({ id: c.id, nome: c.nome })));
      if (data.length > 0) setCantiereId((prev) => prev || data[0].id);
    }
  }, [router]);

  const loadPresenze = useCallback(async () => {
    if (!cantiereId) {
      setPresenze([]);
      return;
    }
    setPresenzeLoading(true);
    try {
      const params = new URLSearchParams({
        data: dataSelezionata,
        cantiereId,
      });
      const res = await fetch(`/api/responsabile/presenze?${params.toString()}`);
      if (res.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPresenze(data);
      } else setPresenze([]);
    } finally {
      setPresenzeLoading(false);
    }
  }, [dataSelezionata, cantiereId, router]);

  useEffect(() => {
    (async () => {
      await loadCantieri();
      setLoading(false);
    })();
  }, [loadCantieri]);

  useEffect(() => {
    if (!loading) loadPresenze();
  }, [loading, dataSelezionata, cantiereId, loadPresenze]);

  const cantiereNome = cantieri.find((c) => c.id === cantiereId)?.nome ?? "";
  const righe = aggregatePresenze(presenze);

  const getCanvasCoords = useCallback(
    (canvas: HTMLCanvasElement | null, clientX: number, clientY: number) => {
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      // Coordinate relative al canvas: clientX/Y sono rispetto al viewport, rect idem
      // Non moltiplicare per scale: il contesto è già scalato con dpr in initCanvas
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return { x, y };
    },
    []
  );

  const startDraw = useCallback(
    (clientX: number, clientY: number, ref: React.RefObject<HTMLCanvasElement>) => {
      const canvas = ref.current;
      if (!canvas) return;
      activeCanvasRef.current = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getCanvasCoords(canvas, clientX, clientY);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCanvasCoords]
  );

  const draw = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing || !activeCanvasRef.current) return;
      const canvas = activeCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getCanvasCoords(canvas, clientX, clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getCanvasCoords]
  );

  const endDraw = useCallback(() => {
    activeCanvasRef.current = null;
    setIsDrawing(false);
  }, []);

  const onMouseDownResp = (e: React.MouseEvent<HTMLCanvasElement>) =>
    startDraw(e.clientX, e.clientY, canvasRef);
  const onMouseDownVisore = (e: React.MouseEvent<HTMLCanvasElement>) =>
    startDraw(e.clientX, e.clientY, canvasVisoreRef);
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) =>
    draw(e.clientX, e.clientY);
  const onTouchStartResp = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) startDraw(t.clientX, t.clientY, canvasRef);
  };
  const onTouchStartVisore = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) startDraw(t.clientX, t.clientY, canvasVisoreRef);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) draw(t.clientX, t.clientY);
  };
  const onTouchEnd = () => endDraw();

  const clearFirma = (ref: React.RefObject<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const initCanvas = (ref: React.RefObject<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    if (presenzeLoading) return;
    const t = setTimeout(() => {
      initCanvas(canvasRef);
      initCanvas(canvasVisoreRef);
    }, 50);
    return () => clearTimeout(t);
  }, [presenzeLoading]);

  const canvasHasDrawing = (canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < id.length; i += 4)
      if (id[i] < 250 || id[i + 1] < 250 || id[i + 2] < 250) return true;
    return false;
  };

  const addFirmaToPdf = (
    doc: jsPDF,
    canvas: HTMLCanvasElement | null,
    x: number,
    y: number,
    label: string
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, x, y);
    y += 6;
    if (canvas && canvasHasDrawing(canvas)) {
      try {
        doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y - 3, 45, 22);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.text("[Firma non disponibile]", x, y + 5);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("[Firma non apposta]", x, y + 5);
    }
  };

  const generaPDF = () => {
    if (!cantiereId || !cantiereNome) return;
    setGenerando(true);
    try {
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

      const dataFmt = format(new Date(dataSelezionata), "dd/MM/yyyy", { locale: it });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DATA", pageW - marginR, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(dataFmt, pageW - marginR, y + 6, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text("CANTIERE", pageW - marginR, y + 14, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(cantiereNome, pageW - marginR, y + 20, { align: "right" });
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
      const descr = descrizioneLavori.trim() || "—";
      const descrLines = doc.splitTextToSize(descr, pageW - 2 * marginR);
      doc.text(descrLines, marginR, y);
      y += Math.max(descrLines.length * 5, 10) + 16;

      addFirmaToPdf(doc, canvasRef.current, marginR, y, "Firma Responsabile di cantiere");
      addFirmaToPdf(doc, canvasVisoreRef.current, pageW - marginR - 55, y, "Firma Visore Cliente");

      const nomeFile = `Rapportino_${dataSelezionata}_${cantiereNome.replace(/\s+/g, "_")}.pdf`;
      doc.save(nomeFile);
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Caricamento...</p>
      </div>
    );
  }

  if (cantieri.length === 0) {
    return (
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1>Genera Rapportino</h1>
          <a href="/responsabile" className={styles.backLink}>← Vista Cantiere</a>
        </header>
        <p className={styles.empty}>Non sei responsabile di nessun cantiere.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Genera Rapportino</h1>
          <p className={styles.subtitle}>
            Compila e genera il PDF per il giorno e cantiere selezionati
          </p>
        </div>
        <a href="/responsabile" className={styles.backLink}>← Vista Cantiere</a>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Data del giorno
          <input
            type="date"
            value={dataSelezionata}
            onChange={(e) => setDataSelezionata(e.target.value)}
          />
        </label>
        <label className={styles.filterLabel}>
          Cantiere
          <select
            value={cantiereId}
            onChange={(e) => setCantiereId(e.target.value)}
          >
            <option value="">Seleziona cantiere</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {presenzeLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Caricamento presenze...</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <p className={styles.tableCaption}>
              Dipendenti in servizio il {format(new Date(dataSelezionata), "dd/MM/yyyy", { locale: it })} – {cantiereNome || "—"}
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th colSpan={3}>MATTINA</th>
                  <th colSpan={3}>POMERIGGIO</th>
                  <th>Totale ore</th>
                </tr>
                <tr className={styles.subHead}>
                  <th></th>
                  <th>Entrata</th>
                  <th>Uscita</th>
                  <th>Ore</th>
                  <th>Entrata</th>
                  <th>Uscita</th>
                  <th>Ore</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {righe.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyCell}>
                      Nessuna presenza per questa data e cantiere. Seleziona un altro giorno o cantiere.
                    </td>
                  </tr>
                ) : (
                  righe.map((r, i) => (
                    <tr key={i}>
                      <td>{r.dipendente}</td>
                      <td>{r.mattinaEntrata}</td>
                      <td>{r.mattinaUscita}</td>
                      <td>{r.mattinaOre}</td>
                      <td>{r.pomeriggioEntrata}</td>
                      <td>{r.pomeriggioUscita}</td>
                      <td>{r.pomeriggioOre}</td>
                      <td>{r.totaleOre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.formSection}>
            <label className={styles.label}>
              Descrizione dei lavori (max {DESCrizione_MAX} caratteri)
              <textarea
                value={descrizioneLavori}
                onChange={(e) =>
                  setDescrizioneLavori(e.target.value.slice(0, DESCrizione_MAX))
                }
                maxLength={DESCrizione_MAX}
                rows={4}
                placeholder="Descrivi brevemente i lavori svolti..."
                className={styles.textarea}
              />
              <span className={styles.charCount}>
                {descrizioneLavori.length}/{DESCrizione_MAX}
              </span>
            </label>

            <div className={styles.firmeGrid}>
              <div className={styles.firmaSection}>
                <p className={styles.firmaLabel}>Firma Responsabile di cantiere</p>
                <p className={styles.firmaHint}>Disegna la firma nel riquadro</p>
                <div className={styles.canvasWrap}>
                  <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    onMouseDown={onMouseDownResp}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={onTouchStartResp}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{ touchAction: "none" }}
                  />
                </div>
                <button type="button" onClick={() => clearFirma(canvasRef)} className={styles.clearBtn}>
                  Cancella firma
                </button>
              </div>
              <div className={styles.firmaSection}>
                <p className={styles.firmaLabel}>Firma Visore Cliente</p>
                <p className={styles.firmaHint}>Disegna la firma nel riquadro</p>
                <div className={styles.canvasWrap}>
                  <canvas
                    ref={canvasVisoreRef}
                    className={styles.canvas}
                    onMouseDown={onMouseDownVisore}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={onTouchStartVisore}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{ touchAction: "none" }}
                  />
                </div>
                <button type="button" onClick={() => clearFirma(canvasVisoreRef)} className={styles.clearBtn}>
                  Cancella firma
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={generaPDF}
              disabled={generando || !cantiereId || righe.length === 0}
              className={styles.generateBtn}
            >
              {generando ? "Generazione PDF..." : "Genera Rapportino PDF"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
