import React, {
	useRef,
	forwardRef,
	useImperativeHandle,
	useEffect,
	useMemo,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useGameStore } from "../store";
import * as THREE from "three";

const MAP_RADIUS = 50; // Define the map radius
const ROTATION_TIME = 0.2; // seconds per 45 degrees
// Add this helper function
const getAngleDifference = (current: number, target: number): number => {
	let diff = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
	if (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
};

export const Player = forwardRef<THREE.Group, {}>((props, ref) => {
	const { player, updatePlayerPosition, updatePlayerDirection } =
		useGameStore();
	const groupRef = useRef<THREE.Group>(null);
	const currentDirection = useRef(
		new THREE.Vector2(player.direction[0], player.direction[1])
	);
	const boxRef = useRef<THREE.Mesh>(null);
	const moveSpeed = 0.05;
	const targetAngle = useRef(0);
	const currentAngle = useRef(0);

	// Update currentDirection when player.direction changes
	useEffect(() => {
		currentDirection.current.set(player.direction[0], player.direction[1]);
	}, [player.direction]);

	useFrame((_, delta) => {
		if (groupRef.current) {
			const targetDirection = new THREE.Vector2(
				player.direction[0],
				player.direction[1]
			);

			// Calculate target angle from direction - flip the y coordinate here
			if (targetDirection.lengthSq() > 0) {
				targetAngle.current = Math.atan2(targetDirection.x, targetDirection.y); // Removed the negative sign
			}

			// Calculate shortest rotation path
			const angleDiff = getAngleDifference(
				currentAngle.current,
				targetAngle.current
			);

			// Rotate at consistent speed regardless of angle difference
			const maxRotationPerFrame = (Math.PI / 4) * (delta / ROTATION_TIME); // 45° per ROTATION_TIME seconds
			const rotation =
				Math.min(Math.abs(angleDiff), maxRotationPerFrame) *
				Math.sign(angleDiff);
			currentAngle.current += rotation;

			// Calculate actual movement direction based on current rotation
			currentDirection.current.set(
				Math.sin(currentAngle.current),
				Math.cos(currentAngle.current) // Removed the negative sign
			);

			// Move in current direction
			let newPosition = new THREE.Vector3(
				groupRef.current.position.x + currentDirection.current.x * moveSpeed,
				groupRef.current.position.y,
				groupRef.current.position.z + currentDirection.current.y * moveSpeed
			);

			// Boundary Handling
			if (newPosition.length() > MAP_RADIUS) {
				const desiredDir = new THREE.Vector2(
					newPosition.x,
					newPosition.z
				).normalize();
				newPosition = new THREE.Vector3(
					desiredDir.x * MAP_RADIUS,
					newPosition.y,
					desiredDir.y * MAP_RADIUS
				);
			}

			groupRef.current.position.set(
				newPosition.x,
				newPosition.y,
				newPosition.z
			);
			updatePlayerPosition([newPosition.x, newPosition.z]);

			if (boxRef.current) {
				boxRef.current.rotation.y = currentAngle.current;
			}
		}
	});

	useImperativeHandle(ref, () => groupRef.current as THREE.Group);

	return (
		<group ref={groupRef} castShadow receiveShadow>
			<Billboard
				position={[0, 2, 0]}
				follow={true}
				lockX={false}
				lockY={false}
				lockZ={false}
			>
				<Text
					fontSize={0.5}
					color={player.color}
					anchorX="center"
					anchorY="middle"
				>
					{player.name}
				</Text>
			</Billboard>
			<mesh
				ref={boxRef}
				position={[0, 0.5, 0]}
				rotation={new THREE.Euler(0, Math.PI / 2, 0)}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[1, 1, 1]} />
				<meshToonMaterial color={player.color} />
			</mesh>
		</group>
	);
});
