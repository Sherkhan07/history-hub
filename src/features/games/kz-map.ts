/**
 * Simplified outline of Kazakhstan (lon/lat) for the MAP_POINT game.
 * Intentionally generalised — enough for classroom orientation tasks, not for cartography.
 */
export const KZ_OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [46.6, 48.4], [47.1, 49.2], [46.9, 49.9], [47.6, 50.4], [48.7, 50.6], [48.8, 51.2],
  [50.4, 51.6], [51.6, 51.5], [52.6, 51.4], [54.0, 51.1], [55.7, 50.6], [57.0, 51.0],
  [58.6, 50.8], [59.5, 50.6], [61.4, 50.8], [61.6, 51.3], [60.0, 51.9], [61.0, 52.3],
  [60.8, 53.1], [62.1, 53.0], [62.0, 54.0], [63.2, 54.2], [65.2, 54.4], [65.6, 55.0],
  [67.2, 54.9], [68.2, 55.2], [69.2, 55.4], [70.8, 55.3], [71.3, 54.2], [72.6, 54.2],
  [73.4, 53.9], [73.6, 53.5], [76.3, 54.3], [76.9, 54.0], [77.9, 53.3], [79.1, 52.0],
  [80.1, 50.9], [81.5, 51.0], [82.7, 50.8], [83.4, 51.0], [84.3, 50.3], [85.0, 50.0],
  [85.6, 49.3], [86.6, 49.5], [87.3, 49.1], [86.0, 48.5], [85.6, 47.2], [83.0, 47.2],
  [82.3, 45.6], [82.6, 45.2], [80.4, 45.0], [80.0, 44.2], [80.4, 42.9], [79.2, 42.8],
  [76.8, 42.9], [75.5, 42.9], [74.2, 43.2], [73.5, 42.5], [71.9, 42.6], [70.9, 42.2],
  [70.3, 41.5], [69.1, 41.4], [68.1, 40.7], [66.6, 41.2], [66.0, 42.9], [64.9, 43.7],
  [62.0, 43.5], [61.0, 44.4], [58.5, 45.6], [56.0, 45.0], [56.0, 41.3], [55.4, 41.3],
  [54.1, 42.3], [52.9, 42.1], [52.6, 42.8], [51.3, 43.2], [50.3, 44.6], [51.3, 45.2],
  [53.0, 45.3], [53.2, 46.2], [51.9, 46.9], [50.0, 46.6], [49.2, 46.4], [48.6, 46.6],
  [48.6, 47.4], [47.2, 47.8], [46.6, 48.4],
];

export const KZ_BOUNDS = { minLon: 46.0, maxLon: 88.0, minLat: 40.2, maxLat: 55.8 } as const;

/** viewBox width; height follows the projected aspect ratio */
export const MAP_WIDTH = 1000;
const LAT_CORRECTION = Math.cos((48 * Math.PI) / 180);
export const MAP_HEIGHT = Math.round(
  (MAP_WIDTH * (KZ_BOUNDS.maxLat - KZ_BOUNDS.minLat)) / ((KZ_BOUNDS.maxLon - KZ_BOUNDS.minLon) * LAT_CORRECTION),
);

export function project(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - KZ_BOUNDS.minLon) / (KZ_BOUNDS.maxLon - KZ_BOUNDS.minLon)) * MAP_WIDTH;
  const y = ((KZ_BOUNDS.maxLat - lat) / (KZ_BOUNDS.maxLat - KZ_BOUNDS.minLat)) * MAP_HEIGHT;
  return { x, y };
}

export function unproject(x: number, y: number): { lon: number; lat: number } {
  const lon = KZ_BOUNDS.minLon + (x / MAP_WIDTH) * (KZ_BOUNDS.maxLon - KZ_BOUNDS.minLon);
  const lat = KZ_BOUNDS.maxLat - (y / MAP_HEIGHT) * (KZ_BOUNDS.maxLat - KZ_BOUNDS.minLat);
  return { lon, lat };
}

export function outlinePath(): string {
  return (
    KZ_OUTLINE.map(([lon, lat], i) => {
      const { x, y } = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Reference cities to help students orient themselves */
export const KZ_CITIES = [
  { name: "Астана", lon: 71.45, lat: 51.17 },
  { name: "Алматы", lon: 76.95, lat: 43.24 },
  { name: "Шымкент", lon: 69.6, lat: 42.32 },
  { name: "Ақтөбе", lon: 57.2, lat: 50.28 },
  { name: "Атырау", lon: 51.9, lat: 47.1 },
  { name: "Өскемен", lon: 82.6, lat: 49.95 },
  { name: "Қарағанды", lon: 73.1, lat: 49.8 },
  { name: "Петропавл", lon: 69.15, lat: 54.87 },
] as const;

export const KZ_WATER = [
  { name: "Каспий", lon: 50.2, lat: 45.2 },
  { name: "Арал", lon: 60.0, lat: 45.3 },
  { name: "Балқаш", lon: 74.5, lat: 46.4 },
] as const;
