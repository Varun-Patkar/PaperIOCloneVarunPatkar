import { create } from 'zustand';
import { GameState, PlayerState } from './types';
import * as martinez from 'martinez-polygon-clipping';

// Helper function to create a circle of points
const createCircleTerritory = (radius: number, numPoints: number = 128): [number, number][] => {
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    points.push([
      Math.cos(angle) * radius, // X coordinate
      Math.sin(angle) * radius  // Z coordinate
    ]);
  }
  return points;
};

const initialPlayerState: PlayerState = {
  name: '',
  color: '#ff0000',
  position: [0, 0],
  direction: [1, 0],
  territory: createCircleTerritory(3), // Initialize with a circle of radius 3
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
  resetTrail: () => {
    set((state) => ({
      player: {
        ...state.player,
        trail: state.player.trail.length > 0 ? [state.player.trail[state.player.trail.length - 1]] : [],
      },
    }));
  },
  conquerTerritory: () => {
    set((state) => {
      // If trail is too short, don't do anything
      if (state.player.trail.length <= 1) {
        return state;
      }

      try {
        // Find the first and last points of the trail
        const firstTrailPoint = state.player.trail[0];
        const lastTrailPoint = state.player.trail[state.player.trail.length - 1];

        // Create a complete polygon from the trail by finding connection points to the territory
        let closestStartIndex = 0;
        let closestEndIndex = 0;
        let minStartDistance = Number.MAX_VALUE;
        let minEndDistance = Number.MAX_VALUE;

        // Find the closest territory points to connect the trail
        state.player.territory.forEach((point, index) => {
          // Distance to first trail point
          const startDist = Math.hypot(point[0] - firstTrailPoint[0], point[1] - firstTrailPoint[1]);
          if (startDist < minStartDistance) {
            minStartDistance = startDist;
            closestStartIndex = index;
          }

          // Distance to last trail point
          const endDist = Math.hypot(point[0] - lastTrailPoint[0], point[1] - lastTrailPoint[1]);
          if (endDist < minEndDistance) {
            minEndDistance = endDist;
            closestEndIndex = index;
          }
        });

        // Form the trail polygon by connecting it to territory
        const trailPolygon: [number, number][] = [...state.player.trail];

        // Extract portion of territory that connects the trail
        let territorySegment: [number, number][] = [];
        if (closestEndIndex >= closestStartIndex) {
          territorySegment = state.player.territory.slice(closestEndIndex, state.player.territory.length)
            .concat(state.player.territory.slice(0, closestStartIndex + 1));
        } else {
          territorySegment = state.player.territory.slice(closestEndIndex, closestStartIndex + 1);
        }

        // Complete the trail polygon
        const completeTrailPolygon = [...trailPolygon, ...territorySegment];

        // Convert to martinez format (array of arrays for polygons with holes)
        const territoryPolygon = [state.player.territory];
        const newTrailPolygon = [completeTrailPolygon];

        // Compute union using martinez
        const unionResult = martinez.union(territoryPolygon, newTrailPolygon);

        // The result might have multiple polygons; take the first one
        // (in a real game, you might want to handle multiple polygons differently)
        const newTerritory = unionResult[0][0] as [number, number][];

        // Return the updated state with new territory and reset the trail
        return {
          player: {
            ...state.player,
            territory: newTerritory,
            trail: [],
          },
        };
      } catch (error) {
        console.error("Error conquering territory:", error);
        return state;
      }
    });
  }
}));