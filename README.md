# Piano della Performance Organizzativa 2025-2027 — Regione Molise

Portale web per la compilazione, archiviazione e analisi delle schede obiettivi del Piano della Performance Organizzativa della Regione Molise, triennio 2025-2027 (DGR n. 149 del 26/05/2025).

## Funzionalità

- **Compilazione schede** — Form per Obiettivi Strategici e Operativi per tutti i servizi della Giunta Regionale
- **Generazione PDF** — Schede in formato PDF fedeli al layout ufficiale dell'allegato DGR 149/2025
- **Generazione Excel** — Export individuale di ogni scheda compilata
- **Archivio protetto** — Accesso con credenziali per visualizzare tutte le schede archiviate
- **Dashboard BI** — Indicatori e analisi aggregate su tutti gli obiettivi inseriti
- **Export massivo** — Esportazione di tutte le schede in un unico file Excel

## Come usare

1. Aprire `index.html` nel browser (o visitare il sito GitHub Pages)
2. Selezionare il servizio dalla lista
3. Compilare la scheda Obiettivo Strategico o Operativo
4. Cliccare "Salva e Scarica PDF + Excel"
5. Per accedere all'archivio: credenziali `admin` / `Molise2025!`

## Tecnologie

- React 18 (CDN)
- jsPDF + AutoTable (generazione PDF)
- SheetJS/XLSX (generazione Excel)
- Chart.js (grafici dashboard)
- localStorage (archiviazione dati nel browser)

## Deploy

Il sito è un singolo file HTML statico, ospitabile su GitHub Pages senza build o server.

## Riferimenti normativi

- DGR n. 149 del 26/05/2025 — Piano della Performance Organizzativa triennio 2025/2027
- D.L. n. 80/2021 — Valore Pubblico
- PIAO 2024-2026 della Regione Molise
