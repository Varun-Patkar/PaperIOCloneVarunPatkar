import React, { useRef, useEffect } from "react";
import { GameEntityWithTrail } from "./GameEntity";
import * as THREE from "three";
import { useGameStore } from "../store"; // Import store
import { BotState } from "../types"; // Import BotState type

// Bot manager props
interface BotManagerProps {
	gameStarted: boolean;
	isGameOver: boolean;
}

// Helper function to check if a point is in a polygon (can be moved to utils)
const isPointInPolygon = (
	point: [number, number],
	polygon: [number, number][]
): boolean => {
	if (!polygon || polygon.length < 3) return false;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i][0],
			yi = polygon[i][1];
		const xj = polygon[j][0],
			yj = polygon[j][1];
		const intersect =
			yi > point[1] !== yj > point[1] &&
			point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
};

export const BotManager: React.FC<BotManagerProps> = ({
	gameStarted,
	isGameOver,
}) => {
	// Get bots and actions from the store
	const bots = useGameStore((state) => state.bots);
	const updateBotState = useGameStore((state) => state.updateBotState);
	const addBotToTrail = useGameStore((state) => state.addBotToTrail);
	const resetBotTrail = useGameStore((state) => state.resetBotTrail);
	const conquerBotTerritory = useGameStore(
		(state) => state.conquerBotTerritory
	);

	// Refs for each bot entity (optional, depends if direct manipulation is needed)
	const botRefs = useRef<(THREE.Group | null)[]>([]);
	useEffect(() => {
		botRefs.current = bots.map(() => null);
	}, [bots.length]); // Adjust refs array size when bots change

	// Bot update logic (decision making) - runs locally but updates store
	useEffect(() => {
		if (!gameStarted || isGameOver) return;

		const botUpdateInterval = setInterval(() => {
			bots.forEach((bot) => {
				// Simple AI: Change direction randomly sometimes or when near edge
				let newDirection = [...bot.direction] as [number, number];
				const changeDirection = Math.random() < 0.02; // 2% chance each interval

				// Check map boundary (adjust radius slightly)
				const nextPotentialX = bot.position[0] + bot.direction[0] * 0.5; // Look ahead slightly
				const nextPotentialZ = bot.position[1] + bot.direction[1] * 0.5;
				const distance = Math.sqrt(nextPotentialX ** 2 + nextPotentialZ ** 2);

				if (distance > 48 || changeDirection) {
					// Turn randomly (e.g., 90 degrees left or right)
					const turnRight = Math.random() > 0.5;
					if (turnRight) {
						newDirection = [bot.direction[1], -bot.direction[0]];
					} else {
						newDirection = [-bot.direction[1], bot.direction[0]];
					}
				}

				// Update direction in the store if it changed
				if (
					newDirection[0] !== bot.direction[0] ||
					newDirection[1] !== bot.direction[1]
				) {
					updateBotState(bot.id, { direction: newDirection });
				}

				// Note: Actual position update is handled by GameEntity via onPositionUpdate prop
				// which calls the updateBotState action below.
			});
		}, 200); // Update AI decision logic less frequently than movement

		return () => clearInterval(botUpdateInterval);
	}, [gameStarted, isGameOver, bots, updateBotState]); // Depend on bots array

	// Helper function to check if a point is in the bot's territory (uses store data)
	const isPointInBotTerritory = (
		botId: number,
		point: [number, number]
	): boolean => {
		const bot = bots.find((b) => b.id === botId);
		return bot ? isPointInPolygon(point, bot.territory) : false;
	};

	// Update position function for bots (updates store)
	const handlePositionUpdate = (
		botId: number,
		newPosition: [number, number]
	) => {
		updateBotState(botId, { position: newPosition });
	};

	// Update direction function for bots (updates store)
	const handleDirectionUpdate = (
		botId: number,
		newDirection: [number, number]
	) => {
		updateBotState(botId, { direction: newDirection });
	};

	// Add to trail function for bots (updates store)
	const handleTrailUpdate = (botId: number, position: [number, number]) => {
		addBotToTrail(botId, position);
	};

	// Reset trail function for bots (updates store)
	const handleResetTrail = (botId: number) => {
		resetBotTrail(botId);
	};

	// "Conquer territory" function for bots (updates store)
	const handleConquerTerritory = (botId: number) => {
		conquerBotTerritory(botId);
	};

	// Handle self-intersection for bots (updates store)
	const handleSelfIntersection = (botId: number) => {
		// Simple handling: just reset the trail
		resetBotTrail(botId);
	};

	// REMOVED: Hidden div logic for minimap

	return (
		<>
			{bots.map((bot, index) => (
				<GameEntityWithTrail
					key={bot.id}
					ref={(el) => {
						if (el) botRefs.current[index] = el;
					}}
					name={bot.name}
					color={bot.color}
					position={bot.position}
					direction={bot.direction}
					territory={bot.territory}
					trail={bot.trail}
					active={gameStarted && !isGameOver}
					// Pass store actions bound to the specific bot's ID
					onPositionUpdate={(pos) => handlePositionUpdate(bot.id, pos)}
					onDirectionUpdate={(dir) => handleDirectionUpdate(bot.id, dir)}
					onTrailUpdate={(pos) => handleTrailUpdate(bot.id, pos)}
					onConquerTerritory={() => handleConquerTerritory(bot.id)}
					onResetTrail={() => handleResetTrail(bot.id)}
					insideTerritoryCheck={(pos) => isPointInBotTerritory(bot.id, pos)}
					onSelfIntersection={() => handleSelfIntersection(bot.id)}
					moveSpeed={6.0} // Bots slightly slower
				/>
			))}
		</>
	);
};
