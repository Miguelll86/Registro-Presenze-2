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

type RigaRapportino = {
  dipendente: string;
  entrata: string;
  uscita: string;
  totaleOre: string;
};

const DESCrizione_MAX = 300;

function aggregatePresenze(presenze: PresenzaRow[]): RigaRapportino[] {
  const sorted = [...presenze].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const byDip: Record<
    string,
    { nome: string; entrata: string; uscita: string; totale: number }
  > = {};
  const lastEntrata: Record<string, Date> = {};

  for (const row of sorted) {
    const key = row.dipendenteId;
    const nome = `${row.dipendente.cognome} ${row.dipendente.nome}`;
    if (!byDip[key]) {
      byDip[key] = { nome, entrata: "—", uscita: "—", totale: 0 };
    }
    if (row.tipo === "ENTRATA") {
      lastEntrata[key] = new Date(row.createdAt);
      byDip[key].entrata = format(new Date(row.createdAt), "HH:mm", { locale: it });
    } else {
      byDip[key].uscita = format(new Date(row.createdAt), "HH:mm", { locale: it });
      const lastE = lastEntrata[key];
      if (lastE) {
        const ore =
          (new Date(row.createdAt).getTime() - lastE.getTime()) / (1000 * 60 * 60);
        byDip[key].totale += ore;
        delete lastEntrata[key];
      }
    }
  }

  return Object.values(byDip).map((r) => ({
    dipendente: r.nome,
    entrata: r.entrata,
    uscita: r.uscita,
    totaleOre: r.totale > 0 ? `${Math.round(r.totale * 100) / 100} h` : "—",
  }));
}

export default function RapportinoPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const draw = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getCanvasCoords(clientX, clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getCanvasCoords]
  );

  const startDraw = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getCanvasCoords(clientX, clientY);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCanvasCoords]
  );

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) =>
    startDraw(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) =>
    draw(e.clientX, e.clientY);
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) startDraw(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) draw(t.clientX, t.clientY);
  };
  const onTouchEnd = () => endDraw();

  const clearFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
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
  }, []);

  const generaPDF = () => {
    if (!cantiereId || !cantiereNome) return;
    setGenerando(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.getPageWidth();
      let y = 18;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("LC INSTALLATION SRL", pageW / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Rapportino giornaliero", pageW / 2, y, { align: "center" });
      y += 14;

      const dataFmt = format(new Date(dataSelezionata), "dd/MM/yyyy", { locale: it });
      autoTable(doc, {
        startY: y,
        head: [["Data", "Cantiere", "Dipendente", "Entrata", "Uscita", "Totale ore"]],
        body: righe.map((r) => [
          dataFmt,
          cantiereNome,
          r.dipendente,
          r.entrata,
          r.uscita,
          r.totaleOre,
        ]),
        theme: "grid",
        headStyles: { fillColor: [66, 66, 66], fontStyle: "bold" },
        margin: { left: 14, right: 14 },
      });
      const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
      y = (docWithTable.lastAutoTable?.finalY ?? y) + 14;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Descrizione dei lavori", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const descr = descrizioneLavori.trim() || "—";
      const descrLines = doc.splitTextToSize(descr, pageW - 28);
      doc.text(descrLines, 14, y);
      y += Math.max(descrLines.length * 5, 10) + 14;

      doc.setFont("helvetica", "bold");
      doc.text("Firma del responsabile", 14, y);
      y += 8;

      const canvas = canvasRef.current;
      let hasDrawn = false;
      if (canvas) {
        try {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const id = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < id.length; i += 4)
              if (id[i] < 250 || id[i + 1] < 250 || id[i + 2] < 250) {
                hasDrawn = true;
                break;
              }
          }
          if (hasDrawn) {
            const dataUrl = canvas.toDataURL("image/png");
            doc.addImage(dataUrl, "PNG", 14, y - 5, 50, 25);
          }
        } catch {
          doc.setFont("helvetica", "italic");
          doc.text("[Firma non disponibile]", 14, y);
        }
      }
      if (!hasDrawn) {
        doc.setFont("helvetica", "italic");
        doc.text("[Firma non apposta]", 14, y);
      }

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
                  <th>Entrata</th>
                  <th>Uscita</th>
                  <th>Totale ore</th>
                </tr>
              </thead>
              <tbody>
                {righe.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>
                      Nessuna presenza per questa data e cantiere. Seleziona un altro giorno o cantiere.
                    </td>
                  </tr>
                ) : (
                  righe.map((r, i) => (
                    <tr key={i}>
                      <td>{r.dipendente}</td>
                      <td>{r.entrata}</td>
                      <td>{r.uscita}</td>
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

            <div className={styles.firmaSection}>
              <p className={styles.firmaLabel}>Firma del responsabile</p>
              <p className={styles.firmaHint}>Disegna la firma nel riquadro sotto</p>
              <div className={styles.canvasWrap}>
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  style={{ touchAction: "none" }}
                />
              </div>
              <button
                type="button"
                onClick={clearFirma}
                className={styles.clearBtn}
              >
                Cancella firma
              </button>
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
