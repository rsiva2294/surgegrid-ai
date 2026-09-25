import type { WeatherNextTimestep, WeatherNextPayload } from '../types/surgegrid';
import { DataLoader } from './dataLoader';

export class WeatherNextService {
  private payload: WeatherNextPayload | null = null;

  async init(): Promise<WeatherNextPayload> {
    if (!this.payload) {
      this.payload = await DataLoader.getWeatherNextForecast();
    }
    return this.payload;
  }

  getTimestepByHour(hour: number): WeatherNextTimestep | null {
    if (!this.payload) return null;
    return this.payload.timesteps.find(t => t.timestep_hour === hour) || this.payload.timesteps[0];
  }

  getLandfallTimestep(): WeatherNextTimestep | null {
    return this.getTimestepByHour(0);
  }

  getAllTimesteps(): WeatherNextTimestep[] {
    return this.payload ? this.payload.timesteps : [];
  }
}

export const weatherNextService = new WeatherNextService();
