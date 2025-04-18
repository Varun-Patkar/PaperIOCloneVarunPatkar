import React, {
	useRef,
	forwardRef,
	useImperativeHandle,
	useEffect,
	useMemo,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { GameEntityProps, GameEntityWithTrailProps } from "../types";

const MAP_RADIUS = 50; // Define the map radius
const ROTATION_TIME = 0.2; // seconds per 45 degrees
const BOX_SIZE = 1; // Size of the cube
const EFFECTIVE_RADIUS = MAP_RADIUS - BOX_SIZE / 2; // Adjust radius to account for box size
const TRAIL_UPDATE_INTERVAL = 0.1; // seconds between trail points

// Helper function definitions
const getAngleDifference = (current: number, target: number): number => {
	let diff = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
	if (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
};

// Helper function to check if a point is inside a polygon using ray casting
const isPointInPolygon = (
	point: [number, number],
	polygon: [number, number][]
): boolean => {
	if (polygon.length < 3) return false;

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

export const GameEntity = forwardRef<THREE.Group, GameEntityProps>(
	(
		{
			name,
			color,
			position,
			direction,
			moveSpeed = 8.0,
			active = true,
			onPositionUpdate,
			onDirectionUpdate,
			onTrailUpdate,
			insideTerritoryCheck,
		},
		ref
	) => {
		const groupRef = useRef<THREE.Group>(null);
		const currentDirection = useRef(
			new THREE.Vector2(direction[0], direction[1])
		);
		const boxRef = useRef<THREE.Mesh>(null);
		const lastTrailUpdate = useRef(0);
		const targetAngle = useRef(Math.atan2(direction[0], direction[1]));
		const currentAngle = useRef(Math.atan2(direction[0], direction[1]));
		const wasInsideTerritory = useRef(true);
		const prevActive = useRef(active);

		// Update ref when direction prop changes
		useEffect(() => {
			currentDirection.current.set(direction[0], direction[1]);
			targetAngle.current = Math.atan2(direction[0], direction[1]);
		}, [direction]);

		// Sync group position with props on load
		useEffect(() => {
			if (groupRef.current) {
				groupRef.current.position.set(position[0], 0, position[1]);
			}
		}, []);

		// Force position sync when position props change or when game resets
		useEffect(() => {
			if (groupRef.current) {
				groupRef.current.position.set(position[0], 0, position[1]);
			}
		}, [position]);

		// Handle active state change (game start/reset)
		useEffect(() => {
			// If the entity was inactive and is now active, reset position AND direction
			if (!prevActive.current && active && groupRef.current) {
				// Reset position
				groupRef.current.position.set(position[0], 0, position[1]);

				// Reset direction-related state
				currentDirection.current.set(direction[0], direction[1]);
				targetAngle.current = Math.atan2(direction[0], direction[1]);
				currentAngle.current = Math.atan2(direction[0], direction[1]);

				// Reset trail timing
				lastTrailUpdate.current = 0;

				// Reset territory check
				wasInsideTerritory.current = true;
			}
			prevActive.current = active;
		}, [active, position, direction]);

		useFrame((_, delta) => {
			if (!active) return;

			// Trail update logic
			lastTrailUpdate.current += delta;
			if (lastTrailUpdate.current >= TRAIL_UPDATE_INTERVAL && onTrailUpdate) {
				lastTrailUpdate.current = 0;

				if (groupRef.current) {
					const pos = groupRef.current.position;
					const currentPosition: [number, number] = [pos.x, pos.z];

					// Check if point is inside territory
					const isInside = insideTerritoryCheck
						? insideTerritoryCheck(currentPosition)
						: false;

					// Call the trail update callback with position information
					onTrailUpdate(currentPosition);
				}
			}

			// Movement code
			if (groupRef.current) {
				const targetDirection = new THREE.Vector2(direction[0], direction[1]);
				const hasUserInput = targetDirection.lengthSq() > 0.01;

				if (hasUserInput) {
					targetAngle.current = Math.atan2(
						targetDirection.x,
						targetDirection.y
					);
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

				// Calculate movement speed adjusted by delta time
				const frameSpeed = moveSpeed * delta;

				let newPosition = new THREE.Vector3(
					groupRef.current.position.x + currentDirection.current.x * frameSpeed,
					groupRef.current.position.y,
					groupRef.current.position.z + currentDirection.current.y * frameSpeed
				);

				// Check if we're at the boundary
				const distanceFromCenter = newPosition.length();
				const atBoundary = distanceFromCenter > EFFECTIVE_RADIUS;

				// Handle map boundaries
				if (atBoundary) {
					const radialDir = new THREE.Vector2(
						newPosition.x,
						newPosition.z
					).normalize();

					// Calculate tangent directions
					const tangentCW = new THREE.Vector2(-radialDir.y, radialDir.x);
					const tangentCCW = new THREE.Vector2(radialDir.y, -radialDir.x);

					const moveDir = new THREE.Vector2(
						currentDirection.current.x,
						currentDirection.current.y
					).normalize();

					// Determine which tangent is closer to current direction
					const dotCW = moveDir.dot(tangentCW);
					const dotCCW = moveDir.dot(tangentCCW);

					const newTangent = dotCW > dotCCW ? tangentCW : tangentCCW;

					// User input overrides auto-tangent only if we're not directly
					// approaching the boundary
					// Calculate if we're moving toward the boundary
					const movingTowardBoundary = moveDir.dot(radialDir) > 0.7; // threshold to determine "toward"

					if (!hasUserInput || movingTowardBoundary) {
						// Either no user input or we're headed straight into boundary
						// Force tangent direction
						currentDirection.current.copy(newTangent);
						targetAngle.current = Math.atan2(newTangent.x, newTangent.y);

						// Notify of direction change at boundary
						if (onDirectionUpdate) {
							onDirectionUpdate([newTangent.x, newTangent.y]);
						}
					}

					// Keep player at the boundary radius regardless
					newPosition = new THREE.Vector3(
						radialDir.x * EFFECTIVE_RADIUS,
						newPosition.y,
						radialDir.y * EFFECTIVE_RADIUS // Fix: use radialDir.y instead of radialDir.z
					);
				}

				// Update position
				groupRef.current.position.set(
					newPosition.x,
					newPosition.y,
					newPosition.z
				);

				// Notify of position update
				if (onPositionUpdate) {
					onPositionUpdate([newPosition.x, newPosition.z]);
				}

				// Update box rotation
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
					<Text fontSize={0.5} color={color} anchorX="center" anchorY="middle">
						{name}
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
					<meshStandardMaterial color={color} />
				</mesh>
			</group>
		);
	}
);

export const GameEntityWithTrail = forwardRef<
	THREE.Group,
	GameEntityWithTrailProps
>(
	(
		{
			territory,
			trail,
			onConquerTerritory,
			onResetTrail,
			onSelfIntersection,
			...entityProps
		},
		ref
	) => {
		// Add wasInsideTerritory ref to maintain persistent state
		const wasInsideTerritory = useRef(true);

		// Create territory shape geometry
		const territoryGeometry = useMemo(() => {
			if (territory.length < 3) return null;

			// Create shape from territory points
			const shape = new THREE.Shape();
			shape.moveTo(territory[0][0], -territory[0][1]);

			// Add the remaining points
			for (let i = 1; i < territory.length; i++) {
				shape.lineTo(territory[i][0], -territory[i][1]);
			}

			shape.closePath();
			return new THREE.ShapeGeometry(shape);
		}, [territory]);

		// Create trail geometry using TubeGeometry for smooth trail
		const trailGeometry = useMemo(() => {
			if (trail.length < 2) return null;

			// Convert trail points to Vector3 with consistent small Y value
			const trailPoints = trail.map(([x, z]) => new THREE.Vector3(x, 0.02, z));

			// Create a smooth curve through all points
			const curve = new THREE.CatmullRomCurve3(trailPoints);
			curve.curveType = "centripetal"; // Better for sharp corners

			// Create a custom flat elliptical tube cross-section
			const tubeRadius = 0.5;
			const tubeHeight = 0.08;
			const tubularSegments = Math.max(64, trailPoints.length * 4);
			const radialSegments = 8;

			// Use layers to ensure flat orientation
			const frames = curve.computeFrenetFrames(tubularSegments, false);

			// Override normal vectors to always point up
			for (let i = 0; i < frames.normals.length; i++) {
				frames.normals[i].set(0, 1, 0);
				frames.binormals[i].crossVectors(frames.tangents[i], frames.normals[i]);
			}

			// Create custom buffer geometry
			const geometry = new THREE.BufferGeometry();
			const positions = [];
			const indices = [];
			const uvs = [];

			// Generate vertices based on the curve
			for (let i = 0; i <= tubularSegments; i++) {
				const t = i / tubularSegments;
				const point = curve.getPointAt(t);
				const tangent = curve.getTangentAt(t).normalize();

				// Force tangents to stay in XZ plane
				tangent.y = 0;
				tangent.normalize();

				// Use custom frame
				const normal = frames.normals[Math.min(i, frames.normals.length - 1)];
				const binormal = new THREE.Vector3()
					.crossVectors(normal, tangent)
					.normalize();

				// Generate circle vertices
				for (let j = 0; j <= radialSegments; j++) {
					const angle = (j / radialSegments) * Math.PI * 2;
					const sin = Math.sin(angle);
					const cos = Math.cos(angle);

					// Make elliptical (wider than taller)
					const x = cos * tubeRadius;
					const y = sin * tubeHeight;

					// Position in 3D space using our custom frame
					const vertex = new THREE.Vector3();
					vertex.x = point.x + x * binormal.x;
					vertex.y = Math.max(0.01, point.y + y * normal.y);
					vertex.z = point.z + x * binormal.z;

					positions.push(vertex.x, vertex.y, vertex.z);

					// Add UVs
					uvs.push(t, j / radialSegments);
				}
			}

			// Create faces (triangles)
			const vertsPerRow = radialSegments + 1;
			for (let i = 0; i < tubularSegments; i++) {
				for (let j = 0; j < radialSegments; j++) {
					const a = i * vertsPerRow + j;
					const b = (i + 1) * vertsPerRow + j;
					const c = (i + 1) * vertsPerRow + (j + 1);
					const d = i * vertsPerRow + (j + 1);

					// Two triangles per face
					indices.push(a, b, d);
					indices.push(b, c, d);
				}
			}

			geometry.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(positions, 3)
			);
			geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
			geometry.setIndex(indices);
			geometry.computeVertexNormals();

			return geometry;
		}, [trail]);

		// Custom trail update handler
		const handleTrailUpdate = (position: [number, number]) => {
			// Check if the entity is inside its own territory
			const isInside = isPointInPolygon(position, territory);

			if (isInside) {
				// Player is inside territory
				if (!wasInsideTerritory.current && trail.length > 1) {
					// Just entered territory with trail - conquer!
					onConquerTerritory?.();
					onResetTrail?.();
				}
				// No need to add to trail while inside territory
				wasInsideTerritory.current = true;
			} else {
				// Player is outside territory
				if (wasInsideTerritory.current) {
					// Just exited territory - start a new trail
					entityProps.onTrailUpdate?.(position);
					onResetTrail?.();
				} else {
					// Already outside territory
					// Check for self-intersection before adding point
					if (trail.length >= 3) {
						const prevPoint = trail[trail.length - 1];

						// Check newest segment against all previous segments (except adjacent)
						for (let i = 0; i < trail.length - 2; i++) {
							if (
								doSegmentsIntersect(prevPoint, position, trail[i], trail[i + 1])
							) {
								// Self-intersection detected - GAME OVER
								onSelfIntersection?.();
								return; // Stop processing to prevent further trail updates
							}
						}
					}

					// Continue trail
					entityProps.onTrailUpdate?.(position);
				}
				wasInsideTerritory.current = false;
			}
		};

		return (
			<>
				<GameEntity
					{...entityProps}
					ref={ref}
					onTrailUpdate={handleTrailUpdate}
					insideTerritoryCheck={(pos) => isPointInPolygon(pos, territory)}
				/>

				{/* Territory visualization */}
				{territoryGeometry && (
					<mesh
						geometry={territoryGeometry}
						position={[0, 0.005, 0]} // Slightly above ground to avoid z-fighting
						rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on XZ plane
					>
						<meshStandardMaterial
							color={entityProps.color}
							transparent={true}
							opacity={0.6}
							side={THREE.DoubleSide}
							roughness={0.7}
							metalness={0.2}
						/>
					</mesh>
				)}

				{/* Trail visualization */}
				{trailGeometry && (
					<mesh geometry={trailGeometry}>
						<meshStandardMaterial
							color={entityProps.color}
							side={THREE.DoubleSide}
							roughness={0.3}
							metalness={0.1}
							envMapIntensity={0.8}
						/>
					</mesh>
				)}
			</>
		);
	}
);
