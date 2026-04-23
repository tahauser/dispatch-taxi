import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { GpsLogInput, Stop } from '../types/api';
import { postGpsLogs } from '../api/gpsLogs';

const FLUSH_MS = 30_000;
const BATCH_TRIGGER = 10;

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UseGpsTrackingOptions {
  routeId: string | null;
  stops: Stop[];
  enabled: boolean;
}

export interface UseGpsTrackingResult {
  position: Location.LocationObject | null;
  nearbyStop: Stop | null;
  hasPermission: boolean;
  flush: () => Promise<void>;
}

export function useGpsTracking({
  routeId,
  stops,
  enabled,
}: UseGpsTrackingOptions): UseGpsTrackingResult {
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [nearbyStop, setNearbyStop] = useState<Stop | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const queueRef = useRef<GpsLogInput[]>([]);
  const insideRef = useRef<Set<string>>(new Set());
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0);
    try {
      await postGpsLogs(batch);
    } catch {
      // Re-queue on failure, cap at 200 to avoid memory bloat
      queueRef.current = [...batch, ...queueRef.current].slice(-200);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !routeId) return;
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status !== 'granted') {
        setHasPermission(false);
        return;
      }
      setHasPermission(true);

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5_000 },
        (loc) => {
          if (!active) return;
          setPosition(loc);

          const lat = loc.coords.latitude;
          const lon = loc.coords.longitude;
          const ts = new Date(loc.timestamp).toISOString();

          // Geofence check — pending stops only
          const pending = stops.filter(
            (s) => s.statut === 'en_attente' || s.statut === 'en_approche',
          );
          let closest: Stop | null = null;
          let closestDist = Infinity;

          for (const stop of pending) {
            const dist = haversineM(lat, lon, stop.latitude, stop.longitude);
            if (dist < closestDist) {
              closestDist = dist;
              closest = stop;
            }

            const inside = dist <= stop.rayon_geofence_m;
            const wasInside = insideRef.current.has(stop.id);

            if (inside && !wasInside) {
              insideRef.current.add(stop.id);
              queueRef.current.push({
                latitude: lat, longitude: lon, timestamp_device: ts,
                route_id: routeId, stop_id: stop.id, event_type: 'geofence_enter',
              });
            } else if (!inside && wasInside) {
              insideRef.current.delete(stop.id);
              queueRef.current.push({
                latitude: lat, longitude: lon, timestamp_device: ts,
                route_id: routeId, stop_id: stop.id, event_type: 'geofence_exit',
              });
            }
          }

          setNearbyStop(
            closest && closestDist <= closest.rayon_geofence_m ? closest : null,
          );

          queueRef.current.push({
            latitude: lat, longitude: lon, timestamp_device: ts,
            vitesse_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : undefined,
            precision_m: loc.coords.accuracy ?? undefined,
            route_id: routeId,
            event_type: 'tracking',
          });

          if (queueRef.current.length >= BATCH_TRIGGER) void flush();
        },
      );

      timerRef.current = setInterval(() => void flush(), FLUSH_MS);
    })();

    return () => {
      active = false;
      watchRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      void flush();
    };
  }, [enabled, routeId, stops, flush]);

  return { position, nearbyStop, hasPermission, flush };
}
