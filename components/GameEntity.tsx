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
		const internalPosition = useRef(
			new THREE.Vector3(position[0], 0, position[1])
		); // Internal state for position

		// Update ref when direction prop changes
		useEffect(() => {
			currentDirection.current.set(direction[0], direction[1]);
			targetAngle.current = Math.atan2(direction[0], direction[1]);
		}, [direction]);

		// Sync internal position state with props initially and on prop change
		useEffect(() => {
			internalPosition.current.set(position[0], 0, position[1]);
			if (groupRef.current) {
				groupRef.current.position.copy(internalPosition.current);
			}
		}, [position]);

		// Handle active state change (game start/reset)
		useEffect(() => {
			if (groupRef.current) {
				// When becoming active (e.g., game start/reset)
				if (!prevActive.current && active) {
					// Explicitly set position from props
					internalPosition.current.set(position[0], 0, position[1]);
					groupRef.current.position.copy(internalPosition.current);

					// Reset direction-related state
					currentDirection.current.set(direction[0], direction[1]);
					targetAngle.current = Math.atan2(direction[0], direction[1]);
					currentAngle.current = targetAngle.current; // Ensure current angle matches target immediately
					if (boxRef.current) {
						boxRef.current.rotation.y = currentAngle.current; // Sync visual rotation
					}

					// Reset trail timing and territory state
					lastTrailUpdate.current = 0;
					wasInsideTerritory.current = true; // Assume starting inside territory
				}
				// When becoming inactive (e.g., game over)
				else if (prevActive.current && !active) {
					// Optionally handle deactivation logic here if needed
				}
			}
			prevActive.current = active;
		}, [active, position, direction]); // Rerun if these key props change alongside active state

		useFrame((_, delta) => {
			if (!active || !groupRef.current) return;

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

			// --- Movement Logic ---
			const targetDirectionInput = new THREE.Vector2(
				direction[0],
				direction[1]
			);
			const hasUserInput = targetDirectionInput.lengthSq() > 0.01;

			// Determine target angle based *only* on user input if present
			if (hasUserInput) {
				targetAngle.current = Math.atan2(
					targetDirectionInput.x,
					targetDirectionInput.y
				);
			}
			// If no user input, targetAngle remains the last intended angle (allowing smooth continuation)

			// Smooth rotation towards target angle
			const angleDiff = getAngleDifference(
				currentAngle.current,
				targetAngle.current
			);
			const maxRotationPerFrame = (Math.PI / 4) * (delta / ROTATION_TIME);
			const rotation =
				Math.min(Math.abs(angleDiff), maxRotationPerFrame) *
				Math.sign(angleDiff);
			currentAngle.current += rotation;

			// Update current moving direction based on smoothed angle
			currentDirection.current.set(
				Math.sin(currentAngle.current),
				Math.cos(currentAngle.current)
			);

			// Calculate movement speed adjusted by delta time
			const frameSpeed = moveSpeed * delta;

			// Calculate potential new position based on internal state and current direction
			let potentialNewX =
				internalPosition.current.x + currentDirection.current.x * frameSpeed;
			let potentialNewZ =
				internalPosition.current.z + currentDirection.current.y * frameSpeed;

			// Check if potential position is at or beyond the boundary
			const distanceFromCenter = Math.sqrt(
				potentialNewX ** 2 + potentialNewZ ** 2
			);
			const atBoundary = distanceFromCenter >= EFFECTIVE_RADIUS; // Use >= for consistency

			if (atBoundary) {
				// --- Boundary Handling ---
				// Clamp position exactly to the boundary first
				const radialDir = new THREE.Vector2(
					potentialNewX,
					potentialNewZ
				).normalize();
				potentialNewX = radialDir.x * EFFECTIVE_RADIUS;
				potentialNewZ = radialDir.y * EFFECTIVE_RADIUS;

				// Calculate the tangent direction based on the *current* position on the boundary
				const tangentCW = new THREE.Vector2(-radialDir.y, radialDir.x); // Clockwise tangent
				const tangentCCW = new THREE.Vector2(radialDir.y, -radialDir.x); // Counter-clockwise tangent

				// Determine which tangent is closer to the entity's *current* moving direction
				const moveDir = currentDirection.current.normalize(); // Use the smoothed direction
				const dotCW = moveDir.dot(tangentCW);
				const dotCCW = moveDir.dot(tangentCCW);
				const tangentToUse = dotCW > dotCCW ? tangentCW : tangentCCW;

				// Check if user input is trying to push *into* the boundary
				let forceTangent = false;
				if (hasUserInput) {
					const inputPushesInward = targetDirectionInput.dot(radialDir) > 0.1; // Threshold to detect inward push
					if (inputPushesInward) {
						forceTangent = true;
					}
				} else {
					// No user input, always follow the tangent
					forceTangent = true;
				}

				if (forceTangent) {
					// Override current direction and angles to follow the tangent
					currentDirection.current.copy(tangentToUse);
					targetAngle.current = Math.atan2(tangentToUse.x, tangentToUse.y);
					currentAngle.current = targetAngle.current; // Snap angle to tangent immediately

					// Notify of direction change (optional, if external logic needs it)
					if (onDirectionUpdate) {
						onDirectionUpdate([tangentToUse.x, tangentToUse.y]);
					}
				}
				// If user input is not pushing inward, the normal rotation logic towards targetAngle
				// (which was set by user input) will handle the direction.
				// The position clamping ensures they slide along the boundary.

				// Recalculate movement for this frame based on potentially adjusted direction
				potentialNewX =
					internalPosition.current.x + currentDirection.current.x * frameSpeed;
				potentialNewZ =
					internalPosition.current.z + currentDirection.current.y * frameSpeed;
				// Re-clamp position after recalculating movement with potentially forced tangent direction
				const finalDist = Math.sqrt(potentialNewX ** 2 + potentialNewZ ** 2);
				if (finalDist > EFFECTIVE_RADIUS) {
					potentialNewX = (potentialNewX / finalDist) * EFFECTIVE_RADIUS;
					potentialNewZ = (potentialNewZ / finalDist) * EFFECTIVE_RADIUS;
				}
			} // --- End Boundary Handling ---

			// Update internal position state
			internalPosition.current.set(potentialNewX, 0, potentialNewZ);

			// Update visual position
			groupRef.current.position.copy(internalPosition.current);

			// Notify of position update
			if (onPositionUpdate) {
				onPositionUpdate([
					internalPosition.current.x,
					internalPosition.current.z,
				]);
			}

			// Update box rotation based on the smoothed currentAngle
			if (boxRef.current) {
				boxRef.current.rotation.y = currentAngle.current;
			}
		});

		useImperativeHandle(ref, () => groupRef.current as THREE.Group);

		return (
			<group
				ref={groupRef}
				position={[position[0], 0, position[1]]}
				castShadow
				receiveShadow
			>
				{" "}
				{/* Initialize position */}
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
			trail, // Get trail from props to check length
			onConquerTerritory,
			onResetTrail,
			onSelfIntersection,
			...entityProps // Includes onTrailUpdate from GameEntityProps
		},
		ref
	) => {
		const wasInsideTerritory = useRef(true);

		// Create territory shape geometry
		const territoryGeometry = useMemo(() => {
			if (!territory || territory.length < 3) return null;

			try {
				// Revert to using negated Z for shape's Y coordinate
				const shape = new THREE.Shape();
				shape.moveTo(territory[0][0], -territory[0][1]); // Use -Z

				for (let i = 1; i < territory.length; i++) {
					if (
						territory[i] &&
						territory[i].length === 2 &&
						!isNaN(territory[i][0]) &&
						!isNaN(territory[i][1])
					) {
						shape.lineTo(territory[i][0], -territory[i][1]); // Use -Z
					} else {
						console.warn(
							"Invalid point in territory data:",
							territory[i],
							"at index",
							i
						);
					}
				}
				shape.closePath();
				return new THREE.ShapeGeometry(shape);
			} catch (error) {
				console.error("Error creating territory geometry:", error, territory);
				return null;
			}
		}, [territory]); // Ensure geometry updates when territory changes

		// Custom trail update handler
		const handleTrailUpdate = (position: [number, number]) => {
			// Check if the entity is inside its own territory
			const isInside = isPointInPolygon(position, territory);

			if (isInside) {
				// Player is inside territory
				if (!wasInsideTerritory.current) {
					// Just re-entered territory.
					// Add the current point to finalize the trail loop.
					entityProps.onTrailUpdate?.(position); // Add final point

					// Check if trail is long enough to conquer (entry + re-entry + at least one outside point)
					// Need to check the length *after* adding the final point, so trail.length + 1 >= 3
					if (trail.length + 1 >= 3) {
						onConquerTerritory?.(); // Conquer using the completed trail
					} else {
						// Trail too short (e.g., immediately re-entered), just reset it.
						onResetTrail?.();
					}
					// Note: conquerPlayerTerritory now handles clearing the trail.
				}
				// If already inside, do nothing with the trail.
				wasInsideTerritory.current = true;
			} else {
				// Player is outside territory
				if (wasInsideTerritory.current) {
					// Just exited territory. Reset trail and start a new one.
					onResetTrail?.(); // Clear previous trail remnants (store action clears array)
					entityProps.onTrailUpdate?.(position); // Add the first point of the new trail (store action adds to empty array)
				} else {
					// Still outside territory. Check self-intersection and add to trail.
					// Check intersection only if trail is long enough to form a segment to check against
					if (trail.length >= 3) {
						const prevPoint = trail[trail.length - 1];
						// Check newest segment against all previous non-adjacent segments
						for (let i = 0; i < trail.length - 2; i++) {
							if (
								doSegmentsIntersect(prevPoint, position, trail[i], trail[i + 1])
							) {
								onSelfIntersection?.();
								return; // Stop processing to prevent adding the intersecting point
							}
						}
					}
					// Add current point to the ongoing trail.
					entityProps.onTrailUpdate?.(position);
				}
				wasInsideTerritory.current = false;
			}
		};

		// Restore complex trail geometry using TubeGeometry logic
		const trailGeometry = useMemo(() => {
			if (!trail || trail.length < 2) return null;

			try {
				// Convert trail points to Vector3 with consistent small Y value
				const trailPoints = trail.map(
					([x, z]) => new THREE.Vector3(x, 0.02, z)
				);

				// Create a smooth curve through all points
				const curve = new THREE.CatmullRomCurve3(trailPoints);
				curve.curveType = "centripetal"; // Better for sharp corners

				// Create a custom flat elliptical tube cross-section
				const tubeRadius = 0.5; // Width of the trail
				const tubeHeight = 0.08; // Thickness of the trail
				const tubularSegments = Math.max(64, trailPoints.length * 4); // More segments for smoother curve
				const radialSegments = 8; // Segments around the tube

				// Use layers to ensure flat orientation
				const frames = curve.computeFrenetFrames(tubularSegments, false);

				// Override normal vectors to always point up
				for (let i = 0; i < frames.normals.length; i++) {
					frames.normals[i].set(0, 1, 0);
					frames.binormals[i].crossVectors(
						frames.tangents[i],
						frames.normals[i]
					);
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

					// Use custom frame (ensure index is within bounds)
					const frameIndex = Math.min(i, frames.normals.length - 1);
					const normal = frames.normals[frameIndex];
					const binormal = frames.binormals[frameIndex];

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
						vertex.y = Math.max(0.01, point.y + y * normal.y); // Ensure slightly above ground
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
				geometry.computeVertexNormals(); // Compute normals for lighting

				return geometry;
			} catch (error) {
				console.error("Error creating trail geometry:", error, trail);
				return null;
			}
		}, [trail]); // Recompute when trail changes

		return (
			<>
				<GameEntity
					{...entityProps}
					ref={ref}
					onTrailUpdate={handleTrailUpdate} // Pass the refined handler
					insideTerritoryCheck={(pos) => isPointInPolygon(pos, territory)}
				/>
				{/* Territory visualization */}
				{territoryGeometry && (
					<mesh
						geometry={territoryGeometry}
						position={[0, 0.005, 0]} // Slightly above ground
						rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on XZ plane
						receiveShadow // Allow territory to receive shadows
					>
						<meshStandardMaterial
							color={entityProps.color}
							transparent={true}
							opacity={0.6} // Keep some transparency
							side={THREE.DoubleSide} // Render both sides
							roughness={0.8} // Make it less shiny
							metalness={0.1}
							// depthWrite={false} // Might help with z-fighting but can cause render order issues
						/>
					</mesh>
				)}

				{/* Restore Trail visualization using Mesh */}
				{trailGeometry && (
					<mesh geometry={trailGeometry} castShadow receiveShadow>
						<meshStandardMaterial
							color={entityProps.color}
							side={THREE.DoubleSide} // Render both sides
							roughness={0.6} // Adjust appearance
							metalness={0.2}
							// envMapIntensity={0.5} // Optional: add environment map influence
						/>
					</mesh>
				)}
			</>
		);
	}
);
