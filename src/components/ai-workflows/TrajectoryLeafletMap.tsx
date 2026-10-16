'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Flex,
  HStack,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

import { apiClient } from '@/lib/apiClient'

// -----------------
// TYPES
// -----------------
type Feature = {
  type: 'Feature'
  geometry:
    | { type: 'LineString'; coordinates: [number, number][] }
    | { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, any>
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Feature[]
}

type Props = {
  /** MinIO bucket holding the GeoJSON the job wrote. */
  bucket: string
  /** Object key of the GeoJSON, e.g. trajectories/geojson/date=.../trajectories.geojson */
  objectKey: string
  height?: string
}

// Distinct enough to tell adjacent voyages apart without a legend per line.
const TRACK_COLORS = [
  '#4318FF', '#01B574', '#FFB547', '#E31A1A',
  '#3965FF', '#00B5D8', '#B794F4', '#F6893D',
]

function dot(color: string, size = 16, extra = '') {
  return `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);${extra}"></div>`
}

function fmtTime(iso?: string) {
  if (!iso) return '—'
  // The job writes UTC ISO strings; show them as such rather than silently
  // reinterpreting them in the viewer's timezone.
  return String(iso).replace('T', ' ').replace(/(\.\d+)?(Z|\+00:00)$/, ' UTC')
}

// -----------------
// COMPONENT (vanilla Leaflet — same approach as ai-models/ResultsLeafletMap)
// -----------------
export default function TrajectoryLeafletMap({
  bucket,
  objectKey,
  height = '460px',
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const [isReady, setIsReady] = useState(false)
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [error, setError] = useState<string | null>(null)

  const panelBg = useColorModeValue('gray.50', 'navy.800')
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200')
  const textColor = useColorModeValue('gray.700', 'white')
  const descColor = useColorModeValue('gray.500', 'gray.400')

  // ── Fetch the GeoJSON the job produced ──────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)
      setGeo(null)
      try {
        // Encode each segment so slashes survive as path separators for the
        // backend's `object_name:path` parameter.
        const encoded = objectKey.split('/').map(encodeURIComponent).join('/')
        const res = await apiClient.getRaw(
          `/api/v1/minio/buckets/${encodeURIComponent(bucket)}/objects/${encoded}`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as FeatureCollection
        if (!cancelled) setGeo(data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load the map data')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [bucket, objectKey])

  // ── Initialise the map once ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const setupMap = async () => {
      const L = (await import('leaflet')).default
      if (!mapContainerRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapContainerRef.current, {
        center: [40, 10],
        zoom: 4,
        scrollWheelZoom: true,
      })
      mapInstanceRef.current = map

      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || '', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // The modal animates open, so the container has no size on first paint.
      setTimeout(() => {
        map.invalidateSize()
        setIsReady(true)
      }, 200)
      setTimeout(() => map.invalidateSize(), 600)
    }

    setupMap()

    let observer: ResizeObserver | null = null
    if (mapContainerRef.current) {
      observer = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize())
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

  // ── Draw the trajectories ───────────────────────────────
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current || !geo) return

    const draw = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current

      layersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer)
        } catch {
          /* layer already gone */
        }
      })
      layersRef.current = []

      const features = geo.features || []
      const bounds: [number, number][] = []
      let trackIdx = 0

      for (const f of features) {
        const kind = f.properties?.kind
        const g = f.geometry

        if (g?.type === 'LineString') {
          // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
          const latLngs = g.coordinates.map(
            ([lon, lat]) => [lat, lon] as [number, number],
          )
          if (!latLngs.length) continue
          bounds.push(...latLngs)

          const color = TRACK_COLORS[trackIdx % TRACK_COLORS.length]
          trackIdx += 1

          const p = f.properties || {}
          const line = L.polyline(latLngs, { color, weight: 4, opacity: 0.85 })
            .bindPopup(
              `<b>Vessel ${p.vessel} · ${p.leg_id}</b><br/>` +
                `${fmtTime(p.start)}<br/>to ${fmtTime(p.end)}<br/><br/>` +
                `<b>${Number(p.distance_nm).toFixed(0)} nm</b> in ` +
                `${Number(p.duration_h).toFixed(1)} h<br/>` +
                `avg ${Number(p.avg_sog).toFixed(1)} kn · max ` +
                `${Number(p.max_sog).toFixed(1)} kn<br/>` +
                `${p.points} positions`,
            )
            .addTo(map)
          layersRef.current.push(line)
          continue
        }

        if (g?.type !== 'Point') continue
        const [lon, lat] = g.coordinates
        bounds.push([lat, lon])
        const p = f.properties || {}

        let html = ''
        let popup = ''
        if (kind === 'start') {
          html = dot('#01B574')
          popup = `<b>Departure</b><br/>Vessel ${p.vessel} · ${p.leg_id}<br/>${fmtTime(p.time)}`
        } else if (kind === 'end') {
          html = dot('#E31A1A')
          popup = `<b>Arrival</b><br/>Vessel ${p.vessel} · ${p.leg_id}<br/>${fmtTime(p.time)}`
        } else if (kind === 'stop') {
          html = dot('#FFB547', 14)
          const mins = Number(p.minutes)
          const dur = mins >= 60 ? `${(mins / 60).toFixed(1)} h` : `${mins.toFixed(0)} min`
          popup =
            `<b>Stopped ${dur}</b><br/>Vessel ${p.vessel}<br/>` +
            `${fmtTime(p.from)}<br/>to ${fmtTime(p.to)}`
        } else {
          continue
        }

        const marker = L.marker([lat, lon], {
          icon: L.divIcon({ className: '', html, iconSize: [16, 16], iconAnchor: [8, 8] }),
        })
          .bindPopup(popup)
          .addTo(map)
        layersRef.current.push(marker)
      }

      if (bounds.length) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 11 })
      }
    }

    draw()
  }, [isReady, geo])

  const summary = useMemo(() => {
    if (!geo) return null
    const tracks = geo.features.filter((f) => f.properties?.kind === 'trajectory')
    const stops = geo.features.filter((f) => f.properties?.kind === 'stop')
    const nm = tracks.reduce((a, f) => a + (Number(f.properties?.distance_nm) || 0), 0)
    const vessels = new Set(tracks.map((f) => f.properties?.vessel)).size
    return { tracks: tracks.length, stops: stops.length, nm, vessels }
  }, [geo])

  return (
    <Box
      bg={panelBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Flex px={4} py={3} justify="space-between" align="center" wrap="wrap" gap={2}>
        <HStack spacing={4}>
          <HStack spacing={2}>
            <Box w="10px" h="10px" borderRadius="full" bg="#01B574" />
            <Text fontSize="xs" color={descColor}>Departure</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w="10px" h="10px" borderRadius="full" bg="#E31A1A" />
            <Text fontSize="xs" color={descColor}>Arrival</Text>
          </HStack>
          <HStack spacing={2}>
            <Box w="10px" h="10px" borderRadius="full" bg="#FFB547" />
            <Text fontSize="xs" color={descColor}>Stopped</Text>
          </HStack>
        </HStack>
        {summary && (
          <Text fontSize="xs" color={textColor} fontWeight="600">
            {summary.tracks} {summary.tracks === 1 ? 'trajectory' : 'trajectories'} ·{' '}
            {summary.vessels} {summary.vessels === 1 ? 'vessel' : 'vessels'} ·{' '}
            {summary.nm.toFixed(0)} nm · {summary.stops}{' '}
            {summary.stops === 1 ? 'stop' : 'stops'}
          </Text>
        )}
      </Flex>

      <Box position="relative" h={height} w="100%">
        <Box ref={mapContainerRef} h="100%" w="100%" />

        {(!geo || !isReady) && !error && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            bg="blackAlpha.300"
            zIndex={500}
          >
            <HStack spacing={3}>
              <Spinner size="sm" color="white" />
              <Text fontSize="sm" color="white">Loading trajectories…</Text>
            </HStack>
          </Flex>
        )}

        {error && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            bg="blackAlpha.500"
            zIndex={500}
            px={6}
          >
            <Text fontSize="sm" color="white" textAlign="center">
              Could not load the map data ({error}). The file is still in object
              storage — check that your role grants access to <b>{bucket}</b>.
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  )
}
