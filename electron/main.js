const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

// GPX Viewer Electron App

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start the Express server
function startServer() {
  return new Promise((resolve) => {
    // Change to the server directory
    process.chdir(path.join(__dirname, '..'));
    
    const server = express();
    const cors = require('cors');
    const initSqlJs = require('sql.js');
    const fs = require('fs');
    
    const PORT = 3001;
    const DB_PATH = './gpx_viewer.db';
    
    server.use(cors());
    server.use(express.json({ limit: '10mb' }));
    
    // Initialize database
    async function initDatabase() {
      const SQL = await initSqlJs();
      let db;
      
      try {
        if (fs.existsSync(DB_PATH)) {
          const buffer = fs.readFileSync(DB_PATH);
          db = new SQL.Database(buffer);
          console.log('Loaded existing database');
        } else {
          db = new SQL.Database();
          console.log('Created new database');
        }
      } catch (err) {
        db = new SQL.Database();
        console.log('Created new database');
      }
    
      db.run(`CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        coordinates TEXT NOT NULL,
        elevation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      try {
        db.run('ALTER TABLE tracks ADD COLUMN elevation TEXT');
      } catch (e) {}
    
      db.run(`CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_lat REAL NOT NULL,
        start_lng REAL NOT NULL,
        end_lat REAL NOT NULL,
        end_lng REAL NOT NULL,
        distance TEXT,
        coordinates TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    
      function saveDatabase() {
        if (db) {
          const data = db.export();
          const buffer = Buffer.from(data);
          fs.writeFileSync(DB_PATH, buffer);
        }
      }
      
      // API Routes for Tracks
      server.get('/api/tracks', (req, res) => {
        try {
          const result = db.exec('SELECT * FROM tracks ORDER BY created_at DESC');
          if (result.length === 0) return res.json([]);
          
          const tracks = result[0].values.map(row => ({
            id: row[0],
            name: row[1],
            coordinates: row[2] || '[]',
            created_at: row[3],
            elevation: row[4] || null
          }));
          res.json(tracks);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.post('/api/tracks', (req, res) => {
        try {
          const { name, coordinates, elevation } = req.body;
          if (!name || !coordinates) {
            return res.status(400).json({ error: 'Name and coordinates are required' });
          }
    
          const trackId = require('crypto').randomUUID();
          const elevationStr = elevation ? JSON.stringify(elevation) : null;
          db.run('INSERT INTO tracks (id, name, coordinates, elevation) VALUES (?, ?, ?, ?)', 
            [trackId, name, JSON.stringify(coordinates), elevationStr]);
          saveDatabase();
    
          res.json({ id: trackId, message: 'Track saved successfully' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.delete('/api/tracks/:id', (req, res) => {
        try {
          const { id } = req.params;
          db.run('DELETE FROM tracks WHERE id = ?', [id]);
          saveDatabase();
          res.json({ message: 'Track deleted successfully' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.put('/api/tracks/:id', (req, res) => {
        try {
          const { id } = req.params;
          const { name } = req.body;
          if (!name) {
            return res.status(400).json({ error: 'Name is required' });
          }
          db.run('UPDATE tracks SET name = ? WHERE id = ?', [name, id]);
          saveDatabase();
          res.json({ message: 'Track renamed successfully' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      // API Routes for Routes
      server.get('/api/routes', (req, res) => {
        try {
          const result = db.exec('SELECT * FROM routes ORDER BY created_at DESC');
          if (result.length === 0) return res.json([]);
          
          const routes = result[0].values.map(row => ({
            id: row[0],
            name: row[1],
            start_lat: row[2],
            start_lng: row[3],
            end_lat: row[4],
            end_lng: row[5],
            distance: row[6],
            coordinates: row[7],
            created_at: row[8]
          }));
          res.json(routes);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.post('/api/routes', (req, res) => {
        try {
          const { name, startLat, startLng, endLat, endLng, distance, coordinates } = req.body;
          if (!name || !coordinates) {
            return res.status(400).json({ error: 'All route fields are required' });
          }
    
          const routeId = require('crypto').randomUUID();
          db.run(`INSERT INTO routes (id, name, start_lat, start_lng, end_lat, end_lng, distance, coordinates)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [routeId, name, startLat, startLng, endLat, endLng, distance, JSON.stringify(coordinates)]);
          saveDatabase();
    
          res.json({ id: routeId, message: 'Route saved successfully' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.delete('/api/routes/:id', (req, res) => {
        try {
          const { id } = req.params;
          db.run('DELETE FROM routes WHERE id = ?', [id]);
          saveDatabase();
          res.json({ message: 'Route deleted successfully' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      // Elevation proxy
      server.post('/api/elevation', async (req, res) => {
        let { locations } = req.body;
        
        if (!locations || !Array.isArray(locations)) {
          return res.status(400).json({ error: 'Locations array required' });
        }
        
        if (locations.length > 100) {
          const step = Math.floor(locations.length / 100);
          locations = locations.filter((_, i) => i % step === 0 || i === locations.length - 1).slice(0, 100);
        }
        
        const locationString = locations.map(loc => 
          `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`
        ).join('|');
        
        try {
          const url = `https://api.opentopodata.org/v1/srtm30m?locations=${encodeURIComponent(locationString)}`;
          const response = await fetch(url);
          const data = await response.json();
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    
      server.listen(PORT, '127.0.0.1', () => {
        console.log(`Server running on http://127.0.0.1:${PORT}`);
        resolve();
      });
    }
    
    initDatabase();
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});