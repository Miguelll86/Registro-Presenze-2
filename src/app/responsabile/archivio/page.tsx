"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../responsabile.module.css";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { buildRapportinoPdf, buildRapportinoPeriodoPdf, type RigaRapportino } from "../rapportino/buildPdf";

type CantiereOption = { id: string; nome: string };
type RapportinoRow = {
  id: string;
  data: string;
  dataFine: string | null;
  descrizioneLavori: string | null;
  createdAt: string;
  cantiereId: string;
  cantiere: { id: string; nome: string };
  responsabile: { id: string; nome: string; cognome: string };
};
type RapportinoFull = RapportinoRow & {
  firmaResponsabile: string | null;
  firmaVisore: string | null;
  righe: RigaRapportino[] | { giorni: { data: string; righe: RigaRapportino[] }[] };
};

export default function ArchivioRapportiniPage() {
  const router = useRouter();
  const [cantieri, setCantieri] = useState<CantiereOption[]>([]);
  const [rapportini, setRapportini] = useState<RapportinoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [filtri, setFiltri] = useState({
    dataDa: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    dataA: format(new Date(), "yyyy-MM-dd"),
    cantiereId: "",
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadCantieri = useCallback(async () => {
    const res = await fetch("/api/responsabile/cantieri");
    if (res.status === 403) {
      router.replace("/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCantieri(data.map((c: CantiereOption) => ({ id: c.id, nome: c.nome })));
    }
  }, [router]);

  const loadRapportini = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtri.dataDa) params.set("dataDa", filtri.dataDa);
      if (filtri.dataA) params.set("dataA", filtri.dataA);
      if (filtri.cantiereId) params.set("cantiereId", filtri.cantiereId);
      const res = await fetch(`/api/responsabile/rapportini?${params.toString()}`);
      if (res.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRapportini(data);
      } else setRapportini([]);
    } finally {
      setListLoading(false);
    }
  }, [filtri.dataDa, filtri.dataA, filtri.cantiereId, router]);

  useEffect(() => {
    (async () => {
      await loadCantieri();
      setLoading(false);
    })();
  }, [loadCantieri]);

  useEffect(() => {
    if (!loading) loadRapportini();
  }, [loading, loadRapportini]);

  const handleScaricaPdf = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/responsabile/rapportini/${id}`);
      if (!res.ok) throw new Error("Rapportino non trovato");
      const r: RapportinoFull = await res.json();
      const isPeriodo = r.dataFine != null && typeof r.righe === "object" && "giorni" in r.righe && Array.isArray((r.righe as { giorni: unknown[] }).giorni);
      if (isPeriodo) {
        const righePeriodo = r.righe as { giorni: { data: string; righe: RigaRapportino[] }[] };
        const dataDaFmt = format(new Date(r.data), "dd/MM/yyyy", { locale: it });
        const dataAFmt = format(new Date(r.dataFine!), "dd/MM/yyyy", { locale: it });
        const giorni = righePeriodo.giorni.map((g) => ({
          dataFmt: format(new Date(g.data), "dd/MM/yyyy", { locale: it }),
          righe: g.righe,
        }));
        const doc = buildRapportinoPeriodoPdf({
          dataDaFmt,
          dataAFmt,
          cantiereNome: r.cantiere.nome,
          giorni,
          descrizioneLavori: r.descrizioneLavori || "",
          firmaResponsabileDataUrl: r.firmaResponsabile,
          firmaVisoreDataUrl: r.firmaVisore,
        });
        doc.save(`Rapportino_periodo_${format(new Date(r.data), "yyyy-MM-dd")}_${format(new Date(r.dataFine!), "yyyy-MM-dd")}_${r.cantiere.nome.replace(/\s+/g, "_")}.pdf`);
      } else {
        const righeGiornaliero = Array.isArray(r.righe) ? r.righe : [];
        const dataFmt = format(new Date(r.data), "dd/MM/yyyy", { locale: it });
        const doc = buildRapportinoPdf({
          dataFmt,
          cantiereNome: r.cantiere.nome,
          righe: righeGiornaliero,
          descrizioneLavori: r.descrizioneLavori || "",
          firmaResponsabileDataUrl: r.firmaResponsabile,
          firmaVisoreDataUrl: r.firmaVisore,
        });
        const dataStr = format(new Date(r.data), "yyyy-MM-dd");
        doc.save(`Rapportino_${dataStr}_${r.cantiere.nome.replace(/\s+/g, "_")}.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert("Errore nel download del PDF");
    } finally {
      setDownloadingId(null);
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

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Archivio rapportini</h1>
          <p className={styles.subtitle}>
            Archivio giornaliero dei rapportini per cantiere. Filtra e scarica il PDF.
          </p>
        </div>
        <div className={styles.headerLinks}>
          <a href="/responsabile/rapportino" className={styles.rapportinoLink}>
            Genera Rapportino
          </a>
          <a href="/responsabile" className={styles.backLink}>
            ← Vista Cantiere
          </a>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Data da
          <input
            type="date"
            value={filtri.dataDa}
            onChange={(e) => setFiltri((f) => ({ ...f, dataDa: e.target.value }))}
          />
        </label>
        <label className={styles.filterLabel}>
          Data a
          <input
            type="date"
            value={filtri.dataA}
            onChange={(e) => setFiltri((f) => ({ ...f, dataA: e.target.value }))}
          />
        </label>
        <label className={styles.filterLabel}>
          Cantiere
          <select
            value={filtri.cantiereId}
            onChange={(e) => setFiltri((f) => ({ ...f, cantiereId: e.target.value }))}
          >
            <option value="">Tutti</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={loadRapportini} className={styles.filterBtn}>
          Applica
        </button>
      </div>

      {listLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Caricamento archivio...</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cantiere</th>
                <th>Creato il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rapportini.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    Nessun rapportino nel periodo. Genera un rapportino dalla pagina &quot;Genera
                    Rapportino&quot;.
                  </td>
                </tr>
              ) : (
                rapportini.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.dataFine
                        ? `Dal ${format(new Date(r.data), "dd/MM/yyyy", { locale: it })} al ${format(new Date(r.dataFine), "dd/MM/yyyy", { locale: it })}`
                        : format(new Date(r.data), "dd/MM/yyyy", { locale: it })}
                    </td>
                    <td>{r.cantiere.nome}</td>
                    <td>
                      {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleScaricaPdf(r.id)}
                        disabled={downloadingId !== null}
                        className={styles.rapportinoLink}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                      >
                        {downloadingId === r.id ? "..." : "Scarica PDF"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
