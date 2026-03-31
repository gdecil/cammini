// Script per verificare le routes nel database
const initSqlJs = require('sql.js');
const fs = require('fs');

const DB_PATH = 'C:\\Users\\gdeci\\IaAi\\gpx-viewer-react\\gpx_viewer.db';

async function verifyRoutes() {
    const SQL = await initSqlJs();
    
    if (!fs.existsSync(DB_PATH)) {
        console.error('Database non trovato:', DB_PATH);
        return;
    }
    
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);
    
    const result = db.exec('SELECT COUNT(*) as count FROM routes');
    console.log('Numero di routes nel database:', result[0].values[0][0]);
    
    const routes = db.exec('SELECT id, name, start_lat, start_lng FROM routes');
    if (routes.length > 0) {
        console.log('\nRoutes trovate:');
        routes[0].values.forEach(row => {
            console.log(`  - ${row[1]} (${row[2]}, ${row[3]})`);
        });
    }
    
    db.close();
}

verifyRoutes().catch(console.error);