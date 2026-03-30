import { useState, useRef } from 'react'
import './FileUpload.css'

export default function FileUpload({ onFileLoad, onGpxContent }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (file && file.name.endsWith('.gpx')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result
        onFileLoad(content)
        if (onGpxContent) {
          onGpxContent(content)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    handleFile(file)
  }

  return (
    <div className="file-upload-container">
      <input
        type="file"
        id="gpxFile"
        accept=".gpx"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <button 
        className="upload-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        📂 Scegli File GPX
      </button>
      
      <p className="drag-text">oppure trascina qui il file</p>
      
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>🗂️ Trascina qui il file GPX</p>
      </div>
    </div>
  )
}
