# Setup database (Neon.tech – gratuito)

## 1. Crea il database su Neon

1. Vai su **https://neon.tech** e clicca **Sign up** (puoi usare GitHub o email).
2. Dopo il login, clicca **New Project**.
3. Scegli un nome (es. `timbratura`) e la regione (es. Europe).
4. Clicca **Create project**.
5. Nella schermata del progetto trovi la **Connection string**. Clicca su **Connection string** e seleziona **Prisma** (o copia quella che inizia con `postgresql://`).

## 2. Configura il file .env

1. Apri il file **`.env`** nella root del progetto.
2. Sostituisci la riga `DATABASE_URL` con la connection string copiata da Neon. Esempio:
   ```
   DATABASE_URL="postgresql://nome_utente:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
   (la tua sarà diversa: copiala così com’è da Neon).

## 3. Crea le tabelle e l’admin

Nel terminale, dalla cartella del progetto:

```bash
npx prisma db push
npm run db:seed
```

## 4. Accedi all’app

- Avvia (o riavvia) il server: `npm run dev`
- Apri **http://localhost:3000**
- Login con l’admin creato dallo seed:
  - **Nome:** Anna  
  - **Cognome:** Lorusso  
  - **Password:** Cicci2023  

Poi da **Admin** puoi creare cantieri, dipendenti e assegnazioni.
