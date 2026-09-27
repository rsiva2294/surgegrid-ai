/**
 * index.ts (src/mcp/)
 *
 * Central MCP Registry & Provider Resolver for SurgeGrid AI.
 *
 * Manages active grid providers and exposes standard MCP tool declarations
 * for Google Gemini 3.7 Flash and external utility systems.
 */

import type { GridMcpProvider } from './gridProtocol';
import { TnebChennaiMcpAdapter } from './adapters/tnebChennaiAdapter';
import { OptclOdishaMcpAdapter } from './adapters/optclOdishaAdapter';

export * from './gridProtocol';
export * from './adapters/tnebChennaiAdapter';
export * from './adapters/optclOdishaAdapter';

// Global registry of state grid adapters
const providerRegistry = new Map<string, GridMcpProvider>();

// Register out-of-the-box adapters
const chennaiAdapter = new TnebChennaiMcpAdapter();
const odishaAdapter = new OptclOdishaMcpAdapter();

providerRegistry.set(chennaiAdapter.manifest.id, chennaiAdapter);
providerRegistry.set(odishaAdapter.manifest.id, odishaAdapter);

// Default active provider: Greater Chennai (TNEB - Ground Truth Live Benchmark)
let activeProvider: GridMcpProvider = chennaiAdapter;

/**
 * Get the currently active Grid MCP Provider
 */
export function getActiveGridProvider(): GridMcpProvider {
  return activeProvider;
}

/**
 * Switch the active Grid MCP Provider dynamically at runtime (Plug and Play)
 */
export function setActiveGridProvider(providerIdOrInstance: string | GridMcpProvider): void {
  if (typeof providerIdOrInstance === 'string') {
    const found = providerRegistry.get(providerIdOrInstance);
    if (!found) {
      throw new Error(`MCP Grid Provider "${providerIdOrInstance}" not found in registry.`);
    }
    activeProvider = found;
  } else {
    activeProvider = providerIdOrInstance;
    providerRegistry.set(providerIdOrInstance.manifest.id, providerIdOrInstance);
  }
}

/**
 * Register a new state DISCOM / utility provider (e.g. MSEDCL, BESCOM, WBSEDCL)
 */
export function registerGridProvider(provider: GridMcpProvider): void {
  providerRegistry.set(provider.manifest.id, provider);
}

/**
 * List all available registered grid providers
 */
export function listRegisteredGridProviders(): GridMcpProvider[] {
  return Array.from(providerRegistry.values());
}
