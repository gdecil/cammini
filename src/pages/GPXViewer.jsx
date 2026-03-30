import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Map from '../components/Map'
import FileUpload from '../components/FileUpload'
import SavedTracks from '../components/SavedTracks'
import LayerSelector from '../components/LayerSelector'
import ElevationProfile from '../components/ElevationProfile'
import './GPXViewer.css'

const API_URL = '/api'

export default function GPXViewer() {
  const [trackCoordinates, setTrackCoordinates] = useState([])
  const [gpxContent, setGpxContent] = useState(null)
  const [savedTracks, setSavedTracks] = useState({})
  const [message, setMessage] = useState(null)
  const [currentLayer, setCurrentLayer] = useState('OpenStreetMap')
  const [isProfileDetached, setIsProfileDetached] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null) // 0-1 value for cross-highlight
  const [sidebarWidth, setSidebarWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const [searchParams] = useSearchParams()
  const trackIdParam = searchParams.get('trackId')

  // Sidebar resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.min(500, Math.max(250, newWidth)))
    }
    const handleMouseUp = () => setIsResizing(false)
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  useEffect(() => {
    loadSavedTracks()
  }, [])

  // Carica automaticamente la traccia se specificato nella query string
  useEffect(() => {
    if (trackIdParam && Object.keys(savedTracks).length > 0) {
      // Cerca la traccia per ID
      const trackEntry = Object.entries(savedTracks).find(([name, track]) => track.id === trackIdParam)
      if (trackEntry) {
        handleLoadTrack(trackEntry[0])
      }
    }
  }, [trackIdParam, savedTracks])

  const loadSavedTracks = async () => {
    try {
      const res = await fetch(`${API_URL}/tracks`)
      const data = await res.json()
      const tracksObj = {}
      data.forEach(track => {
        try {
          let coordsStr = track.coordinates
          console.log('Processing track:', track.name, 'coords type:', typeof coordsStr, 'first 50 chars:', String(coordsStr).substring(0, 50))
          
          if (typeof coordsStr !== 'string') {
            // If it's already an array, use it directly
            if (Array.isArray(coordsStr)) {
              tracksObj[track.name] = {
                ...track,
                coordinates: coordsStr,
                elevation: track.elevation ? JSON.parse(track.elevation) : null,
                createdAt: track.created_at
              }
              console.log('Used array directly for:', track.name)
              return
            }
            coordsStr = JSON.stringify(coordsStr)
          }
          
          // Try direct JSON parse first
          try {
            const coordinates = JSON.parse(coordsStr)
            const elevationData = track.elevation ? JSON.parse(track.elevation) : null
            tracksObj[track.name] = {
              ...track,
              coordinates,
              elevation: elevationData,
              createdAt: track.created_at
            }
            console.log('✓ Parsed directly:', track.name, 'coords count:', coordinates.length)
          } catch (directParseError) {
            console.log('✗ Direct parse failed for:', track.name)
            console.log('  Error:', directParseError.message)
            console.log('  Trying regex...')
            
            // Try regex as fallback
            const match = coordsStr.match(/\[[\s\S]*\]/)
            console.log('  Regex match:', match ? 'YES, length=' + match[0].length : 'NO')
            
            if (match) {
              // Force string conversion immediately
              const matchedString = ('' + match[0])
              console.log('  Attempting to parse match, first 100:', matchedString.substring(0, 100))
              
              const coordinates = JSON.parse(matchedString)
              console.log('  ✓ Coordinates parsed, count:', coordinates.length)
              
              // Handle elevation data safely
              let elevationData = null
              if (track.elevation) {
                try {
                  // Clean elevation data similar to coordinates
                  const eleStr = String(track.elevation).trim()
                  const eleMatch = eleStr.match(/\[[\s\S]*\]/)
                  if (eleMatch) {
                    elevationData = JSON.parse(eleMatch[0])
                    console.log('  ✓ Elevation parsed, count:', elevationData.length)
                  } else {
                    elevationData = JSON.parse(eleStr)
                    console.log('  ✓ Elevation parsed (direct), count:', elevationData.length)
                  }
                } catch (eleError) {
                  console.log('  ! Elevation parse failed:', eleError.message, 'value:', String(track.elevation).substring(0, 50))
                }
              }
              
              tracksObj[track.name] = {
                ...track,
                coordinates,
                elevation: elevationData,
                createdAt: track.created_at
              }
              console.log('✓ Parsed via regex:', track.name)
            } else {
              throw new Error('No valid JSON found')
            }
          }
        } catch (parseError) {
          // Just log and continue - don't fail the whole batch
          console.log('  ✗ Track skipped due to parse error:', track.name, parseError.message)
        }
      })
      setSavedTracks(tracksObj)
    } catch (error) {
      console.error('Error loading tracks:', error)
    }
  }

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const parseGPX = (gpxContent) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml')
    const coordinates = []
    const elevations = []

    const tracks = xmlDoc.getElementsByTagName('trk')
    const routes = xmlDoc.getElementsByTagName('rte')
    const waypoints = xmlDoc.getElementsByTagName('wpt')

    for (let i = 0; i < tracks.length; i++) {
      const trackSegments = tracks[i].getElementsByTagName('trkseg')
      for (let j = 0; j < trackSegments.length; j++) {
        const trackPoints = trackSegments[j].getElementsByTagName('trkpt')
        for (let k = 0; k < trackPoints.length; k++) {
          const lat = parseFloat(trackPoints[k].getAttribute('lat'))
          const lon = parseFloat(trackPoints[k].getAttribute('lon'))
          const ele = trackPoints[k].getElementsByTagName('ele')[0]
          const elevation = ele ? parseFloat(ele.textContent) : null
          
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push([lat, lon])
            elevations.push(elevation)
          }
        }
      }
    }

    for (let i = 0; i < routes.length; i++) {
      const routePoints = routes[i].getElementsByTagName('rtept')
      for (let j = 0; j < routePoints.length; j++) {
        const lat = parseFloat(routePoints[j].getAttribute('lat'))
        const lon = parseFloat(routePoints[j].getAttribute('lon'))
        const ele = routePoints[j].getElementsByTagName('ele')[0]
        const elevation = ele ? parseFloat(ele.textContent) : null
        
        if (!isNaN(lat) && !isNaN(lon)) {
          coordinates.push([lat, lon])
          elevations.push(elevation)
        }
      }
    }

    for (let i = 0; i < waypoints.length; i++) {
      const lat = parseFloat(waypoints[i].getAttribute('lat'))
      const lon = parseFloat(waypoints[i].getAttribute('lon'))
      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lat, lon])
      }
    }

    return { coordinates, elevations }
  }

  const handleFileLoad = (gpxContent) => {
    try {
      const { coordinates: coords, elevations } = parseGPX(gpxContent)
      if (coords.length === 0) {
        showMessage('Nessuna traccia trovata nel file GPX', 'error')
        return
      }
      setTrackCoordinates(coords)
      setGpxContent(gpxContent)
      
      // Store elevations in state for saving
      window._currentElevations = elevations
      showMessage('File GPX caricato con successo', 'success')
    } catch (error) {
      showMessage('Errore durante il parsing del file GPX', 'error')
    }
  }

  const handleSaveCurrent = async () => {
    console.log('handleSaveCurrent called, trackCoordinates:', trackCoordinates)
    if (trackCoordinates.length === 0) {
      showMessage('Nessuna traccia da salvare', 'warning')
      return
    }

    const name = prompt('Nome traccia:', `Traccia_${new Date().toISOString().slice(0, 10)}`)
    if (!name) return

    const elevations = window._currentElevations || null
    console.log('Saving track:', name, trackCoordinates, 'elevations:', elevations ? elevations.length : 0)
    
    try {
      const res = await fetch(`${API_URL}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, coordinates: trackCoordinates, elevation: elevations })
      })
      console.log('Response:', res.status, res.ok)
      if (res.ok) {
        showMessage(`Traccia "${name}" salvata`, 'success')
        console.log('Calling loadSavedTracks...')
        loadSavedTracks()
      } else {
        const errorData = await res.json()
        console.error('Error response:', errorData)
        showMessage('Errore nel salvare la traccia: ' + errorData.error, 'error')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      showMessage('Errore nel salvare la traccia: ' + error.message, 'error')
    }
  }

  const generateGPXFromCoordinates = (coordinates) => {
    // Generate GPX XML with simulated elevation data
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n<trk>\n<trkseg>\n'
    const baseElevation = 100 + Math.random() * 200 // Random base elevation between 100-300m
    
    coordinates.forEach((coord, i) => {
      // Add some variation to elevation
      const elevation = baseElevation + Math.sin(i / 10) * 50 + Math.random() * 20
      gpx += `    <trkpt lat="${coord[0]}" lon="${coord[1]}">\n      <ele>${elevation.toFixed(1)}</ele>\n    </trkpt>\n`
    })
    
    gpx += '</trkseg>\n</trk>\n</gpx>'
    return gpx
  }

  const generateGPXFromElevations = (coordinates, elevations) => {
    // Generate GPX XML with stored elevation data
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n<trk>\n<trkseg>\n'
    
    coordinates.forEach((coord, i) => {
      const elevation = elevations && elevations[i] !== null ? elevations[i].toFixed(1) : '0'
      gpx += `    <trkpt lat="${coord[0]}" lon="${coord[1]}">\n      <ele>${elevation}</ele>\n    </trkpt>\n`
    })
    
    gpx += '</trkseg>\n</trk>\n</gpx>'
    return gpx
  }

  const handleLoadTrack = (name) => {
    const track = savedTracks[name]
    if (track && track.coordinates) {
      setTrackCoordinates(track.coordinates)
      
      // Use real elevation data if available, otherwise simulate
      if (track.coordinates.length > 0) {
        if (track.elevation && track.elevation.length > 0) {
          // Use real elevation data
          const realGPX = generateGPXFromElevations(track.coordinates, track.elevation)
          setGpxContent(realGPX)
        } else {
          // Fallback to simulated
          const simulatedGPX = generateGPXFromCoordinates(track.coordinates)
          setGpxContent(simulatedGPX)
        }
      }
      showMessage(`Traccia "${name}" caricata`, 'success')
    }
  }

  const handleDeleteTrack = async (name) => {
    if (!confirm(`Eliminare la traccia "${name}"?`)) return
    const track = savedTracks[name]
    if (!track || !track.id) return

    try {
      await fetch(`${API_URL}/tracks/${track.id}`, { method: 'DELETE' })
      showMessage(`Traccia "${name}" eliminata`, 'success')
      loadSavedTracks()
    } catch (error) {
      showMessage('Errore nell\'eliminare la traccia', 'error')
    }
  }

  const handleRenameTrack = async (oldName, newName) => {
    const track = savedTracks[oldName]
    if (!track || !track.id) return

    try {
      const res = await fetch(`${API_URL}/tracks/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      if (res.ok) {
        showMessage(`Traccia rinominata in "${newName}"`, 'success')
        // Clear savedTracks first to force re-render with new name
        setSavedTracks({})
        loadSavedTracks()
      } else {
        showMessage('Errore nel rinominare la traccia', 'error')
      }
    } catch (error) {
      showMessage('Errore nel rinominare la traccia', 'error')
    }
  }

  const toggleProfileDetach = () => {
    setIsProfileDetached(!isProfileDetached)
  }

  return (
    <div className={`gpx-viewer ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="map-section">
        <LayerSelector 
          currentLayer={currentLayer} 
          onLayerChange={setCurrentLayer} 
        />
        
        {/* Fullscreen button */}
        <button 
          className="fullscreen-btn"
          onClick={() => {
            if (!isFullscreen) {
              document.documentElement.requestFullscreen?.().catch(() => {})
            } else {
              document.exitFullscreen?.().catch(() => {})
            }
            setIsFullscreen(!isFullscreen)
          }}
          title={isFullscreen ? 'Torna alla visualizzazione normale' : 'Mappa a tutto schermo'}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
        
        <Map 
          trackCoordinates={trackCoordinates} 
          currentLayer={currentLayer}
          selectedIndex={selectedIndex}
          onHover={(index) => setSelectedIndex(index)}
        />
        
        {/* Profile overlay on map when detached */}
        {gpxContent && isProfileDetached && (
          <div className="profile-overlay">
            <ElevationProfile 
              gpxContent={gpxContent} 
              isOverlay={true}
              selectedIndex={selectedIndex}
              onHover={(index) => setSelectedIndex(index)}
            />
          </div>
        )}
      </div>
      
      {!isFullscreen && (
        <div className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
          <FileUpload onFileLoad={handleFileLoad} />
          
          {/* Show toggle button when profile is visible */}
          {gpxContent && (
            <button 
              className="detach-profile-btn"
              onClick={toggleProfileDetach}
              title={isProfileDetached ? "Riprofilo nella sidebar" : "Sposta profilo sulla mappa"}
            >
              {isProfileDetached ? "📍 Riporta nella sidebar" : "🗺️ Sposta sulla mappa"}
            </button>
          )}
          
          {/* Show profile in sidebar when not detached */}
          {gpxContent && !isProfileDetached && (
            <ElevationProfile 
              gpxContent={gpxContent}
              selectedIndex={selectedIndex}
              onHover={(index) => setSelectedIndex(index)}
            />
          )}
          
          <SavedTracks
            tracks={savedTracks}
            onLoad={handleLoadTrack}
            onDelete={handleDeleteTrack}
            onRename={handleRenameTrack}
            onSaveCurrent={handleSaveCurrent}
            hasTrack={trackCoordinates.length > 0}
          />
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
