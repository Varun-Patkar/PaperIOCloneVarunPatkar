import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGameStore } from "../store";
import { Player } from "./Player";
import { GameMap } from "./GameMap";
import { Minimap } from "./Minimap";
import * as THREE from "three";

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

			if (keysPressed.current.has("w")) {
				newDirection.y = -1;
			}
			if (keysPressed.current.has("s")) {
				newDirection.y = 1;
			}
			if (keysPressed.current.has("a")) {
				newDirection.x = -1;
			}
			if (keysPressed.current.has("d")) {
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
		<div className="w-full h-screen">
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
				<Player ref={playerRef} />
			</Canvas>
			<Minimap />
		</div>
	);
}
