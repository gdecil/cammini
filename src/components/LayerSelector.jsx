import './LayerSelector.css'

const LAYERS = {
  OpenStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  OpenTopoMap: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: OpenStreetMap, SRTM | Map style: OpenTopoMap'
  },
  'Stamen Terrain': {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    attribution: 'Map tiles by Stamen Design, CC BY 3.0'
  },
  'CartoDB Positron': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  'CartoDB Dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }
}

export default function LayerSelector({ currentLayer, onLayerChange }) {
  return (
    <div className="layer-selector">
      <label>🗺️ Layer:</label>
      <select 
        value={currentLayer} 
        onChange={(e) => onLayerChange(e.target.value)}
      >
        {Object.keys(LAYERS).map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  )
}

export { LAYERS }
