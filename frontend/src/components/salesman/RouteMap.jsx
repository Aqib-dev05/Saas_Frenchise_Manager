'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icon in Next.js
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const makeNumberedIcon = (number, hasOrder, isVisited) => {
  const color = isVisited ? '#10b981' : hasOrder ? '#4f46e5' : '#64748b'
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: '',
  })
}

export default function RouteMap({ shops, onShopClick, activeShopId }) {
  const shopsWithCoords = shops.filter(rs => rs.shop?.latitude && rs.shop?.longitude)
  const center = shopsWithCoords.length > 0
    ? [shopsWithCoords[0].shop.latitude, shopsWithCoords[0].shop.longitude]
    : [31.5204, 74.3587]

  const polylinePoints = shopsWithCoords.map(rs => [rs.shop.latitude, rs.shop.longitude])

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} className="rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route polyline */}
      {polylinePoints.length > 1 && (
        <Polyline
          positions={polylinePoints}
          color="#4f46e5"
          weight={2.5}
          opacity={0.6}
          dashArray="6 4"
        />
      )}

      {shopsWithCoords.map((rs, idx) => {
        const hasOrder = !!rs.todayOrder
        const isVisited = hasOrder
        const isActive = rs.shopId === activeShopId

        return (
          <Marker
            key={rs.id}
            position={[rs.shop.latitude, rs.shop.longitude]}
            icon={makeNumberedIcon(rs.visitOrder || idx + 1, hasOrder, isVisited)}
            eventHandlers={{ click: () => onShopClick?.(rs) }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-gray-900 text-sm">{rs.shop.name}</p>
                <p className="text-gray-500 text-xs">{rs.shop.ownerName}</p>
                <p className="text-gray-400 text-xs mt-1">{rs.shop.address}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rs.shop.type === 'CREDIT' ? 'bg-orange-100 text-orange-700' : rs.shop.type === 'WHOLESALE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {rs.shop.type}
                  </span>
                  {hasOrder && <span className="text-xs text-emerald-600 font-semibold">✓ Ordered</span>}
                </div>
                {parseFloat(rs.shop.balance) > 0 && (
                  <p className="text-xs text-orange-600 font-medium mt-1">Balance: Rs. {Number(rs.shop.balance).toLocaleString()}</p>
                )}
                <button
                  onClick={() => onShopClick?.(rs)}
                  className="mt-2 w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg font-medium transition-colors"
                >
                  {hasOrder ? 'View Order' : 'Book Order'}
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
