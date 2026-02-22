"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";

type DipendenteRow = {
  id: string;
  nome: string;
  cognome: string;
  role: string;
  createdAt: string;
  _count: { timbrature: number };
};

type CantiereRow = {
  id: string;
  nome: string;
  indirizzo: string | null;
  responsabileId: string | null;
  responsabile: { id: string; nome: string; cognome: string } | null;
  _count: { assegnazioni: number };
};

type AssegnazioneRow = {
  id: string;
  dataInizio: string;
  dataFine: string;
  dipendente: { id: string; nome: string; cognome: string };
  cantiere: { id: string; nome: string };
};

type PresenzaRow = {
  id: string;
  tipo: string;
  latitudine: number;
  longitudine: number;
  indirizzo: string | null;
  citta: string | null;
  createdAt: string;
  dipendenteId: string;
  dipendente: { id: string; nome: string; cognome: string };
  cantiere?: { id: string; nome: string } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [dipendenti, setDipendenti] = useState<DipendenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    password: "",
    nome: "",
    cognome: "",
    role: "DIPENDENTE",
  });

  const [tab, setTab] = useState<"dipendenti" | "presenze" | "cantieri" | "assegnazioni">("dipendenti");
  const [presenze, setPresenze] = useState<PresenzaRow[]>([]);
  const [presenzeLoading, setPresenzeLoading] = useState(false);
  const [filtriPresenze, setFiltriPresenze] = useState({
    dipendenteId: "",
    da: format(new Date(), "yyyy-MM-01"),
    a: format(new Date(), "yyyy-MM-dd"),
  });

  const [cantieri, setCantieri] = useState<CantiereRow[]>([]);
  const [cantieriLoading, setCantieriLoading] = useState(false);
  const [formCantiereOpen, setFormCantiereOpen] = useState(false);
  const [editingCantiereId, setEditingCantiereId] = useState<string | null>(null);
  const [formCantiere, setFormCantiere] = useState({ nome: "", indirizzo: "", responsabileId: "" });
  const [errorCantiere, setErrorCantiere] = useState("");

  const [assegnazioni, setAssegnazioni] = useState<AssegnazioneRow[]>([]);
  const [assegnazioniLoading, setAssegnazioniLoading] = useState(false);
  const [filtroAssegnazioni, setFiltroAssegnazioni] = useState({
    settimana: format(new Date(), "yyyy-MM-dd"),
    cantiereId: "",
  });
  const [formAssegnazioneOpen, setFormAssegnazioneOpen] = useState(false);
  const [editingAssegnazioneId, setEditingAssegnazioneId] = useState<string | null>(null);
  const [formAssegnazione, setFormAssegnazione] = useState({
    dipendenteId: "",
    cantiereId: "",
    dataInizio: format(new Date(), "yyyy-MM-dd"),
    dataFine: format(new Date(), "yyyy-MM-dd"),
  });
  const [errorAssegnazione, setErrorAssegnazione] = useState("");

  const loadDipendenti = useCallback(async () => {
    const res = await fetch("/api/admin/dipendenti");
    if (res.status === 403) {
      setIsAdmin(false);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setDipendenti(data);
    setIsAdmin(true);
  }, []);

  const loadPresenze = useCallback(async () => {
    setPresenzeLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtriPresenze.dipendenteId) params.set("dipendenteId", filtriPresenze.dipendenteId);
      if (filtriPresenze.da) params.set("da", filtriPresenze.da);
      if (filtriPresenze.a) params.set("a", filtriPresenze.a);
      const res = await fetch(`/api/admin/presenze?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPresenze(data);
      } else setPresenze([]);
    } finally {
      setPresenzeLoading(false);
    }
  }, [filtriPresenze.dipendenteId, filtriPresenze.da, filtriPresenze.a]);

  const loadCantieri = useCallback(async () => {
    setCantieriLoading(true);
    try {
      const res = await fetch("/api/admin/cantieri");
      if (res.ok) {
        const data = await res.json();
        setCantieri(data);
      } else setCantieri([]);
    } finally {
      setCantieriLoading(false);
    }
  }, []);

  const loadAssegnazioni = useCallback(async () => {
    setAssegnazioniLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("settimana", filtroAssegnazioni.settimana);
      if (filtroAssegnazioni.cantiereId) params.set("cantiereId", filtroAssegnazioni.cantiereId);
      const res = await fetch(`/api/admin/assegnazioni?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssegnazioni(data);
      } else setAssegnazioni([]);
    } finally {
      setAssegnazioniLoading(false);
    }
  }, [filtroAssegnazioni.settimana, filtroAssegnazioni.cantiereId]);

  useEffect(() => {
    (async () => {
      await loadDipendenti();
      setLoading(false);
    })();
  }, [loadDipendenti]);

  useEffect(() => {
    if (isAdmin && tab === "presenze") loadPresenze();
  }, [isAdmin, tab, loadPresenze]);

  useEffect(() => {
    if (isAdmin && tab === "cantieri") loadCantieri();
  }, [isAdmin, tab, loadCantieri]);

  useEffect(() => {
    if (isAdmin && tab === "assegnazioni") loadAssegnazioni();
  }, [isAdmin, tab, loadAssegnazioni]);

  useEffect(() => {
    if (!loading && !isAdmin && dipendenti.length === 0) {
      router.replace("/dashboard");
    }
  }, [loading, isAdmin, dipendenti.length, router]);

  function openCreate() {
    setEditingId(null);
    setForm({ password: "", nome: "", cognome: "", role: "DIPENDENTE" });
    setError("");
    setFormOpen(true);
  }

  function openEdit(d: DipendenteRow) {
    setEditingId(d.id);
    setForm({
      password: "",
      nome: d.nome,
      cognome: d.cognome,
      role: d.role,
    });
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, string> = {
          nome: form.nome,
          cognome: form.cognome,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/admin/dipendenti/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Errore aggiornamento");
          return;
        }
        await loadDipendenti();
        setFormOpen(false);
      } else {
        const res = await fetch("/api/admin/dipendenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Errore creazione");
          return;
        }
        await loadDipendenti();
        setFormOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo dipendente? Verranno eliminate anche tutte le sue timbrature.")) return;
    const res = await fetch(`/api/admin/dipendenti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione");
      return;
    }
    await loadDipendenti();
  }

  function handleExportPresenze() {
    const params = new URLSearchParams();
    if (filtriPresenze.dipendenteId) params.set("dipendenteId", filtriPresenze.dipendenteId);
    if (filtriPresenze.da) params.set("da", filtriPresenze.da);
    if (filtriPresenze.a) params.set("a", filtriPresenze.a);
    window.open(`/api/admin/presenze/export?${params.toString()}`, "_blank");
  }

  function openCreateCantiere() {
    setEditingCantiereId(null);
    setFormCantiere({ nome: "", indirizzo: "", responsabileId: "" });
    setErrorCantiere("");
    setFormCantiereOpen(true);
  }

  function openEditCantiere(c: CantiereRow) {
    setEditingCantiereId(c.id);
    setFormCantiere({
      nome: c.nome,
      indirizzo: c.indirizzo || "",
      responsabileId: c.responsabileId || "",
    });
    setErrorCantiere("");
    setFormCantiereOpen(true);
  }

  async function handleSubmitCantiere(e: React.FormEvent) {
    e.preventDefault();
    setErrorCantiere("");
    try {
      if (editingCantiereId) {
        const res = await fetch(`/api/admin/cantieri/${editingCantiereId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: formCantiere.nome,
            indirizzo: formCantiere.indirizzo || null,
            responsabileId: formCantiere.responsabileId || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorCantiere(data.error || "Errore aggiornamento");
          return;
        }
        await loadCantieri();
        setFormCantiereOpen(false);
      } else {
        const res = await fetch("/api/admin/cantieri", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: formCantiere.nome,
            indirizzo: formCantiere.indirizzo || null,
            responsabileId: formCantiere.responsabileId || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorCantiere(data.error || "Errore creazione");
          return;
        }
        await loadCantieri();
        setFormCantiereOpen(false);
      }
    } catch {
      setErrorCantiere("Errore di connessione");
    }
  }

  async function handleDeleteCantiere(id: string) {
    if (!confirm("Eliminare questo cantiere? Le assegnazioni collegate verranno eliminate.")) return;
    const res = await fetch(`/api/admin/cantieri/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione");
      return;
    }
    await loadCantieri();
  }

  function getSettimanaDates(d: Date) {
    const lun = startOfWeek(d, { weekStartsOn: 1 });
    const dom = endOfWeek(d, { weekStartsOn: 1 });
    return { dataInizio: format(lun, "yyyy-MM-dd"), dataFine: format(dom, "yyyy-MM-dd") };
  }

  function openCreateAssegnazione() {
    setEditingAssegnazioneId(null);
    const { dataInizio, dataFine } = getSettimanaDates(new Date());
    setFormAssegnazione({
      dipendenteId: "",
      cantiereId: "",
      dataInizio,
      dataFine,
    });
    setErrorAssegnazione("");
    setFormAssegnazioneOpen(true);
  }

  function openEditAssegnazione(a: AssegnazioneRow) {
    setEditingAssegnazioneId(a.id);
    setFormAssegnazione({
      dipendenteId: a.dipendente.id,
      cantiereId: a.cantiere.id,
      dataInizio: format(new Date(a.dataInizio), "yyyy-MM-dd"),
      dataFine: format(new Date(a.dataFine), "yyyy-MM-dd"),
    });
    setErrorAssegnazione("");
    setFormAssegnazioneOpen(true);
  }

  async function handleSubmitAssegnazione(e: React.FormEvent) {
    e.preventDefault();
    setErrorAssegnazione("");
    try {
      if (editingAssegnazioneId) {
        const res = await fetch(`/api/admin/assegnazioni/${editingAssegnazioneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAssegnazione),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorAssegnazione(data.error || "Errore aggiornamento");
          return;
        }
        await loadAssegnazioni();
        setFormAssegnazioneOpen(false);
      } else {
        const res = await fetch("/api/admin/assegnazioni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAssegnazione),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorAssegnazione(data.error || "Errore creazione");
          return;
        }
        await loadAssegnazioni();
        setFormAssegnazioneOpen(false);
      }
    } catch {
      setErrorAssegnazione("Errore di connessione");
    }
  }

  async function handleDeleteAssegnazione(id: string) {
    if (!confirm("Rimuovere questa assegnazione?")) return;
    const res = await fetch(`/api/admin/assegnazioni/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore");
      return;
    }
    await loadAssegnazioni();
  }

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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Admin</h1>
          <p className={styles.subtitle}>
            {tab === "dipendenti" && "Gestione dipendenti e ruoli"}
            {tab === "presenze" && "Controlla entrate e uscite di tutti i dipendenti"}
            {tab === "cantieri" && "Gestione cantieri e responsabili"}
            {tab === "assegnazioni" && "Assegnazioni settimanali dipendenti–cantieri"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <a href="/dashboard" className={styles.backLink}>← Dashboard</a>
          {tab === "dipendenti" && (
            <button type="button" onClick={openCreate} className={styles.addBtn}>
              Aggiungi dipendente
            </button>
          )}
          {tab === "presenze" && (
            <button type="button" onClick={handleExportPresenze} className={styles.addBtn}>
              Esporta Excel
            </button>
          )}
          {tab === "cantieri" && (
            <button type="button" onClick={openCreateCantiere} className={styles.addBtn}>
              Nuovo cantiere
            </button>
          )}
          {tab === "assegnazioni" && (
            <button type="button" onClick={openCreateAssegnazione} className={styles.addBtn}>
              Nuova assegnazione
            </button>
          )}
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === "dipendenti" ? styles.tabActive : styles.tab}
          onClick={() => setTab("dipendenti")}
        >
          Dipendenti
        </button>
        <button
          type="button"
          className={tab === "presenze" ? styles.tabActive : styles.tab}
          onClick={() => setTab("presenze")}
        >
          Presenze
        </button>
        <button
          type="button"
          className={tab === "cantieri" ? styles.tabActive : styles.tab}
          onClick={() => setTab("cantieri")}
        >
          Cantieri
        </button>
        <button
          type="button"
          className={tab === "assegnazioni" ? styles.tabActive : styles.tab}
          onClick={() => setTab("assegnazioni")}
        >
          Assegnazioni
        </button>
      </div>

      {tab === "dipendenti" && formOpen && (
        <div className={styles.modalOverlay} onClick={() => setFormOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Modifica dipendente" : "Nuovo dipendente"}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <label>
                Nome
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                  placeholder="Mario"
                />
              </label>
              <label>
                Cognome
                <input
                  type="text"
                  value={form.cognome}
                  onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))}
                  required
                  placeholder="Rossi"
                />
              </label>
              <label>
                Password {editingId && "(lascia vuoto per non cambiare)"}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editingId}
                  placeholder="••••••••"
                  minLength={6}
                />
              </label>
              <label>
                Ruolo
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="DIPENDENTE">Dipendente</option>
                  <option value="RESPONSABILE_CANTIERE">Responsabile di Cantiere</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setFormOpen(false)} className={styles.cancelBtn}>
                  Annulla
                </button>
                <button type="submit" disabled={saving} className={styles.submitBtn}>
                  {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "dipendenti" && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cognome</th>
                <th>Nome</th>
                <th>Ruolo</th>
                <th>Presenze</th>
                <th>Registrato il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id}>
                  <td>{d.cognome}</td>
                  <td>{d.nome}</td>
                  <td>
                    <span className={d.role === "ADMIN" ? styles.badgeAdmin : d.role === "RESPONSABILE_CANTIERE" ? styles.badgeResponsabile : styles.badgeDipendente}>
                      {d.role === "ADMIN" ? "Admin" : d.role === "RESPONSABILE_CANTIERE" ? "Responsabile Cantiere" : "Dipendente"}
                    </span>
                  </td>
                  <td>{d._count.timbrature}</td>
                  <td>{format(new Date(d.createdAt), "dd/MM/yyyy", { locale: it })}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => openEdit(d)} className={styles.editBtn}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className={styles.deleteBtn}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dipendenti.length === 0 && (
            <p className={styles.empty}>Nessun dipendente. Clicca &quot;Aggiungi dipendente&quot;.</p>
          )}
        </div>
      )}

      {tab === "presenze" && (
        <>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              Dipendente
              <select
                value={filtriPresenze.dipendenteId}
                onChange={(e) =>
                  setFiltriPresenze((f) => ({ ...f, dipendenteId: e.target.value }))
                }
              >
                <option value="">Tutti</option>
                {dipendenti.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.cognome} {d.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterLabel}>
              Da
              <input
                type="date"
                value={filtriPresenze.da}
                onChange={(e) => setFiltriPresenze((f) => ({ ...f, da: e.target.value }))}
              />
            </label>
            <label className={styles.filterLabel}>
              A
              <input
                type="date"
                value={filtriPresenze.a}
                onChange={(e) => setFiltriPresenze((f) => ({ ...f, a: e.target.value }))}
              />
            </label>
            <button type="button" onClick={loadPresenze} className={styles.filterBtn}>
              Applica
            </button>
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
                    <th>Indirizzo</th>
                    <th>Città</th>
                  </tr>
                </thead>
                <tbody>
                  {presenzeOrdinate.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.dipendente.cognome} {row.dipendente.nome}
                      </td>
                      <td>{format(new Date(row.createdAt), "dd/MM/yyyy", { locale: it })}</td>
                      <td>{format(new Date(row.createdAt), "HH:mm:ss", { locale: it })}</td>
                      <td>
                        <span
                          className={
                            row.tipo === "ENTRATA" ? styles.badgeEntrata : styles.badgeUscita
                          }
                        >
                          {row.tipo}
                        </span>
                      </td>
                      <td>{getOreLavorate(row)}</td>
                      <td>{row.cantiere?.nome ?? "—"}</td>
                      <td className={styles.cellSmall}>{row.indirizzo || "—"}</td>
                      <td>{row.citta || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {presenze.length === 0 && (
                <p className={styles.empty}>
                  Nessuna presenza nel periodo selezionato. Modifica i filtri e clicca Applica.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {tab === "cantieri" && formCantiereOpen && (
        <div className={styles.modalOverlay} onClick={() => setFormCantiereOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingCantiereId ? "Modifica cantiere" : "Nuovo cantiere"}</h2>
            <form onSubmit={handleSubmitCantiere} className={styles.form}>
              {errorCantiere && <div className={styles.error}>{errorCantiere}</div>}
              <label>
                Nome cantiere
                <input
                  type="text"
                  value={formCantiere.nome}
                  onChange={(e) => setFormCantiere((f) => ({ ...f, nome: e.target.value }))}
                  required
                  placeholder="Cantiere Via Roma"
                />
              </label>
              <label>
                Indirizzo (opzionale)
                <input
                  type="text"
                  value={formCantiere.indirizzo}
                  onChange={(e) => setFormCantiere((f) => ({ ...f, indirizzo: e.target.value }))}
                  placeholder="Via Roma 1, Milano"
                />
              </label>
              <label>
                Responsabile di cantiere (opzionale)
                <select
                  value={formCantiere.responsabileId}
                  onChange={(e) => setFormCantiere((f) => ({ ...f, responsabileId: e.target.value }))}
                >
                  <option value="">Nessuno</option>
                  {dipendenti.filter((d) => d.role === "RESPONSABILE_CANTIERE").map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.cognome} {d.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setFormCantiereOpen(false)} className={styles.cancelBtn}>
                  Annulla
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingCantiereId ? "Salva" : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "cantieri" && (
        cantieriLoading ? (
          <div className={styles.loading}><div className={styles.spinner} /><p>Caricamento cantieri...</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Indirizzo</th>
                  <th>Responsabile</th>
                  <th>Assegnazioni</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cantieri.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td className={styles.cellSmall}>{c.indirizzo || "—"}</td>
                    <td>{c.responsabile ? `${c.responsabile.cognome} ${c.responsabile.nome}` : "—"}</td>
                    <td>{c._count.assegnazioni}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" onClick={() => openEditCantiere(c)} className={styles.editBtn}>Modifica</button>
                        <button type="button" onClick={() => handleDeleteCantiere(c.id)} className={styles.deleteBtn}>Elimina</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cantieri.length === 0 && (
              <p className={styles.empty}>Nessun cantiere. Clicca &quot;Nuovo cantiere&quot;.</p>
            )}
          </div>
        )
      )}

      {tab === "assegnazioni" && formAssegnazioneOpen && (
        <div className={styles.modalOverlay} onClick={() => setFormAssegnazioneOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingAssegnazioneId ? "Modifica assegnazione" : "Nuova assegnazione"}</h2>
            <form onSubmit={handleSubmitAssegnazione} className={styles.form}>
              {errorAssegnazione && <div className={styles.error}>{errorAssegnazione}</div>}
              <label>
                Dipendente
                <select
                  value={formAssegnazione.dipendenteId}
                  onChange={(e) => setFormAssegnazione((f) => ({ ...f, dipendenteId: e.target.value }))}
                  required
                  disabled={!!editingAssegnazioneId}
                >
                  <option value="">Seleziona...</option>
                  {dipendenti.filter((d) => d.role === "DIPENDENTE").map((d) => (
                    <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                Cantiere
                <select
                  value={formAssegnazione.cantiereId}
                  onChange={(e) => setFormAssegnazione((f) => ({ ...f, cantiereId: e.target.value }))}
                  required
                >
                  <option value="">Seleziona...</option>
                  {cantieri.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                Data inizio
                <input
                  type="date"
                  value={formAssegnazione.dataInizio}
                  onChange={(e) => setFormAssegnazione((f) => ({ ...f, dataInizio: e.target.value }))}
                  required
                />
              </label>
              <label>
                Data fine
                <input
                  type="date"
                  value={formAssegnazione.dataFine}
                  onChange={(e) => setFormAssegnazione((f) => ({ ...f, dataFine: e.target.value }))}
                  required
                />
              </label>
              <p className={styles.formHint}>Puoi assegnare anche un solo giorno (stessa data inizio e fine) o cambiare cantiere a metà settimana.</p>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setFormAssegnazioneOpen(false)} className={styles.cancelBtn}>Annulla</button>
                <button type="submit" className={styles.submitBtn}>{editingAssegnazioneId ? "Salva" : "Aggiungi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "assegnazioni" && (
        <>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              Settimana (data)
              <input
                type="date"
                value={filtroAssegnazioni.settimana}
                onChange={(e) => setFiltroAssegnazioni((f) => ({ ...f, settimana: e.target.value }))}
              />
            </label>
            <label className={styles.filterLabel}>
              Cantiere
              <select
                value={filtroAssegnazioni.cantiereId}
                onChange={(e) => setFiltroAssegnazioni((f) => ({ ...f, cantiereId: e.target.value }))}
              >
                <option value="">Tutti</option>
                {cantieri.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={loadAssegnazioni} className={styles.filterBtn}>Applica</button>
          </div>
          {assegnazioniLoading ? (
            <div className={styles.loading}><div className={styles.spinner} /><p>Caricamento...</p></div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dipendente</th>
                    <th>Cantiere</th>
                    <th>Da – A</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assegnazioni.map((a) => (
                    <tr key={a.id}>
                      <td>{a.dipendente.cognome} {a.dipendente.nome}</td>
                      <td>{a.cantiere.nome}</td>
                      <td>{format(new Date(a.dataInizio), "dd/MM/yyyy", { locale: it })} – {format(new Date(a.dataFine), "dd/MM/yyyy", { locale: it })}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button type="button" onClick={() => openEditAssegnazione(a)} className={styles.editBtn}>Modifica</button>
                          <button type="button" onClick={() => handleDeleteAssegnazione(a.id)} className={styles.deleteBtn}>Rimuovi</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assegnazioni.length === 0 && (
                <p className={styles.empty}>Nessuna assegnazione per i filtri selezionati.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
