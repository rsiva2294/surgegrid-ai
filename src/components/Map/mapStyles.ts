/**
 * mapStyles.ts
 * 
 * Google Maps Vector/Raster JSON Map Styles & Spatial Boundary Clamping
 * Strictly optimized for Zero-POI clean cartography and zero out-of-district tile fetches.
 */

export const NO_POI_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#060a12" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#060a12" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#121b2a" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0a101b" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#1c283f" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f1726" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#040914" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#040914" }]
  }
];

export const NO_POI_LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#edf2f7" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0f172a" }, { weight: 600 }]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#dbe3eb" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#94a3b8" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1e293b" }, { weight: 600 }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfe1f8" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0369a1" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }]
  }
];

/**
 * Strict Chennai Metropolitan Area (CMA) District & Peri-Urban EHT Corridor Bounds
 * North: Minjur / Alamathy 400kV (13.40 N)
 * South: Kelambakkam / Siruseri / Chengalpattu border (12.75 N)
 * West: Sriperumbudur 400kV corridor (79.85 E)
 * East: Bay of Bengal coastline (80.38 E)
 * Clamps viewport to prevent out-of-district tile requests and unnecessary network bandwidth.
 */
export const CHENNAI_METRO_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 13.4000,
  south: 12.7500,
  west: 79.8500,
  east: 80.3800
};
