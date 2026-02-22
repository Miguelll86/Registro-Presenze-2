# Push su GitHub – Istruzioni

Sul tuo Mac, apri **Terminale** e esegui i comandi **nella cartella del progetto**.

---

## Passo 1 – Vai nella cartella

```bash
cd /Users/miguel/timbratura-app
```

---

## Passo 2 – Prendi il token GitHub

- Vai su **https://github.com/settings/tokens**
- Se non ce l’hai: **Generate new token (classic)** → spunta **repo** → Generate → **copia il token** (inizia con `ghp_...`)

---

## Passo 3 – Imposta il remote (sostituisci il token)

**Sostituisci `GHP_IL_TUO_TOKEN_QUI`** con il token che hai copiato (senza spazi).

Copia tutto il comando qui sotto, incollalo nel terminale, **modifica la parte del token**, poi premi Invio:

```bash
git remote set-url origin https://Miguelll86:GHP_IL_TUO_TOKEN_QUI@github.com/Miguelll86/Registro-Presenze.git
```

Esempio (se il token fosse `ghp_abc123xyz`):
```bash
git remote set-url origin https://Miguelll86:ghp_abc123xyz@github.com/Miguelll86/Registro-Presenze.git
```

---

## Passo 4 – Push

```bash
git push origin main
```

Dovresti vedere qualcosa tipo: `Writing objects: 100%` e poi `done`.

---

## Passo 5 – Togli il token dal remote (sicurezza)

```bash
git remote set-url origin https://github.com/Miguelll86/Registro-Presenze.git
```

---

## Verifica

Apri **https://github.com/Miguelll86/Registro-Presenze** e aggiorna la pagina: dovresti vedere **package.json**, **src**, **prisma**, **vercel.json** nella root (non solo il README).

Poi su Vercel partirà un nuovo deploy da solo.
