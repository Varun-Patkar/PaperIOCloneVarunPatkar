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

// Helper function to check if a point is inside a polygon using ray casting
const BASE_MOVE_SPEED = 8.0; // 3 units per second
const isPointInPolygon = (
	point: [number, number],
	polygon: [number, number][]
): boolean => {
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

// Helper function to check if two line segments intersect
const doSegmentsIntersect = (
	p1: [number, number],
	p2: [number, number],
	p3: [number, number],
	p4: [number, number]
): boolean => {
	// Calculate denominator for intersection formula
	const den =
		(p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);

	// Lines are parallel or collinear
	if (den === 0) return false;

	// Calculate numerators
	const ua =
		((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) /
		den;
	const ub =
		((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) /
		den;

	// Check if intersection point is within both line segments
	return ua > 0 && ua < 1 && ub > 0 && ub < 1;
};

export const Player = forwardRef<THREE.Group, {}>((props, ref) => {
	const {
		player,
		updatePlayerPosition,
		updatePlayerDirection,
		addToTrail,
		resetTrail,
		conquerTerritory,
		setGameOver,
		getDisplayPercentage,
		isGameOver,
		gameStarted,
	} = useGameStore();

	const groupRef = useRef<THREE.Group>(null);
	const currentDirection = useRef(
		new THREE.Vector2(player.direction[0], player.direction[1])
	);
	const boxRef = useRef<THREE.Mesh>(null);
	const lastTrailUpdate = useRef(0);
	const moveSpeed = 0.05;
	const targetAngle = useRef(0);
	const currentAngle = useRef(0);

	// Track if player is inside territory
	const wasInsideTerritory = useRef(true);

	useEffect(() => {
		// Reset position when game is reset but still active
		if (gameStarted && !isGameOver) {
			if (groupRef.current) {
				// Make sure the Three.js object position is reset
				groupRef.current.position.set(
					player.position[0],
					0,
					player.position[1]
				);
			}
		}
	}, [gameStarted, isGameOver, player.position]);

	// Existing effect for direction
	useEffect(() => {
		currentDirection.current.set(player.direction[0], player.direction[1]);
	}, [player.direction]);

	useFrame((_, delta) => {
		lastTrailUpdate.current += delta;
		if (lastTrailUpdate.current >= TRAIL_UPDATE_INTERVAL) {
			lastTrailUpdate.current = 0;
			if (groupRef.current) {
				const pos = groupRef.current.position;
				const currentPosition: [number, number] = [pos.x, pos.z];

				// Check if point is inside territory using ray casting
				const isInside = isPointInPolygon(currentPosition, player.territory);

				if (isInside) {
					// Player is inside territory
					if (!wasInsideTerritory.current && player.trail.length > 1) {
						conquerTerritory();
						// For now, just reset the trail when re-entering territory
						resetTrail();
					}

					// No need to add to trail while inside territory
					wasInsideTerritory.current = true;
				} else {
					if (wasInsideTerritory.current) {
						addToTrail(currentPosition);
						resetTrail();
					}
					// Player is outside territory
					wasInsideTerritory.current = false;

					// Check for self-intersection before adding the new point
					if (player.trail.length >= 3) {
						const prevPoint = player.trail[player.trail.length - 1];

						// Check newest segment against all previous segments (except adjacent)
						for (let i = 0; i < player.trail.length - 2; i++) {
							if (
								doSegmentsIntersect(
									prevPoint,
									currentPosition,
									player.trail[i],
									player.trail[i + 1]
								)
							) {
								// Self-intersection detected - GAME OVER
								setGameOver(false); // Not a victory
								return;
							}
						}
					}

					// Outside territory, add point to trail
					addToTrail(currentPosition);
				}
			}
		}

		// Movement code
		if (groupRef.current && gameStarted && !isGameOver) {
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
			const displayPercentage = getDisplayPercentage();
			if (displayPercentage >= 100) {
				setGameOver(true); // Victory!
			}
			const maxRotationPerFrame = (Math.PI / 4) * (delta / ROTATION_TIME);
			const rotation =
				Math.min(Math.abs(angleDiff), maxRotationPerFrame) *
				Math.sign(angleDiff);
			currentAngle.current += rotation;

			currentDirection.current.set(
				Math.sin(currentAngle.current),
				Math.cos(currentAngle.current)
			);

			// Calculate movement speed adjusted by delta time
			const moveSpeed = BASE_MOVE_SPEED * delta;

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
			if (gameStarted && !isGameOver) {
				groupRef.current.position.set(
					newPosition.x,
					newPosition.y,
					newPosition.z
				);
				updatePlayerPosition([newPosition.x, newPosition.z]);
			} else {
				groupRef.current.position.set(0, 0, 0);
				updatePlayerPosition([0, 0]);
			}
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
