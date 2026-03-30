import { useState } from 'react'
import './SavedTracks.css'

export default function SavedTracks({ tracks, onLoad, onDelete, onSaveCurrent, onRename, hasTrack }) {
  const [sortBy, setSortBy] = useState('date') // 'name' or 'date'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  
  // Convert tracks object to array and sort
  const trackArray = Object.keys(tracks).map(name => ({
    name,
    ...tracks[name]
  }))
  
  const sortedTracks = [...trackArray].sort((a, b) => {
    let comparison = 0
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else {
      // Sort by date
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      comparison = dateB - dateA
    }
    // Apply sort order
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleRename = (oldName) => {
    if (newName && newName.trim() && newName !== oldName) {
      onRename(oldName, newName.trim())
    }
    setEditingName(null)
    setNewName('')
  }

  const startRename = (name) => {
    setEditingName(name)
    setNewName(name)
  }

  return (
    <div className="saved-tracks-container">
      <h3>📁 Tracce Salvate</h3>
      
      <div className="tracks-actions">
        <button 
          className="action-btn primary" 
          onClick={onSaveCurrent}
          disabled={!hasTrack}
        >
          💾 Salva Traccia
        </button>
      </div>

      {/* Sort options */}
      <div className="sort-options">
        <span>Ordina:</span>
        <button 
          className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
          onClick={() => setSortBy('name')}
        >
          Nome
        </button>
        <button 
          className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
          onClick={() => setSortBy('date')}
        >
          Data
        </button>
        <button 
          className="sort-btn order-btn"
          onClick={toggleSortOrder}
          title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="tracks-list">
        {sortedTracks.length === 0 ? (
          <p className="empty-message">Nessuna traccia salvata</p>
        ) : (
          sortedTracks.map(track => (
            <div key={track.name} className="track-item">
              <div className="track-info">
                {editingName === track.name ? (
                  <input
                    type="text"
                    className="rename-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleRename(track.name)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(track.name)}
                    autoFocus
                  />
                ) : (
                  <strong onDoubleClick={() => startRename(track.name)} title="Doppio click per rinominare">
                    {track.name}
                  </strong>
                )}
                <small>{new Date(track.createdAt).toLocaleString()}</small>
              </div>
              <div className="track-actions">
                <button 
                  className="small-btn"
                  onClick={() => onLoad(track.name)}
                >
                  Carica
                </button>
                <button 
                  className="small-btn danger"
                  onClick={() => onDelete(track.name)}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
