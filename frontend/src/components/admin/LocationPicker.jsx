'use client'
import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, Loader2 } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DEFAULT_CENTER = [31.5204, 74.3587] // Lahore fallback

// Listens for map clicks and reports back the picked lat/lng
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Floating button that asks the browser for the user's current GPS position
// and recenters the map there
function LocateMeControl({ onLocate }) {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  const handleClick = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported on this device/browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        map.setView([latitude, longitude], 16)
        onLocate(latitude, longitude)
        setLocating(false)
      },
      () => {
        alert('Could not access your location. Please allow location permission, or click on the map manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={locating}
      title="Use my current location"
      className="absolute top-3 right-3 z-[1000] bg-white shadow-lg rounded-xl p-2.5 hover:bg-indigo-50 transition-colors border border-gray-100"
    >
      {locating ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <Crosshair className="w-4 h-4 text-indigo-600" />}
    </button>
  )
}

/**
 * LocationPicker — click anywhere on the map to drop a pin, or tap the
 * crosshair button to use the device's current GPS location.
 *
 * Props:
 *  - latitude, longitude: current selected coordinates (or null)
 *  - onChange(lat, lng): called whenever the user picks a new point
 */
export default function LocationPicker({ latitude, longitude, onChange }) {
  const hasPoint = latitude != null && longitude != null
  const center = hasPoint ? [latitude, longitude] : DEFAULT_CENTER

  return (
    <div className="relative h-64 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={hasPoint ? 15 : 12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        <LocateMeControl onLocate={onChange} />
        {hasPoint && <Marker position={[latitude, longitude]} />}
      </MapContainer>

      {!hasPoint && (
        <div className="absolute bottom-3 left-3 right-14 z-[1000] bg-white/95 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-600 shadow">
          📍 Tap anywhere on the map to set this shop&apos;s location
        </div>
      )}
    </div>
  )
}
