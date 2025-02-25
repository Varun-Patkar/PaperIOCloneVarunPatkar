import React, {
	useRef,
	forwardRef,
	useImperativeHandle,
	useEffect,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useGameStore } from "../store";
import * as THREE from "three";

const MAP_RADIUS = 50; // Define the map radius
const ROTATION_TIME = 0.2; // seconds per 45 degrees
const BOX_SIZE = 1; // Size of the cube
const EFFECTIVE_RADIUS = MAP_RADIUS - BOX_SIZE / 2; // Adjust radius to account for box size
const TRAIL_UPDATE_INTERVAL = 0.1; // seconds between trail points

const getAngleDifference = (current: number, target: number): number => {
	let diff = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
	if (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
};

export const Player = forwardRef<THREE.Group, {}>((props, ref) => {
	const { player, updatePlayerPosition, updatePlayerDirection, addToTrail } =
		useGameStore();
	const groupRef = useRef<THREE.Group>(null);
	const currentDirection = useRef(
		new THREE.Vector2(player.direction[0], player.direction[1])
	);
	const boxRef = useRef<THREE.Mesh>(null);
	const lastTrailUpdate = useRef(0);
	const moveSpeed = 0.05;
	const targetAngle = useRef(0);
	const currentAngle = useRef(0);

	useEffect(() => {
		currentDirection.current.set(player.direction[0], player.direction[1]);
	}, [player.direction]);

	useFrame((_, delta) => {
		lastTrailUpdate.current += delta;
		if (lastTrailUpdate.current >= TRAIL_UPDATE_INTERVAL) {
			lastTrailUpdate.current = 0;
			if (groupRef.current) {
				const pos = groupRef.current.position;
				addToTrail([pos.x, pos.z]);
			}
		}
		if (groupRef.current) {
			const targetDirection = new THREE.Vector2(
				player.direction[0],
				player.direction[1]
			);

			if (targetDirection.lengthSq() > 0) {
				targetAngle.current = Math.atan2(targetDirection.x, targetDirection.y);
			}

			const angleDiff = getAngleDifference(
				currentAngle.current,
				targetAngle.current
			);

			const maxRotationPerFrame = (Math.PI / 4) * (delta / ROTATION_TIME);
			const rotation =
				Math.min(Math.abs(angleDiff), maxRotationPerFrame) *
				Math.sign(angleDiff);
			currentAngle.current += rotation;

			currentDirection.current.set(
				Math.sin(currentAngle.current),
				Math.cos(currentAngle.current)
			);

			let newPosition = new THREE.Vector3(
				groupRef.current.position.x + currentDirection.current.x * moveSpeed,
				groupRef.current.position.y,
				groupRef.current.position.z + currentDirection.current.y * moveSpeed
			);

			if (newPosition.length() > EFFECTIVE_RADIUS) {
				const radialDir = new THREE.Vector2(
					newPosition.x,
					newPosition.z
				).normalize();

				const tangentCW = new THREE.Vector2(-radialDir.y, radialDir.x);
				const tangentCCW = new THREE.Vector2(radialDir.y, -radialDir.x);

				const moveDir = new THREE.Vector2(
					currentDirection.current.x,
					currentDirection.current.y
				).normalize();

				const dotCW = moveDir.dot(tangentCW);
				const dotCCW = moveDir.dot(tangentCCW);

				const newTangent = dotCW > dotCCW ? tangentCW : tangentCCW;

				currentDirection.current.copy(newTangent);

				targetAngle.current = Math.atan2(newTangent.x, newTangent.y);

				newPosition = new THREE.Vector3(
					radialDir.x * EFFECTIVE_RADIUS,
					newPosition.y,
					radialDir.y * EFFECTIVE_RADIUS
				);

				updatePlayerDirection([newTangent.x, newTangent.y]);
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
				<meshStandardMaterial color={player.color} />
			</mesh>
		</group>
	);
});
