# Mettere l’app in produzione su Vercel (link pubblico)

## 1. Codice su GitHub

Se non l’hai già fatto, crea un repository su GitHub e carica il progetto:

```bash
cd "/Users/miguel/timbratura-app copia"
git init
git add .
git commit -m "App timbratura"
```

Su GitHub: **New repository** → nome es. `timbratura-app` → Create. Poi:

```bash
git remote add origin https://github.com/TUO-USERNAME/timbratura-app.git
git branch -M main
git push -u origin main
```

(Al posto di TUO-USERNAME usa il tuo username GitHub.)

---

## 2. Deploy su Vercel

1. Vai su **https://vercel.com** e fai **Sign up** (puoi usare “Continue with GitHub”).
2. Clicca **Add New…** → **Project**.
3. **Import** il repository `timbratura-app` (se non lo vedi, connetti prima il tuo account GitHub a Vercel).
4. Prima di **Deploy** apri **Environment Variables** e aggiungi:

   | Nome          | Valore                                                                 |
   |---------------|-----------------------------------------------------------------------|
   | `DATABASE_URL` | La tua connection string Neon (come nel file `.env` locale)           |
   | `JWT_SECRET`   | Una stringa lunga e casuale (es. genera con: `openssl rand -base64 32`) |

   Imposta le variabili per **Production** (e opzionalmente Preview).

5. Clicca **Deploy**.

Dopo 1–2 minuti avrai un link pubblico tipo:  
**https://timbratura-app-xxx.vercel.app**

---

## 3. Dopo il primo deploy

- L’admin (Anna Lorusso / Cicci2023) è già nel database Neon che usi in produzione, quindi puoi accedere subito con quelle credenziali.
- Per un dominio personalizzato: su Vercel → progetto → **Settings** → **Domains**.

## 4. Aggiornare l’app in produzione

Ogni volta che fai `git push` su `main`, Vercel farà un nuovo deploy in automatico.
