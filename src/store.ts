import { create } from 'zustand';
import { GameState, PlayerState } from './types';

const initialPlayerState: PlayerState = {
  name: '',
  color: '#ff0000',
  position: [0, 0],
  direction: [1, 0],
  territory: [],
  trail: [],
};

export const useGameStore = create<GameState>((set) => ({
  player: initialPlayerState,
  gameStarted: false,
  setPlayerName: (name) =>
    set((state) => ({ player: { ...state.player, name } })),
  setPlayerColor: (color) =>
    set((state) => ({ player: { ...state.player, color } })),
  startGame: () => set({ gameStarted: true }),
  updatePlayerPosition: (position) =>
    set((state) => ({ player: { ...state.player, position } })),
  updatePlayerDirection: (direction) =>
    set((state) => ({ player: { ...state.player, direction } })),
  addToTrail: (position) =>
    set((state) => ({
      player: { ...state.player, trail: [...state.player.trail, position] },
    })),
  convertTrailToTerritory: () =>
    set((state) => ({
      player: {
        ...state.player,
        territory: [...state.player.territory, ...state.player.trail],
        trail: [],
      },
    })),
}));