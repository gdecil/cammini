import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Map from '../components/Map'
import LayerSelector from '../components/LayerSelector'
import './HomeMap.css'

const API_URL = '/api'

// Generate GPX for tracks
const generateTrackGPX = (track) => {
  const { coordinates, elevation, name } = track
  if (!coordinates || coordinates.length === 0) return null
  
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Cammini">\n  <metadata>\n    <name>' + name + '</name>\n  </metadata>\n<trk>\n<trkseg>\n'
  
  coordinates.forEach((coord, i) => {
    const ele = elevation && elevation[i] !== undefined ? elevation[i] : 0
    gpx += `    <trkpt lat="${coord[0]}" lon="${coord[1]}">\n      <ele>${ele}</ele>\n    </trkpt>\n`
  })
  
  gpx += '</trkseg>\n</trk>\n</gpx>'
  return gpx
}

// Generate GPX for routes (without waypoints, with elevation interpolation)
const generateRouteGPX = (route) => {
  const { coordinates, elevation, name } = route
  if (!coordinates || coordinates.length === 0) return null
  
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Cammini">\n  <metadata>\n    <name>' + name + '</name>\n  </metadata>\n<trk>\n<trkseg>\n'
  
  const numCoords = coordinates.length
  const numElevations = elevation ? elevation.length : 0
  
  if (numElevations > 0) {
    // Interpolate elevation for each coordinate
    coordinates.forEach((coord, i) => {
      const eleIndex = numElevations > 1 ? (i / (numCoords - 1)) * (numElevations - 1) : 0
      const eleLower = Math.floor(eleIndex)
      const eleUpper = Math.min(eleLower + 1, numElevations - 1)
      const eleFraction = eleIndex - eleLower
      const ele = elevation[eleLower] !== undefined && elevation[eleUpper] !== undefined
        ? elevation[eleLower] + (elevation[eleUpper] - elevation[eleLower]) * eleFraction
        : (elevation[eleLower] || 0)
      gpx += `    <trkpt lat="${coord[0]}" lon="${coord[1]}">\n      <ele>${ele.toFixed(1)}</ele>\n    </trkpt>\n`
    })
  } else {
    // No elevation data
    coordinates.forEach((coord) => {
      gpx += `    <trkpt lat="${coord[0]}" lon="${coord[1]}">\n      <ele>0</ele>\n    </trkpt>\n`
    })
  }
  
  gpx += '</trkseg>\n</trk>\n</gpx>'
  return gpx
}

// Download GPX file
const downloadGPX = (gpx, filename) => {
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.gpx') ? filename : filename + '.gpx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Handle export item
const handleExportItem = (item, e) => {
  e.stopPropagation()
  let gpx
  if (item.type === 'route') {
    gpx = generateRouteGPX(item)
  } else {
    gpx = generateTrackGPX(item)
  }
  if (gpx) {
    downloadGPX(gpx, item.name)
  }
}

export default function HomeMap() {
  const [savedItems, setSavedItems] = useState([])
  const [currentLayer, setCurrentLayer] = useState('OpenStreetMap')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [markers, setMarkers] = useState([])

  useEffect(() => {
    loadSavedItems()
  }, [])

  const loadSavedItems = async () => {
    try {
      const res = await fetch(`${API_URL}/saved`)
      const data = await res.json()
      setSavedItems(data)
    } catch (error) {
      console.error('Error loading saved items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Estrai il centro della traccia/percorso per il marker
  const getCenterPoint = (item) => {
    if (item.type === 'route' && item.coordinates && item.coordinates.length > 0) {
      return item.coordinates[Math.floor(item.coordinates.length / 2)]
    }
    if (item.coordinates && item.coordinates.length > 0) {
      return item.coordinates[Math.floor(item.coordinates.length / 2)]
    }
    if (item.type === 'route' && item.startLat && item.startLng) {
      return [item.startLat, item.startLng]
    }
    return null
  }

  const handleMarkerClick = (item) => {
    // Se è un percorso calcolato, vai a RoutePlanner, altrimenti a GPXViewer
    if (item.type === 'route') {
      navigate(`/route?routeId=${item.id}`)
    } else {
      navigate(`/gpx?trackId=${item.id}`)
    }
  }

  // Prepara i marker quando savedItems cambia
  useEffect(() => {
    const newMarkers = savedItems.map(item => {
      const center = getCenterPoint(item)
      if (!center) return null
      
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        position: center,
        coordinates: item.coordinates
      }
    }).filter(m => m !== null)
    
    setMarkers(newMarkers)
  }, [savedItems])

  console.log('Rendering HomeMap, savedItems:', savedItems.length, 'markers:', markers.length)

  return (
    <div className="home-map">
      <LayerSelector 
        currentLayer={currentLayer} 
        onLayerChange={setCurrentLayer} 
      />
      
      {loading ? (
        <div className="loading">Caricamento...</div>
      ) : savedItems.length === 0 ? (
        <div className="no-items">
          <h2>Nessuna traccia o percorso salvato</h2>
          <p>Carica un file GPX o crea un percorso per vederlo qui</p>
        </div>
      ) : (
        <Map 
          markers={markers}
          onMarkerClick={handleMarkerClick}
          currentLayer={currentLayer}
          zoom={6}
          center={[41.9029, 12.4964]}
        />
      )}
      
      <div className="home-sidebar">
        <h2>I Tuoi Cammini</h2>
        {savedItems.length === 0 ? (
          <p className="empty-message">Nessun elemento salvato</p>
        ) : (
          <ul className="items-list">
            {savedItems.map(item => (
              <li 
                key={item.id} 
                className="item-card"
                onClick={() => handleMarkerClick(item)}
              >
                <span className="item-type">{item.type === 'track' ? '📍' : '🥾'}</span>
                <span className="item-name">{item.name}</span>
                {item.distance && (
                  <span className="item-distance">{item.distance}</span>
                )}
                <button 
                  className="export-btn"
                  onClick={(e) => handleExportItem(item, e)}
                  title="Esporta GPX"
                >
                  📥
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
