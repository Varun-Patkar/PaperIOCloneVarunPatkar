import React, {
	useRef,
	forwardRef,
	useImperativeHandle,
	useEffect,
	useMemo,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useGameStore } from "../store";
import * as THREE from "three";

const MAP_RADIUS = 50; // Define the map radius

export const Player = forwardRef<THREE.Group, {}>((props, ref) => {
	const { player, updatePlayerPosition, updatePlayerDirection } =
		useGameStore();
	const groupRef = useRef<THREE.Group>(null);
	const currentDirection = useRef(
		new THREE.Vector2(player.direction[0], player.direction[1])
	);
	const boxRef = useRef<THREE.Mesh>(null);
	const currentRotation = useRef(new THREE.Euler()); // Store current rotation

	const lerpSpeed = 0.05;
	const moveSpeed = 0.05;

	// Update currentDirection when player.direction changes
	useEffect(() => {
		currentDirection.current.set(player.direction[0], player.direction[1]);
	}, [player.direction]);

	const getRotation = (direction: THREE.Vector2) => {
		if (direction.x === 0 && direction.y === 0) {
			return new THREE.Euler(); // Default rotation
		}

		if (direction.x === 0 && direction.y === -1) {
			return new THREE.Euler(0, 0, 0); // Forward
		}
		if (direction.x === 0 && direction.y === 1) {
			return new THREE.Euler(0, Math.PI, 0); // Backward
		}
		if (direction.x === 1 && direction.y === 0) {
			return new THREE.Euler(0, Math.PI / 2, 0); // Right
		}
		if (direction.x === -1 && direction.y === 0) {
			return new THREE.Euler(0, -Math.PI / 2, 0); // Left
		}
		if (direction.x === 1 && direction.y === 1) {
			return new THREE.Euler(0, (Math.PI / 4) * 3, 0); // Bottom Right
		}
		if (direction.x === -1 && direction.y === 1) {
			return new THREE.Euler(0, (Math.PI / 4) * -3, 0); // Bottom Left
		}
		if (direction.x === 1 && direction.y === -1) {
			return new THREE.Euler(0, Math.PI / 4, 0); // Top Right
		}
		if (direction.x === -1 && direction.y === -1) {
			return new THREE.Euler(0, (Math.PI / 4) * -1, 0); // Top Left
		}

		return new THREE.Euler();
	};

	useFrame(() => {
		if (groupRef.current) {
			const targetDirection = new THREE.Vector2(
				player.direction[0],
				player.direction[1]
			);

			// Smooth transition using lerp
			currentDirection.current.lerp(targetDirection, lerpSpeed);

			let newPosition = new THREE.Vector3(
				groupRef.current.position.x + currentDirection.current.x * moveSpeed,
				groupRef.current.position.y,
				groupRef.current.position.z + currentDirection.current.y * moveSpeed
			);

			// Boundary Handling
			if (newPosition.length() > MAP_RADIUS) {
				const currentPos = new THREE.Vector2(
					groupRef.current.position.x,
					groupRef.current.position.z
				);
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
				const targetRotation = getRotation(currentDirection.current);

				currentRotation.current.x = THREE.MathUtils.lerp(
					currentRotation.current.x,
					targetRotation.x,
					lerpSpeed
				);
				currentRotation.current.y = THREE.MathUtils.lerp(
					currentRotation.current.y,
					targetRotation.y,
					lerpSpeed
				);
				currentRotation.current.z = THREE.MathUtils.lerp(
					currentRotation.current.z,
					targetRotation.z,
					lerpSpeed
				);

				boxRef.current.rotation.copy(currentRotation.current);
			}
		}
	});

	useImperativeHandle(ref, () => groupRef.current as THREE.Group);

	return (
		<group ref={groupRef} castShadow receiveShadow>
			<Text
				position={[0, 1, -1]}
				rotation={[-Math.PI / 2, 0, 0]}
				fontSize={0.5}
				color="black"
				anchorX="center"
				anchorY="middle"
			>
				{player.name}
			</Text>
			<mesh ref={boxRef} position={[0, 0.5, 0]} castShadow receiveShadow>
				<boxGeometry args={[1, 1, 1]} />
				<meshToonMaterial color={player.color} />
			</mesh>
		</group>
	);
});
