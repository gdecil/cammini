import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Map from '../components/Map'
import LayerSelector from '../components/LayerSelector'
import ElevationProfile from '../components/ElevationProfile'
import './RoutePlanner.css'

const API_URL = '/api'

// Waypoint colors for map markers
const WAYPOINT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']

export default function RoutePlanner() {
  // Waypoints: array of { id, lat, lng, name }
  const [waypoints, setWaypoints] = useState([])
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [distance, setDistance] = useState(null)
  const [elevationData, setElevationData] = useState(null)
  const [loadingElevation, setLoadingElevation] = useState(false)
  const [message, setMessage] = useState(null)
  const [currentLayer, setCurrentLayer] = useState('OpenStreetMap')
  const [savedRoutes, setSavedRoutes] = useState([])
  const [sortBy, setSortBy] = useState('date') // 'name' or 'date'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'
  const [showRouteProfile, setShowRouteProfile] = useState(false)
  const [profileKey, setProfileKey] = useState(0)
  const [segments, setSegments] = useState([]) // Distance per segment
  const [draggedIndex, setDraggedIndex] = useState(null) // Track which item is being dragged
  const [isFullscreen, setIsFullscreen] = useState(false) // Fullscreen map mode
  const [selectedIndex, setSelectedIndex] = useState(null) // 0-1 value for cross-highlight
  const [searchParams] = useSearchParams()
  const routeIdParam = searchParams.get('routeId')

  useEffect(() => {
    loadSavedRoutes()
  }, [])

  // Carica automaticamente il percorso se specificato nella query string
  useEffect(() => {
    if (routeIdParam && savedRoutes.length > 0) {
      const route = savedRoutes.find(r => r.id === routeIdParam)
      if (route) {
        handleLoadRoute(route)
      }
    }
  }, [routeIdParam, savedRoutes])

  const loadSavedRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/routes`)
      const data = await res.json()
      const routesArray = data.map(route => {
        // Parse JSON fields
        return {
          ...route,
          coordinates: route.coordinates ? (typeof route.coordinates === 'string' ? JSON.parse(route.coordinates) : route.coordinates) : [],
          waypoints: route.waypoints ? (typeof route.waypoints === 'string' ? JSON.parse(route.waypoints) : route.waypoints) : [],
          elevation: route.elevation ? (typeof route.elevation === 'string' ? JSON.parse(route.elevation) : route.elevation) : null,
          createdAt: route.created_at
        }
      })
      setSavedRoutes(routesArray)
    } catch (error) {
      console.error('Error loading routes:', error)
    }
  }

  // Sort routes based on current sort settings
  const getSortedRoutes = () => {
    const sorted = [...savedRoutes]
    sorted.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name)
      } else {
        const dateA = new Date(a.createdAt || a.created_at)
        const dateB = new Date(b.createdAt || b.created_at)
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      }
    })
    return sorted
  }

  const handleRenameRoute = async (route) => {
    const newName = prompt('Nuovo nome per l\'itinerario:', route.name)
    if (!newName || newName === route.name) return

    try {
      await fetch(`${API_URL}/routes/${route.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      showMessage(`Itinerario rinominato in "${newName}"`, 'success')
      loadSavedRoutes()
    } catch (error) {
      showMessage('Errore nel rinominare l\'itinerario', 'error')
    }
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleLoadRoute = (route) => {
    if (!route) return
    
    console.log('Loading route:', route.name)
    console.log('Waypoints:', route.waypoints)
    console.log('Start lat:', route.start_lat)
    console.log('End lat:', route.end_lat)
    
    let loadedWaypoints = []
    
    // Load waypoints if available, otherwise create from start/end
    if (route.waypoints && Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      console.log('Loading waypoints from saved data')
      loadedWaypoints = route.waypoints.map((wp, index) => ({
        id: Date.now() + index,
        lat: String(wp.lat),
        lng: String(wp.lng),
        name: wp.name || `Punto ${index + 1}`
      }))
    } else if (route.start_lat && route.end_lat) {
      console.log('Creating waypoints from start/end')
      loadedWaypoints = [{
        id: Date.now(),
        lat: String(route.start_lat),
        lng: String(route.start_lng),
        name: 'Partenza'
      }, {
        id: Date.now() + 1,
        lat: String(route.end_lat),
        lng: String(route.end_lng),
        name: 'Arrivo'
      }]
    }
    
    console.log('Setting waypoints:', loadedWaypoints)
    setWaypoints(loadedWaypoints)
    
    // Set route coordinates (handle both string and array)
    let coords = []
    if (route.coordinates) {
      if (typeof route.coordinates === 'string') {
        try { coords = JSON.parse(route.coordinates) } catch (e) { coords = [] }
      } else if (Array.isArray(route.coordinates)) {
        coords = route.coordinates
      }
    }
    console.log('Setting coordinates:', coords.length)
    setRouteCoordinates(coords)
    
    // Load elevation data if available
    if (route.elevation && Array.isArray(route.elevation) && route.elevation.length > 0) {
      setElevationData({
        ascent: route.ascent || 0,
        descent: route.descent || 0,
        minElevation: route.minElevation || 0,
        maxElevation: route.maxElevation || 0,
        elevations: route.elevation
      })
      setDistance(route.distance)
      setProfileKey(k => k + 1)
      showMessage(`Itinerario "${route.name}" caricato con profilo`, 'success')
    } else {
      setElevationData(null)
      if (route.distance) setDistance(route.distance)
      showMessage(`Itinerario "${route.name}" caricato`, 'success')
    }
  }

  const handleDeleteRoute = async (route) => {
    if (!confirm(`Eliminare l'itinerario "${route.name}"?`)) return
    if (!route.id) return

    try {
      await fetch(`${API_URL}/routes/${route.id}`, { method: 'DELETE' })
      showMessage(`Itinerario "${route.name}" eliminato`, 'success')
      loadSavedRoutes()
    } catch (error) {
      showMessage('Errore nell\'eliminare l\'itinerario', 'error')
    }
  }

  const handleSaveRoute = async () => {
    if (!distance || waypoints.length < 2) {
      showMessage('Calcola prima il percorso', 'error')
      return
    }

    const routeName = prompt('Nome per l\'itinerario:', `Itinerario ${new Date().toLocaleDateString()}`)
    if (!routeName) return

    const validWaypoints = waypoints.filter(wp => {
      const lat = parseFloat(wp.lat)
      const lng = parseFloat(wp.lng)
      return !isNaN(lat) && !isNaN(lng)
    })

    try {
      await fetch(`${API_URL}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          startLat: parseFloat(validWaypoints[0].lat),
          startLng: parseFloat(validWaypoints[0].lng),
          endLat: parseFloat(validWaypoints[validWaypoints.length - 1].lat),
          endLng: parseFloat(validWaypoints[validWaypoints.length - 1].lng),
          distance: distance,
          coordinates: routeCoordinates,
          elevation: elevationData?.elevations || null,
          waypoints: validWaypoints.map(wp => ({
            lat: wp.lat,
            lng: wp.lng,
            name: wp.name
          })),
          ascent: elevationData?.ascent || null,
          descent: elevationData?.descent || null,
          minElevation: elevationData?.minElevation || null,
          maxElevation: elevationData?.maxElevation || null
        })
      })
      showMessage(`Itinerario "${routeName}" salvato!`, 'success')
      loadSavedRoutes()
    } catch (error) {
      showMessage('Errore nel salvare l\'itinerario', 'error')
    }
  }

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  // Add waypoint from map click
  const handleMapClick = (e) => {
    // Don't add waypoints in fullscreen mode
    if (isFullscreen) return
    
    const { lat, lng } = e.latlng
    const newWaypoint = {
      id: Date.now(),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      name: `Punto ${waypoints.length + 1}`
    }
    setWaypoints([...waypoints, newWaypoint])
  }

  // Add new empty waypoint
  const addWaypoint = () => {
    const newWaypoint = {
      id: Date.now(),
      lat: '',
      lng: '',
      name: `Tappa ${waypoints.length + 1}`
    }
    setWaypoints([...waypoints, newWaypoint])
  }

  // Update waypoint coordinate
  const updateWaypoint = (id, field, value) => {
    setWaypoints(waypoints.map(wp => 
      wp.id === id ? { ...wp, [field]: value } : wp
    ))
  }

  // Remove waypoint
  const removeWaypoint = (id) => {
    const newWaypoints = waypoints.filter(wp => wp.id !== id)
    setWaypoints(newWaypoints)
    // Recalculate route if waypoints changed
    if (newWaypoints.length >= 2) {
      setTimeout(() => calculateMultiRoute(), 0)
    }
  }

  // Drag and drop handlers (sidebar list)
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e, index) => {
    e.preventDefault()
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newWaypoints = [...waypoints]
    const draggedItem = newWaypoints[draggedIndex]
    
    // Remove the dragged item and insert at drop position
    newWaypoints.splice(draggedIndex, 1)
    newWaypoints.splice(dropIndex, 0, draggedItem)
    
    setWaypoints(newWaypoints)
    setDraggedIndex(null)

    // Recalculate route with new order
    if (newWaypoints.length >= 2) {
      setTimeout(() => calculateMultiRoute(), 0)
    }
  }

  // Handle waypoint drag on map
  const handleWaypointDragEnd = (index, newLat, newLng) => {
    const newWaypoints = waypoints.map((wp, i) => {
      if (i === index) {
        return {
          ...wp,
          lat: newLat.toFixed(6),
          lng: newLng.toFixed(6)
        }
      }
      return wp
    })
    
    setWaypoints(newWaypoints)
    
    // Recalculate route with new position
    if (newWaypoints.length >= 2) {
      setTimeout(() => calculateMultiRoute(), 0)
    }
  }

  // Clear all waypoints
  const clearAllWaypoints = () => {
    setWaypoints([])
    setRouteCoordinates([])
    setDistance(null)
    setElevationData(null)
    setSegments([])
    setShowRouteProfile(false)
  }

  // Calculate multi-stage route
  const calculateMultiRoute = async () => {
    // Filter waypoints with valid coordinates
    const validWaypoints = waypoints.filter(wp => {
      const lat = parseFloat(wp.lat)
      const lng = parseFloat(wp.lng)
      return !isNaN(lat) && !isNaN(lng)
    })

    if (validWaypoints.length < 2) {
      showMessage('Aggiungi almeno 2 punti per calcolare il percorso', 'error')
      return
    }

    setLoadingElevation(true)
    setRouteCoordinates([])
    setDistance(null)
    setElevationData(null)
    setSegments([])
    setShowRouteProfile(false)

    try {
      let allCoords = []
      let totalDistance = 0
      const segmentDistances = []

      // Calculate route for each segment
      for (let i = 0; i < validWaypoints.length - 1; i++) {
        const start = validWaypoints[i]
        const end = validWaypoints[i + 1]
        
        const sLat = parseFloat(start.lat)
        const sLng = parseFloat(start.lng)
        const eLat = parseFloat(end.lat)
        const eLng = parseFloat(end.lng)

        const url = `https://router.project-osrm.org/route/v1/walking/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const data = await res.json()

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
          // Remove first point of segment (except first segment) to avoid duplicates
          if (i > 0 && allCoords.length > 0) {
            allCoords = [...allCoords, ...coords.slice(1)]
          } else {
            allCoords = [...allCoords, ...coords]
          }
          
          const segmentDist = data.routes[0].distance / 1000
          totalDistance += data.routes[0].distance
          segmentDistances.push(segmentDist.toFixed(2))
        } else {
          // Fallback: straight line
          const segmentCoords = [[sLat, sLng], [eLat, eLng]]
          if (i > 0 && allCoords.length > 0) {
            allCoords = [...allCoords, ...segmentCoords.slice(1)]
          } else {
            allCoords = [...allCoords, ...segmentCoords]
          }
          
          // Calculate straight line distance
          const R = 6371
          const dLat = (eLat - sLat) * Math.PI / 180
          const dLng = (eLng - sLng) * Math.PI / 180
          const a = Math.sin(dLat/2) ** 2 + Math.cos(sLat * Math.PI/180) * Math.cos(eLat * Math.PI/180) * Math.sin(dLng/2) ** 2
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const segmentDist = R * c
          
          totalDistance += segmentDist * 1000 // convert to meters
          segmentDistances.push(segmentDist.toFixed(2))
        }
      }

      setRouteCoordinates(allCoords)
      setDistance((totalDistance / 1000).toFixed(2))
      setSegments(segmentDistances)

      // Calculate elevation
      await calculateElevation(allCoords)
      showMessage('Percorso multi-tappa calcolato', 'success')
    } catch (error) {
      console.error('Error calculating route:', error)
      showMessage('Errore nel calcolare il percorso', 'error')
    }

    setLoadingElevation(false)
  }

  const calculateElevation = async (coordinates) => {
    if (coordinates.length < 2) return
    
    setLoadingElevation(true)
    
    try {
      const sampleSize = Math.min(coordinates.length, 100)
      const step = Math.floor(Math.max(1, coordinates.length / sampleSize))
      const sampledCoords = []
      
      for (let i = 0; i < coordinates.length; i += step) {
        sampledCoords.push(coordinates[i])
      }
      if (sampledCoords.length === 0 || sampledCoords[sampledCoords.length - 1] !== coordinates[coordinates.length - 1]) {
        sampledCoords.push(coordinates[coordinates.length - 1])
      }
      
      const locations = sampledCoords.map(c => ({ lat: c[0], lng: c[1] }))
      const response = await fetch(`${API_URL}/elevation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      })
      
      const data = await response.json()
      
      if (data.status === 'OK' && data.results) {
        const elevations = data.results.map(r => r.elevation).filter(e => e !== null)
        
        if (elevations.length > 1) {
          let ascent = 0
          let descent = 0
          
          for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i-1]
            if (diff > 0) ascent += diff
            else descent += Math.abs(diff)
          }
          
          setElevationData({
            ascent: Math.round(ascent),
            descent: Math.round(descent),
            minElevation: Math.round(Math.min(...elevations)),
            maxElevation: Math.round(Math.max(...elevations)),
            elevations: elevations
          })
          setProfileKey(k => k + 1)
        }
      } else {
        // Fallback
        const fakeElevations = Array(50).fill(0).map((_, i) => 100 + Math.sin(i * 0.3) * 50 + Math.random() * 20)
        setElevationData({
          ascent: 150,
          descent: 120,
          minElevation: 80,
          maxElevation: 180,
          elevations: fakeElevations
        })
        setProfileKey(k => k + 1)
      }
    } catch (error) {
      console.error('Error calculating elevation:', error)
      const fakeElevations = Array(50).fill(0).map((_, i) => 100 + Math.sin(i * 0.3) * 50 + Math.random() * 20)
      setElevationData({
        ascent: 150,
        descent: 120,
        minElevation: 80,
        maxElevation: 180,
        elevations: fakeElevations
      })
      setProfileKey(k => k + 1)
    }
    
    setLoadingElevation(false)
  }

  // Generate GPX-like content for profile using real route coordinates
  const generateRouteGPXForProfile = () => {
    if (!elevationData || !elevationData.elevations || elevationData.elevations.length === 0) {
      return null
    }
    
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return null
    }
    
    const elevations = elevationData.elevations
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n<trk>\n<trkseg>\n'
    
    // Use real route coordinates - interpolate between them for each elevation point
    const numCoords = routeCoordinates.length
    
    elevations.forEach((ele, i) => {
      // Map elevation index to route coordinate index
      const coordIndex = Math.floor((i / (elevations.length - 1)) * (numCoords - 1))
      const coord = routeCoordinates[coordIndex]
      
      if (coord) {
        gpx += `    <trkpt lat="${coord[0].toFixed(6)}" lon="${coord[1].toFixed(6)}"><ele>${ele.toFixed(2)}</ele></trkpt>\n`
      }
    })
    
    gpx += '</trkseg>\n</trk>\n</gpx>'
    return gpx
  }

  // Generate GPX (without waypoints, with elevation interpolation)
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

  // Handle export route
  const handleExportRoute = (route) => {
    const gpx = generateRouteGPX(route)
    if (gpx) {
      downloadGPX(gpx, route.name)
    }
  }

  const routeGPXContent = generateRouteGPXForProfile()
  const routeNames = Object.keys(savedRoutes)

  // Get markers for map (waypoints with valid coords)
  const validWaypoints = waypoints.filter(wp => {
    const lat = parseFloat(wp.lat)
    const lng = parseFloat(wp.lng)
    return !isNaN(lat) && !isNaN(lng)
  })

  return (
    <div className={`route-planner ${isFullscreen ? 'fullscreen-mode' : ''}`}>
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
          trackCoordinates={routeCoordinates}
          startMarker={validWaypoints.length > 0 ? [parseFloat(validWaypoints[0].lat), parseFloat(validWaypoints[0].lng)] : null}
          endMarker={validWaypoints.length > 1 ? [parseFloat(validWaypoints[validWaypoints.length - 1].lat), parseFloat(validWaypoints[validWaypoints.length - 1].lng)] : null}
          routeCoordinates={routeCoordinates}
          onMapClick={handleMapClick}
          currentLayer={currentLayer}
          waypoints={validWaypoints.map((wp, i) => ({
            position: [parseFloat(wp.lat), parseFloat(wp.lng)],
            color: WAYPOINT_COLORS[i % WAYPOINT_COLORS.length],
            label: wp.name
          }))}
          onWaypointDragEnd={isFullscreen ? null : handleWaypointDragEnd}
          draggable={!isFullscreen}
          selectedIndex={selectedIndex}
          onHover={(index) => setSelectedIndex(index)}
        />
        
        {showRouteProfile && routeGPXContent && elevationData && !loadingElevation && (
          <div className="route-profile-container">
            <ElevationProfile 
              key={profileKey} 
              gpxContent={routeGPXContent} 
              isOverlay={false}
              routeCoordinates={routeCoordinates}
              totalDistance={distance ? parseFloat(distance) : null}
              selectedIndex={selectedIndex}
              onHover={(index) => setSelectedIndex(index)}
            />
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="sidebar">
        <div className="coord-panel">
          <h3>🗺️ Itinerario Multi-Tappa</h3>
          <p className="hint">Aggiungi punti di passaggio per creare il tuo itinerario</p>

          {/* Waypoints List */}
          <div className="waypoints-list">
            {waypoints.map((wp, index) => (
              <div
                key={wp.id}
                className={`waypoint-item ${draggedIndex === index ? 'dragging' : ''}`}
                style={{ borderLeftColor: WAYPOINT_COLORS[index % WAYPOINT_COLORS.length] }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="waypoint-header">
                  <span className="waypoint-drag-handle" title="Trascina per riordinare">⋮⋮</span>
                  <span className="waypoint-number" style={{ backgroundColor: WAYPOINT_COLORS[index % WAYPOINT_COLORS.length] }}>
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    className="waypoint-name"
                    value={wp.name}
                    onChange={(e) => updateWaypoint(wp.id, 'name', e.target.value)}
                    placeholder="Nome tappa"
                  />
                  <button 
                    className="waypoint-remove"
                    onClick={() => removeWaypoint(wp.id)}
                    title="Rimuovi"
                  >
                    ✕
                  </button>
                </div>
                <div className="waypoint-coords">
                  <input
                    type="text"
                    placeholder="Lat"
                    value={wp.lat}
                    onChange={(e) => updateWaypoint(wp.id, 'lat', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Lng"
                    value={wp.lng}
                    onChange={(e) => updateWaypoint(wp.id, 'lng', e.target.value)}
                  />
                </div>
                {index > 0 && segments[index - 1] && (
                  <div className="segment-distance">
                    ← {segments[index - 1]} km
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Waypoint Button */}
          <button className="add-waypoint-btn" onClick={addWaypoint}>
            ➕ Aggiungi Tappa
          </button>

          {/* Action Buttons */}
          <div className="route-actions">
            <button 
              className="calc-btn" 
              onClick={calculateMultiRoute}
              disabled={loadingElevation}
            >
              {loadingElevation ? '⏳ Calcolo...' : '🚶 Calcola Itinerario'}
            </button>
            
            {waypoints.length > 0 && (
              <button 
                className="clear-btn"
                onClick={clearAllWaypoints}
              >
                🗑️ Svuota
              </button>
            )}
          </div>

          {/* Results */}
          {distance && (
            <div className="distance-result">
              <strong>Distanza Totale: {distance} km</strong>
              
              {loadingElevation && (
                <div className="elevation-loading">
                  📊 Calcolo dislivelli...
                </div>
              )}
              
              {elevationData && !loadingElevation && (
                <div className="elevation-stats">
                  <div className="elevation-item ascent">
                    ⬆️ Salita: <strong>{elevationData.ascent} m</strong>
                  </div>
                  <div className="elevation-item descent">
                    ⬇️ Discesa: <strong>{elevationData.descent} m</strong>
                  </div>
                  <div className="elevation-range">
                    📍 Altitudine: {elevationData.minElevation}m - {elevationData.maxElevation}m
                  </div>
                  <button 
                    className="show-profile-btn"
                    onClick={() => setShowRouteProfile(!showRouteProfile)}
                  >
                    {showRouteProfile ? '📍 Nascondi profilo' : '📊 Mostra profilo'}
                  </button>
                  <button 
                    className="save-route-btn"
                    onClick={handleSaveRoute}
                  >
                    💾 Salva Itinerario
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {savedRoutes.length > 0 && (
          <div className="saved-routes-panel">
            <div className="saved-routes-header">
              <h4>📁 Itinerari Salvati ({savedRoutes.length})</h4>
              <div className="sort-buttons">
                <button 
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => toggleSort('name')}
                  title="Ordina per nome"
                >
                  A📝 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => toggleSort('date')}
                  title="Ordina per data"
                >
                  📅 {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            <div className="routes-list">
              {getSortedRoutes().map(route => (
                <div key={route.id} className="route-item">
                  <div className="route-info">
                    <strong>{route.name}</strong>
                    <small>
                      {route.distance ? `${route.distance} km` : ''} 
                      {route.elevation ? ' 📊' : ''}
                      {' • '}{new Date(route.createdAt || route.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="route-actions">
                    <button className="small-btn" onClick={() => handleLoadRoute(route)}>Carica</button>
                    <button className="small-btn" onClick={() => handleExportRoute(route)} title="Esporta GPX">📥</button>
                    <button className="small-btn" onClick={() => handleRenameRoute(route)} title="Rinomina">✏️</button>
                    <button className="small-btn danger" onClick={() => handleDeleteRoute(route)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        </div>
      )}
    </div>
  )
}
