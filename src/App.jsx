import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import GPXViewer from './pages/GPXViewer'
import RoutePlanner from './pages/RoutePlanner'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>🏔️ Cammini</h1>
          <nav className="navbar">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Carica GPX
            </NavLink>
            <NavLink to="/route" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Calcola Percorso
            </NavLink>
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<GPXViewer />} />
            <Route path="/route" element={<RoutePlanner />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
