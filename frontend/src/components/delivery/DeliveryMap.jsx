'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const makeDeliveryIcon = (status, index) => {
  const color = status === 'DELIVERED' ? '#10b981' : status === 'IN_TRANSIT' ? '#f59e0b' : '#4f46e5'
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25)">${index}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17], className: '',
  })
}

const userLocationIcon = L.divIcon({
  html: `<div style="position:relative">
    <div style="position:absolute;top:-12px;left:-12px;width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.25);animation:fm-pulse 1.8s infinite"></div>
    <div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
  </div>
  <style>@keyframes fm-pulse{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>`,
  iconSize: [16, 16], iconAnchor: [8, 8], className: '',
})

// Auto-fits the map to show all given [lat, lng] points whenever they change
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [JSON.stringify(points)])
  return null
}

export default function DeliveryMap({ deliveries, userLocation }) {
  const withCoords = deliveries.filter(d => d.order?.shop?.latitude && d.order?.shop?.longitude)

  const fallbackCenter = withCoords.length > 0
    ? [withCoords[0].order.shop.latitude, withCoords[0].order.shop.longitude]
    : [31.5204, 74.3587]
  const center = userLocation ? [userLocation.lat, userLocation.lng] : fallbackCenter

  const routePoints = [
    ...(userLocation ? [[userLocation.lat, userLocation.lng]] : []),
    ...withCoords.map(d => [d.order.shop.latitude, d.order.shop.longitude]),
  ]

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} className="rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={routePoints} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
          <Popup>📍 Your current location</Popup>
        </Marker>
      )}

      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#4f46e5" weight={3} opacity={0.65} dashArray="8 6" />
      )}

      {withCoords.map((d, idx) => (
        <Marker
          key={d.id}
          position={[d.order.shop.latitude, d.order.shop.longitude]}
          icon={makeDeliveryIcon(d.status, idx + 1)}
        >
          <Popup>
            <div className="min-w-[170px]">
              <p className="font-bold text-sm text-gray-900">{d.order.shop.name}</p>
              <p className="text-xs text-gray-500">{d.order.shop.address}</p>
              <p className="text-xs text-gray-400 mt-1">{d.order.orderNo}</p>
              {typeof d.distanceFromPrevKm === 'number' && (
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  ~{d.distanceFromPrevKm.toFixed(1)} km from previous stop
                </p>
              )}
              <div className="flex justify-between mt-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  d.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                  d.status === 'IN_TRANSIT' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'}`}>
                  {d.status.replace('_', ' ')}
                </span>
                <span className="font-bold text-gray-700">
                  Rs. {Number(d.order.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
