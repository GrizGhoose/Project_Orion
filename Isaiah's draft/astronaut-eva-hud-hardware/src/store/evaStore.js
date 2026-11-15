import { create } from 'zustand';
import { HUD_DEFAULTS } from '../constants/config';
import { normaliseOptics } from '../features/helmet/geometry/visorGeometry';

// Local optics and display preferences intentionally do not sync between browser instances.
export const useEvaStore = create((set) => ({
  mode: 'standard',
  presentation: import.meta.env.DEV ? 'development' : 'astronaut',
  suitRequested: false,
  setPresentation: (presentation) => set({ presentation }),
  toggleSuit: () => set((state) => ({ suitRequested: !state.suitRequested })),
  astronautId: 'EV1',
  hud: HUD_DEFAULTS,
  setMode: (mode) => set({ mode }),
  setAstronaut: (astronautId) => set({ astronautId }),
  configureHud: (patch) => set((state) => ({ hud: { ...state.hud, ...patch } })),
  configureGeometry: (patch) =>
    set((state) => ({
      hud: { ...state.hud, geometry: normaliseOptics({ ...state.hud.geometry, ...patch }) },
    })),
}));
