"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./responsabile.module.css";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type CantiereOption = { id: string; nome: string; indirizzo: string | null };
type PresenzaRow = {
  id: string;
  tipo: string;
  createdAt: string;
  dipendenteId: string;
  dipendente: { id: string; nome: string; cognome: string };
  cantiere: { id: string; nome: string };
};

export default function ResponsabilePage() {
  const router = useRouter();
  const [cantieri, setCantieri] = useState<CantiereOption[]>([]);
  const [presenze, setPresenze] = useState<PresenzaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [presenzeLoading, setPresenzeLoading] = useState(false);
  const [dataSelezionata, setDataSelezionata] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [cantiereId, setCantiereId] = useState("");

  const loadCantieri = useCallback(async () => {
    const res = await fetch("/api/responsabile/cantieri");
    if (res.status === 403) {
      router.replace("/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setCantieri(data);
      if (data.length > 0) setCantiereId((prev) => prev || data[0].id);
    }
  }, [router]);

  const loadPresenze = useCallback(async () => {
    setPresenzeLoading(true);
    try {
      const params = new URLSearchParams({ data: dataSelezionata });
      if (cantiereId) params.set("cantiereId", cantiereId);
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

  const presenzeOrdinate = [...presenze].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const lastEntrataPerDip: Record<string, Date> = {};
  function getOreLavorate(row: PresenzaRow): string {
    if (row.tipo === "ENTRATA") {
      lastEntrataPerDip[row.dipendenteId] = new Date(row.createdAt);
      return "—";
    }
    const lastE = lastEntrataPerDip[row.dipendenteId];
    if (!lastE) return "—";
    const ore = (new Date(row.createdAt).getTime() - lastE.getTime()) / (1000 * 60 * 60);
    delete lastEntrataPerDip[row.dipendenteId];
    return `${Math.round(ore * 100) / 100} h`;
  }

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
          <h1>Vista Cantiere</h1>
          <a href="/dashboard" className={styles.backLink}>← Dashboard</a>
        </header>
        <p className={styles.empty}>Non sei responsabile di nessun cantiere. Contatta l&apos;admin.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Vista Cantiere</h1>
          <p className={styles.subtitle}>Entrate e uscite dei dipendenti per i cantieri di cui sei responsabile</p>
        </div>
        <div className={styles.headerLinks}>
          <a href="/responsabile/rapportino" className={styles.rapportinoLink}>Genera Rapportino</a>
          <a href="/responsabile/archivio" className={styles.backLink}>Archivio rapportini</a>
          <a href="/dashboard" className={styles.backLink}>← Dashboard</a>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Data
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
            <option value="">Tutti i cantieri</option>
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
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Data</th>
                <th>Ora</th>
                <th>Tipo</th>
                <th>Ore</th>
                <th>Cantiere</th>
              </tr>
            </thead>
            <tbody>
              {presenzeOrdinate.map((row) => (
                <tr key={row.id}>
                  <td>{row.dipendente.cognome} {row.dipendente.nome}</td>
                  <td>{format(new Date(row.createdAt), "dd/MM/yyyy", { locale: it })}</td>
                  <td>{format(new Date(row.createdAt), "HH:mm:ss", { locale: it })}</td>
                  <td>
                    <span className={row.tipo === "ENTRATA" ? styles.badgeEntrata : styles.badgeUscita}>
                      {row.tipo}
                    </span>
                  </td>
                  <td>{getOreLavorate(row)}</td>
                  <td>{row.cantiere.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {presenze.length === 0 && (
            <p className={styles.empty}>
              Nessuna presenza per la data e il cantiere selezionati.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
