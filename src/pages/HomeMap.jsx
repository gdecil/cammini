import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Map from '../components/Map'
import LayerSelector from '../components/LayerSelector'
import './HomeMap.css'

const API_URL = '/api'

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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
