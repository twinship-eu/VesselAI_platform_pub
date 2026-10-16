'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react'

// -----------------
// TYPES
// -----------------
type InputPoint = {
  lat: number
  lon: number
}

type Prediction = {
  next_lat: number
  next_lon: number
}

type Props = {
  inputPoints: InputPoint[]
  prediction: Prediction
}

// -----------------
// COMPONENT (vanilla Leaflet – same approach as JourneyMap)
// -----------------
export default function ResultsLeafletMap({ inputPoints, prediction }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const [isReady, setIsReady] = useState(false)

  // Chakra dark/light tokens
  const bgColor = useColorModeValue('gray.100', 'navy.800')

  // ── Initialise map ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    let L: any

    const setupMap = async () => {
      L = (await import('leaflet')).default

      if (!mapContainerRef.current) return

      // Cleanup previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapContainerRef.current, {
        center: [40, 10],
        zoom: 3,
        scrollWheelZoom: true,
      })
      mapInstanceRef.current = map

      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || '', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Force tiles to load
      setTimeout(() => { map.invalidateSize(); setIsReady(true) }, 200)
      setTimeout(() => map.invalidateSize(), 500)
      setTimeout(() => map.invalidateSize(), 1000)
    }

    setupMap()

    // Resize observer
    let observer: ResizeObserver | null = null
    if (mapContainerRef.current) {
      observer = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize()
      })
      observer.observe(mapContainerRef.current)
    }

    return () => {
      observer?.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // ── Draw route + prediction ─────────────────────────────
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return

    const drawRoute = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current

      // Clear old layers
      layersRef.current.forEach(layer => {
        try { map.removeLayer(layer) } catch { }
      })
      layersRef.current = []

      if (!inputPoints.length) return

      const latLngs = inputPoints.map(p => [p.lat, p.lon] as [number, number])

      // ── Route polyline (brand purple) ──
      const polyline = L.polyline(latLngs, {
        color: '#4318FF',
        weight: 4,
        opacity: 0.85,
      }).addTo(map)
      layersRef.current.push(polyline)

      // ── Start marker (green) ──
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#10B981;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      const start = inputPoints[0]
      const startMarker = L.marker([start.lat, start.lon], { icon: startIcon })
        .bindPopup(`<b>🚢 Start</b><br/>${start.lat.toFixed(4)}°, ${start.lon.toFixed(4)}°`)
        .addTo(map)
      layersRef.current.push(startMarker)

      // ── End-of-window marker (orange) ──
      if (inputPoints.length > 1) {
        const endIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#F6AD55;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        const end = inputPoints[inputPoints.length - 1]
        const endMarker = L.marker([end.lat, end.lon], { icon: endIcon })
          .bindPopup(`<b>🟠 End of Window</b><br/>${end.lat.toFixed(4)}°, ${end.lon.toFixed(4)}°`)
          .addTo(map)
        layersRef.current.push(endMarker)
      }

      // ── Waypoints (small brand-purple dots, every nth) ──
      if (inputPoints.length > 2) {
        const step = Math.max(1, Math.floor(inputPoints.length / 12))
        const wpIcon = L.divIcon({
          className: '',
          html: `<div style="width:8px;height:8px;background:#4318FF;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        })
        for (let i = step; i < inputPoints.length - 1; i += step) {
          const pt = inputPoints[i]
          const m = L.marker([pt.lat, pt.lon], { icon: wpIcon }).addTo(map)
          layersRef.current.push(m)
        }
      }

      // ── Dashed line to prediction ──
      if (Number.isFinite(prediction.next_lat) && Number.isFinite(prediction.next_lon)) {
        const last = inputPoints[inputPoints.length - 1]
        const dashLine = L.polyline(
          [[last.lat, last.lon], [prediction.next_lat, prediction.next_lon]],
          { color: '#EF4444', weight: 3, dashArray: '8 6', opacity: 0.8 }
        ).addTo(map)
        layersRef.current.push(dashLine)

        // Prediction marker (red, pulsing glow)
        const predIcon = L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.6), 0 2px 6px rgba(0,0,0,0.4);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        const predMarker = L.marker([prediction.next_lat, prediction.next_lon], { icon: predIcon })
          .bindPopup(`<b>🔮 Prediction</b><br/>${prediction.next_lat.toFixed(4)}°, ${prediction.next_lon.toFixed(4)}°`)
          .addTo(map)
        layersRef.current.push(predMarker)
      }

      // ── Fit bounds to include all points + prediction ──
      const allLatLngs = [
        ...latLngs,
        ...(Number.isFinite(prediction.next_lat) ? [[prediction.next_lat, prediction.next_lon] as [number, number]] : []),
      ]
      const bounds = L.latLngBounds(allLatLngs)
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 })

      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 500)
    }

    drawRoute()
  }, [inputPoints, prediction, isReady])

  return (
    <Box position="relative" h="420px" w="100%" borderRadius="lg" overflow="hidden" bg={bgColor}>
      <Box
        ref={mapContainerRef}
        h="100%"
        w="100%"
        borderRadius="lg"
      />
    </Box>
  )
}
