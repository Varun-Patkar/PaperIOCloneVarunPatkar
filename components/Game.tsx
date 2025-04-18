import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGameStore } from "../store";
import { GameMap } from "./GameMap";
import { Minimap } from "./Minimap";
import * as THREE from "three";
import { GameEntityWithTrail } from "./GameEntity";
import { GameOverScreen } from "./GameOverScreen";
import { BotManager } from "./BotManager";
import { LeaderboardEntry, OtherEntityTrail } from "../types"; // Import types

// Define proper types for the joystick props
interface VirtualJoystickProps {
	onDirectionChange: (direction: [number, number]) => void;
}

// Virtual Joystick Component for mobile devices
const VirtualJoystick = ({ onDirectionChange }: VirtualJoystickProps) => {
	const joystickRef = useRef<HTMLDivElement>(null);
	const knobRef = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const maxDistance = 40; // Maximum distance the joystick can move

	// Function to calculate joystick position and direction
	const updateJoystickPosition = (clientX: number, clientY: number) => {
		if (!joystickRef.current || !active) return;

		const rect = joystickRef.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		// Calculate distance from center
		let deltaX = clientX - centerX;
		let deltaY = clientY - centerY;

		// Calculate distance
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Normalize if beyond max distance
		if (distance > maxDistance) {
			deltaX = (deltaX / distance) * maxDistance;
			deltaY = (deltaY / distance) * maxDistance;
		}

		// Update knob position
		setPosition({ x: deltaX, y: deltaY });

		// Calculate direction vector and normalize
		const dirX = deltaX / (distance || 1); // Avoid division by zero
		const dirY = deltaY / (distance || 1);

		// Only send direction update if joystick is moved significantly
		if (distance > 5) {
			onDirectionChange([dirX, dirY]); // Negate X for proper left/right mapping
		} else {
			onDirectionChange([0, 0]); // No movement if joystick is centered
		}
	};

	// Touch event handlers
	const handleTouchStart = (e: React.TouchEvent) => {
		e.preventDefault();
		setActive(true);
		updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		e.preventDefault();
		if (active) {
			updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
		}
	};
	const handleTouchEnd = () => {
		setActive(false);
		setPosition({ x: 0, y: 0 });
		onDirectionChange([0, 0]);
	};

	return (
		<div className="md:hidden fixed bottom-20 right-12 z-10 joystick-container">
			<div
				ref={joystickRef}
				className="w-32 h-32 rounded-full bg-black bg-opacity-25 border-2 border-white border-opacity-30 flex items-center justify-center"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				<div
					ref={knobRef}
					className="w-16 h-16 rounded-full bg-white bg-opacity-50 shadow-lg"
					style={{
						transform: `translate(${position.x}px, ${position.y}px)`,
						transition: active ? "none" : "transform 0.2s ease-out",
					}}
				></div>
			</div>
		</div>
	);
};

// Leaderboard Component - Updated
const Leaderboard = () => {
	const leaderboardData = useGameStore((state) => state.getLeaderboardData()); // Already filters dead bots
	const personalBest = useGameStore((state) => state.personalBest);
	const formattedPersonalBest = personalBest.toFixed(1);
	const MAX_LEADERBOARD_ENTRIES = 5; // Show top 5 including player

	// ... getDisplayEntries logic (unchanged) ...
	const displayEntries = leaderboardData.slice(0, MAX_LEADERBOARD_ENTRIES); // Simpler now as data is pre-filtered/sorted

	return (
		// Added overflow-hidden to the main container
		<div className="absolute top-4 right-4 w-64 bg-black bg-opacity-70 rounded-lg p-3 text-white shadow-lg border border-gray-700 overflow-hidden">
			{/* Adjusted padding and text size slightly */}
			<div className="flex justify-between items-center mb-1 border-b border-gray-600 pb-1">
				<h2 className="font-bold text-base text-yellow-300">LEADERBOARD</h2>{" "}
				{/* Slightly smaller heading */}
				<div className="text-right">
					<span className="text-xs text-gray-400 block">Personal Best</span>
					<span className="text-sm font-semibold text-yellow-500">
						{formattedPersonalBest}%
					</span>
				</div>
			</div>
			{/* Change space-y-px back to space-y-0.5 */}
			<ul className="space-y-0.5">
				{" "}
				{/* Keep small space between items */} {/* Slightly increased space */}{" "}
				{/* Reduced space between items further */}
				{displayEntries.map((entry, index) => (
					<li
						key={entry.id}
						// Increase vertical padding: py-1 when full, py-1.5 otherwise
						className={`flex justify-between items-center py-1 px-1 rounded transition-all duration-500 ease-out ${
							entry.isPlayer
								? "bg-blue-900 bg-opacity-50 border border-blue-700"
								: "bg-gray-800 bg-opacity-50"
						}`}
						// Removed transform style, rely on flex/padding for layout
					>
						{/* Left side: Rank, Color, Name */}
						<div className="flex items-center space-x-1.5 overflow-hidden flex-1 min-w-0 mr-2">
							{" "}
							{/* Added flex-1, min-w-0, mr-2 */}
							<span className="font-semibold text-xs w-5 text-right flex-shrink-0">
								{" "}
								{/* Added flex-shrink-0 */}
								{index + 1}.
							</span>
							<div
								className="w-2.5 h-2.5 rounded-full flex-shrink-0" // Ensure dot doesn't shrink text
								style={{ backgroundColor: entry.color }}
							></div>
							<span
								className={`truncate text-xs ${
									// Ensure truncation works
									entry.isPlayer ? "font-bold text-yellow-300" : "text-gray-300"
								}`}
								title={entry.name}
							>
								{entry.name}
							</span>
						</div>
						{/* Right side: Kills, Percentage */}
						<div className="flex items-center space-x-2 flex-shrink-0">
							{" "}
							{/* Added flex container and spacing */}
							{/* Kill Count */}
							<span className="text-xs text-red-400 font-semibold">
								{" "}
								{/* Kill count style */}
								{entry.killCount}🔪
							</span>
							{/* Percentage */}
							<span className="font-semibold text-xs text-green-400 w-10 text-right">
								{" "}
								{/* Fixed width for alignment */}
								{entry.percentage.toFixed(1)}%
							</span>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
};

export function Game() {
	const {
		updatePlayerDirection,
		player,
		bots, // Get bots state
		updatePlayerPosition,
		conquerPlayerTerritory, // Renamed action
		resetPlayerTrail, // Renamed action
		gameStarted,
		isGameOver,
		setGameOver,
		addPlayerToTrail, // Renamed action
		killBot, // Action to kill bots
	} = useGameStore();

	const playerRef = useRef<any>(null);
	const keysPressed = useRef<Set<string>>(new Set());
	const lastDirection = useRef(new THREE.Vector2(1, 0));

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isGameOver) return; // Ignore input if game is over
			keysPressed.current.add(e.key.toLowerCase());
			updateDirection();
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (isGameOver) return; // Ignore input if game is over
			keysPressed.current.delete(e.key.toLowerCase());
			updateDirection();
		};

		const updateDirection = () => {
			if (isGameOver) return; // Double check
			let newDirection = new THREE.Vector2(0, 0);

			// Support both WASD and arrow keys
			if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) {
				newDirection.y = -1;
			}
			if (
				keysPressed.current.has("s") ||
				keysPressed.current.has("arrowdown")
			) {
				newDirection.y = 1;
			}
			if (
				keysPressed.current.has("a") ||
				keysPressed.current.has("arrowleft")
			) {
				newDirection.x = -1;
			}
			if (
				keysPressed.current.has("d") ||
				keysPressed.current.has("arrowright")
			) {
				newDirection.x = 1;
			}

			newDirection.normalize(); // Normalize to ensure consistent speed

			if (newDirection.lengthSq() > 0) {
				lastDirection.current.copy(newDirection); // Update last direction
				updatePlayerDirection([newDirection.x, newDirection.y]);
			} else {
				// No keys pressed, continue in the last direction
				updatePlayerDirection([
					lastDirection.current.x,
					lastDirection.current.y,
				]);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [updatePlayerDirection, isGameOver]); // Add isGameOver dependency

	const handleJoystickDirection = (direction: [number, number]) => {
		if (isGameOver) return; // Ignore input if game is over
		if (direction[0] === 0 && direction[1] === 0) {
			// If joystick is centered, use last direction
			updatePlayerDirection([lastDirection.current.x, lastDirection.current.y]);
		} else {
			// Update direction based on joystick
			lastDirection.current.set(direction[0], direction[1]);
			updatePlayerDirection(direction);
		}
	};

	// Function to check if a point is inside the player's territory
	const isPointInTerritory = (position: [number, number]): boolean => {
		if (player.territory.length < 3) return false;

		let inside = false;
		for (
			let i = 0, j = player.territory.length - 1;
			i < player.territory.length;
			j = i++
		) {
			const xi = player.territory[i][0],
				yi = player.territory[i][1];
			const xj = player.territory[j][0],
				yj = player.territory[j][1];

			const intersect =
				yi > position[1] !== yj > position[1] &&
				position[0] < ((xj - xi) * (position[1] - yi)) / (yj - yi) + xi;

			if (intersect) inside = !inside;
		}
		return inside;
	};

	const CameraController = () => {
		const CAMERA_HEIGHT = 12; // Height of camera
		const CAMERA_DISTANCE = 15; // Distance from player
		const CAMERA_ANGLE = 0; // No tilt

		useFrame((state) => {
			if (playerRef.current) {
				const x = playerRef.current.position.x;
				const z = playerRef.current.position.z;

				// Calculate camera position with rotation
				const cameraX = x - Math.sin(CAMERA_ANGLE) * CAMERA_DISTANCE;
				const cameraY = CAMERA_HEIGHT;
				const cameraZ = z + Math.cos(CAMERA_ANGLE) * CAMERA_DISTANCE;

				// Position camera at an angle
				state.camera.position.set(cameraX, cameraY, cameraZ);

				// Look at player position
				state.camera.lookAt(x, 0, z);
			}
		});
		return null;
	};

	// --- Collision Handlers for Player ---

	// Player hits own trail
	const handleSelfIntersection = () => {
		// console.log("Player detected self-intersection via handler.");
		setGameOver(false, "self"); // Player dies by self-collision
	};

	// Player hits a bot's trail
	const handleBotTrailCollision = (killedBotId: number) => {
		// console.log(`Player hit bot ${killedBotId}'s trail via handler.`);
		killBot(killedBotId, "player"); // Kill the bot, player is the killer
	};

	// Prepare data for collision checks
	const aliveBotsData: OtherEntityTrail[] = bots
		.filter((b) => b.isAlive)
		.map((b) => ({ id: b.id, trail: b.trail }));

	return (
		<div className="w-full h-screen relative">
			<Canvas shadows>
				<ambientLight intensity={0.8} />
				<directionalLight
					position={[0, 50, 0]}
					intensity={1}
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={100}
					shadow-camera-left={-50}
					shadow-camera-right={50}
					shadow-camera-top={50}
					shadow-camera-bottom={-50}
					shadow-bias={-0.0001}
				/>
				<CameraController />
				<GameMap />
				<GameEntityWithTrail
					ref={playerRef}
					// Entity Identification
					entityId={"player"}
					isBot={false}
					// Basic Props
					name={player.name || "You"} // Use player name or default
					color={player.color}
					position={player.position}
					direction={player.direction}
					territory={player.territory}
					trail={player.trail} // Pass trail for conquest logic & visualization
					active={gameStarted && !isGameOver}
					moveSpeed={8.0}
					// State Update Callbacks
					onPositionUpdate={updatePlayerPosition}
					onDirectionUpdate={updatePlayerDirection}
					onTrailUpdate={(pos) => addPlayerToTrail(pos)} // For conquest logic
					onConquerTerritory={conquerPlayerTerritory}
					onResetTrail={resetPlayerTrail}
					insideTerritoryCheck={isPointInTerritory}
					// Collision Data Props
					otherBots={aliveBotsData} // Pass alive bots' trails
					// playerTrail prop is not needed for the player entity
					// Collision Callback Props
					onSelfIntersection={handleSelfIntersection} // Player dies
					onBotTrailCollision={handleBotTrailCollision} // Bot dies
					// onPlayerTrailCollision is not needed for player
					// onBotBotTrailCollision is not needed for player
				/>

				{/* Render BotManager which handles its own alive bots */}
				<BotManager gameStarted={gameStarted} isGameOver={isGameOver} />
			</Canvas>
			<Minimap />
			<Leaderboard /> {/* Updated Leaderboard */}
			{!isGameOver && (
				<VirtualJoystick onDirectionChange={handleJoystickDirection} />
			)}
			<GameOverScreen />
		</div>
	);
}
