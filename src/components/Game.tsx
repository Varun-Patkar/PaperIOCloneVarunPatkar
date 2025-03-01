import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGameStore } from "../store";
import { GameMap } from "./GameMap";
import { Minimap } from "./Minimap";
import * as THREE from "three";
import { PlayerWithTrail } from "./PlayerWithTrail";
import { GameOverScreen } from "./GameOverScreen";
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

	/*************  ✨ Codeium Command ⭐  *************/
	/**
	 * Handles touch end event.
	 * Resets joystick state and sends neutral direction ([0, 0])
	 * to the game engine.
	 */
	/******  63ebeeca-4694-49e8-a203-a893392daa9d  *******/ const handleTouchEnd =
		() => {
			setActive(false);
			setPosition({ x: 0, y: 0 });
			onDirectionChange([0, 0]);
		};

	return (
		<div className="md:hidden fixed bottom-20 right-12 z-10">
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
// Progress bar component to display territory percentage
const TerritoryProgress = () => {
	const getDisplayPercentage = useGameStore(
		(state) => state.getDisplayPercentage
	);
	const personalBest = useGameStore((state) => state.personalBest);
	const [prevPercentage, setPrevPercentage] = React.useState(0);
	const [floatingTexts, setFloatingTexts] = React.useState<
		Array<{ id: number; value: string; opacity: number; top: number }>
	>([]);
	let nextId = React.useRef(0);

	// Calculate territory percentage (scaled so 97% actual = 100% display)
	const displayPercentage = getDisplayPercentage();
	const formattedPercentage = displayPercentage.toFixed(1);

	// Calculate personal best percentage (scaled similarly)
	const scaledPersonalBest = personalBest;
	const formattedPersonalBest = personalBest.toFixed(1);

	// Check for changes to add floating text
	React.useEffect(() => {
		const numPercentage = parseFloat(formattedPercentage);
		if (prevPercentage > 0 && numPercentage > prevPercentage) {
			const difference = (numPercentage - prevPercentage).toFixed(1);

			// Add new floating text
			const newText = {
				id: nextId.current++,
				value: `+${difference}%`,
				opacity: 1,
				top: 0,
			};
			setFloatingTexts((prev) => [...prev, newText]);

			// Clean up old floating texts
			setTimeout(() => {
				setFloatingTexts((prev) =>
					prev.filter((item) => item.id !== newText.id)
				);
			}, 1500);
		}
		setPrevPercentage(numPercentage);
	}, [formattedPercentage, prevPercentage]);

	return (
		<div className="absolute top-4 right-4 w-64">
			{/* Floating increases */}
			{floatingTexts.map((text) => (
				<div
					key={text.id}
					className="absolute right-0 text-green-400 font-bold text-xl animate-float"
					style={{
						opacity: text.opacity,
						transform: `translateY(${text.top - 30}px)`,
						textShadow: "0 0 5px rgba(0,255,0,0.7), 0 0 10px rgba(0,255,0,0.5)",
					}}
				>
					{text.value}
				</div>
			))}

			{/* Main progress display */}
			<div className="bg-black bg-opacity-70 rounded-lg p-3 text-white shadow-lg border-2 border-indigo-500">
				<div className="flex justify-between items-center mb-1">
					<span className="font-bold text-lg text-yellow-300">
						CAPTURED
						<span className="ml-1 text-green-400">{formattedPercentage}%</span>
					</span>

					{/* Personal Best indicator instead of blue dot */}
					<div className="text-right px-2 py-1 bg-gradient-to-r from-yellow-600 to-amber-500 rounded-md">
						<span className="text-m text-white font-semibold">PB</span>
						<span className="block text-white font-bold">
							{formattedPersonalBest}%
						</span>
					</div>
				</div>
				<div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700 relative">
					{/* Current progress bar */}
					<div
						className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-full"
						style={{ width: `${Math.min(displayPercentage, 100)}%` }}
					></div>

					{/* Personal best marker */}
					{personalBest > 0 && (
						<div
							className="h-full w-1 bg-yellow-300 absolute top-0 bottom-0"
							style={{
								left: `calc(${scaledPersonalBest}% - 1px)`,
								boxShadow: "0 0 4px #fff, 0 0 8px #FFD700",
							}}
						></div>
					)}
				</div>
			</div>
		</div>
	);
};

export function Game() {
	const { updatePlayerDirection } = useGameStore();
	const playerRef = useRef<any>(null);
	const keysPressed = useRef<Set<string>>(new Set());
	const lastDirection = useRef(new THREE.Vector2(1, 0)); // Initial direction
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			keysPressed.current.add(e.key.toLowerCase());
			updateDirection();
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			keysPressed.current.delete(e.key.toLowerCase());
			updateDirection();
		};

		const updateDirection = () => {
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
	}, [updatePlayerDirection]);
	const handleJoystickDirection = (direction: [number, number]) => {
		if (direction[0] === 0 && direction[1] === 0) {
			// If joystick is centered, use last direction
			updatePlayerDirection([lastDirection.current.x, lastDirection.current.y]);
		} else {
			// Update direction based on joystick
			lastDirection.current.set(direction[0], direction[1]);
			updatePlayerDirection(direction);
		}
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
				<PlayerWithTrail ref={playerRef} />
			</Canvas>
			<Minimap />

			{/* Add the territory progress bar */}
			<TerritoryProgress />
			<VirtualJoystick onDirectionChange={handleJoystickDirection} />
			<GameOverScreen />
		</div>
	);
}
