import type { 
  WeatherNextPayload, 
  SubstationsPayload, 
  WardsPayload, 
  SheltersPayload 
} from '../types/surgegrid';

const cache: Record<string, any> = {};

async function fetchJson<T>(url: string): Promise<T> {
  if (cache[url]) {
    return cache[url] as T;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${url} (Status: ${response.status})`);
  }
  const data = await response.json();
  cache[url] = data;
  return data as T;
}

export const DataLoader = {
  async getWeatherNextForecast(): Promise<WeatherNextPayload> {
    return fetchJson<WeatherNextPayload>('/data/weathernext3_chennai_cyclone_48h.json');
  },

  async getSubstationsRisk(): Promise<SubstationsPayload> {
    return fetchJson<SubstationsPayload>('/data/gee_chennai_substations_risk.json');
  },

  async getWardsVulnerability(): Promise<WardsPayload> {
    return fetchJson<WardsPayload>('/data/gee_chennai_wards_vulnerability.json');
  },

  async getWardsGeoJson(): Promise<any> {
    return fetchJson<any>('/data/gcc_wards_polygons.json');
  },

  async getShelterFusion(): Promise<SheltersPayload> {
    return fetchJson<SheltersPayload>('/data/chennai_shelter_grid_drain_fusion.json');
  },

  async getDrainsGeoJson(): Promise<any> {
    return fetchJson<any>('/data/chennai_drains.json');
  },

  async getRiversGeoJson(): Promise<any> {
    return fetchJson<any>('/data/chennai_rivers.json');
  },

  async getHighGroundShelters(): Promise<any> {
    return fetchJson<any>('/data/chennai_shelters.json');
  },

  async getFloodHotspots(): Promise<any> {
    return fetchJson<any>('/data/gcc_flood_hotspots.json');
  },

  async preloadCoreDatasets() {
    return Promise.all([
      this.getWeatherNextForecast(),
      this.getSubstationsRisk(),
      this.getWardsVulnerability(),
      this.getWardsGeoJson(),
      this.getShelterFusion(),
      this.getDrainsGeoJson(),
      this.getRiversGeoJson(),
      this.getHighGroundShelters()
    ]);
  }
};
