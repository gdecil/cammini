# 🏔️ Cammini

**App per visualizzare tracce GPX e pianificare itinerari escursionistici**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199432)

## ✨ Funzionalità

### 🏠 Home
- Vista mappa con tutti i tracciati e percorsi salvati
- Segnaposti interattivi per ogni elemento salvato
- Clicca su un segnaposto per aprire la traccia/percorso corrispondente
- Sidebar con lista di tutti i cammini salvati

### 📍 Carica GPX
- Carica file GPX dal tuo dispositivo
- Visualizza tracce su mappa interattiva
- Profilo altimetrico con sincronizzazione mappa ↔ grafico
- Salva e gestisci le tue tracce

### 🗺️ Calcola Percorso
- Pianifica itinerari multi-tappa
- Trascina i punti sulla mappa
- Calcola distanza e dislivelli
- Esporta percorsi come GPX

### 🖥️ Modalità Fullscreen
- Premi ⛶ per massima immersività
- La mappa occupa tutto lo schermo
- In "Calcola Percorso" la modifica è disabilitata in fullscreen

### 🗺️ Mete Mappe
- OpenStreetMap
- OpenTopoMap
- Stamen Terrain
- CartoDB Positron/Dark

## 🚀 Avvio

```bash
# Installa dipendenze
npm install

# Avvia l'app (server + frontend)
npm start

# Oppure solo frontend in development
npm run dev
```

L'app sarà disponibile su:
- Frontend: http://localhost:5174
- Backend API: http://localhost:3001

## 🧭 Navigazione

- `/` - Home (mappa con tutti i tracciati salvati)
- `/gpx` - Carica GPX (visualizza e gestisci tracce)
- `/route` - Calcola Percorso (pianifica itinerari)

## 🏗️ Struttura

```
src/
├── components/
│   ├── Map.jsx              # Componente mappa Leaflet
│   ├── ElevationProfile.jsx # Grafico altimetrico D3
│   ├── FileUpload.jsx       # Upload file GPX
│   ├── LayerSelector.jsx    # Selettore tipo mappa
│   └── SavedTracks.jsx      # Gestione tracce salvate
├── pages/
│   ├── HomeMap.jsx          # Pagina home con mappa e segnaposti
│   ├── GPXViewer.jsx       # Pagina visualizzazione GPX
│   └── RoutePlanner.jsx    # Pagina pianificazione percorsi
├── App.jsx                  # Componente principale
└── main.jsx                 # Entry point React
```

## 🛠️ Tecnologie

- **React 18** - UI framework
- **React Router** - Navigazione
- **Leaflet** - Mappe OpenStreetMap
- **React-Leaflet** - Wrapper React per Leaflet
- **D3.js** - Grafico altimetrico
- **OSRM API** - Routing
- **OpenTopoData API** - Elevazione
- **SQL.js** - Database locale (tracce salvate)

## 📱 Responsive

L'app è ottimizzata per:
- Desktop 💻
- Tablet 📱
- Mobile 📱

## 📄 Licenza

MIT License

---

Sviluppato con ❤️ per gli amanti del trekking e dei cammini
