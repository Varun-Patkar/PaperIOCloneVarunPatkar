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
// Updated imports
import {
	GameEntityProps,
	GameEntityWithTrailProps,
	OtherEntityTrail,
} from "../types";

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

// Add distanceSq if not already present
const distanceSq = (p1: [number, number], p2: [number, number]): number => {
	const dx = p1[0] - p2[0];
	const dy = p1[1] - p2[1];
	return dx * dx + dy * dy;
};

// Helper function to find the closest point on a polygon segment to a given point
const closestPointOnSegment = (
	p: [number, number],
	a: [number, number],
	b: [number, number]
): [number, number] => {
	const ap: [number, number] = [p[0] - a[0], p[1] - a[1]];
	const ab: [number, number] = [b[0] - a[0], b[1] - a[1]];
	const ab2 = ab[0] * ab[0] + ab[1] * ab[1];
	const ap_dot_ab = ap[0] * ab[0] + ap[1] * ab[1];
	let t = ap_dot_ab / ab2;
	t = Math.max(0, Math.min(1, t)); // Clamp t to [0, 1]
	const closest: [number, number] = [a[0] + ab[0] * t, a[1] + ab[1] * t];
	return closest;
};

// Helper function to find the closest point on the entire polygon perimeter
const findClosestPointOnPolygon = (
	point: [number, number],
	polygon: [number, number][]
): [number, number] => {
	if (!polygon || polygon.length === 0) return point; // Should not happen with valid territory
	if (polygon.length === 1) return polygon[0];

	let minDistSq = Infinity;
	let closestOverall: [number, number] = polygon[0];

	for (let i = 0; i < polygon.length; i++) {
		const p1 = polygon[i];
		const p2 = polygon[(i + 1) % polygon.length]; // Wrap around for the last segment

		const closestOnSeg = closestPointOnSegment(point, p1, p2);
		const distSq = distanceSq(point, closestOnSeg);

		if (distSq < minDistSq) {
			minDistSq = distSq;
			closestOverall = closestOnSeg;
		}
	}
	return closestOverall;
};

export const GameEntity = forwardRef<THREE.Group, GameEntityProps>(
	(
		{
			entityId, // Added
			isBot, // Added
			name,
			color,
			position,
			direction,
			trail, // Added: Passed down for collision checks
			playerTrail, // Added
			otherBots, // Added
			moveSpeed = 8.0,
			active = true,
			onPositionUpdate,
			onDirectionUpdate,
			onTrailUpdate, // Still used for adding points to state
			insideTerritoryCheck,
			// Collision Callbacks
			onSelfIntersection,
			onPlayerTrailCollision,
			onBotTrailCollision,
			onBotBotTrailCollision,
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

		useFrame((state, delta) => {
			if (!active || !groupRef.current) return;

			const time = state.clock.getElapsedTime(); // Use clock for trail update timing

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

			// Calculate movement speed adjusted by delta time (RE-ADDED)
			const frameSpeed = moveSpeed * delta;

			// Calculate potential new position
			let potentialNewX =
				internalPosition.current.x + currentDirection.current.x * frameSpeed;
			let potentialNewZ =
				internalPosition.current.z + currentDirection.current.y * frameSpeed;

			// --- Boundary Handling (Restored) ---
			const distFromCenter = Math.sqrt(
				potentialNewX * potentialNewX + potentialNewZ * potentialNewZ
			);

			if (distFromCenter > EFFECTIVE_RADIUS) {
				// Clamp position to the boundary
				const angleAtBoundary = Math.atan2(potentialNewX, potentialNewZ);
				potentialNewX = Math.sin(angleAtBoundary) * EFFECTIVE_RADIUS;
				potentialNewZ = Math.cos(angleAtBoundary) * EFFECTIVE_RADIUS;

				// Calculate tangent direction (perpendicular to the radius vector)
				const tangent = new THREE.Vector2(
					-potentialNewZ,
					potentialNewX
				).normalize(); // Tangent direction

				// Force current direction towards the tangent
				// Project current direction onto tangent
				const dot = currentDirection.current.dot(tangent);
				// If moving away from tangent, flip tangent direction
				const tangentDirection = dot >= 0 ? tangent : tangent.negate();

				// Blend current direction towards the tangent direction over a short time
				const blendFactor = Math.min(1, delta / 0.1); // Adjust 0.1 for faster/slower alignment
				currentDirection.current
					.lerp(tangentDirection, blendFactor)
					.normalize();

				// Update target angle based on the new forced direction
				targetAngle.current = Math.atan2(
					currentDirection.current.x,
					currentDirection.current.y
				);
				currentAngle.current = targetAngle.current; // Snap angle to new direction

				// Recalculate potential position based on clamped start and adjusted direction
				// Use the *clamped* position as the starting point for this frame's movement along the tangent
				potentialNewX =
					Math.sin(angleAtBoundary) * EFFECTIVE_RADIUS + // Start at boundary
					currentDirection.current.x * frameSpeed;
				potentialNewZ =
					Math.cos(angleAtBoundary) * EFFECTIVE_RADIUS + // Start at boundary
					currentDirection.current.y * frameSpeed;

				// Re-clamp just in case the tangent movement pushes it slightly out again
				const finalDist = Math.sqrt(potentialNewX ** 2 + potentialNewZ ** 2);
				if (finalDist > EFFECTIVE_RADIUS) {
					potentialNewX = (potentialNewX / finalDist) * EFFECTIVE_RADIUS;
					potentialNewZ = (potentialNewZ / finalDist) * EFFECTIVE_RADIUS;
				}
			}
			// --- End Boundary Handling ---

			// --- Determine Current Territory Status ---
			const currentPos2D: [number, number] = [
				internalPosition.current.x,
				internalPosition.current.z,
			];
			// Use potentialNextPos for a slightly predictive check, helps prevent clipping issues
			const potentialNextPos2D: [number, number] = [
				potentialNewX,
				potentialNewZ,
			];
			const isInside = insideTerritoryCheck
				? insideTerritoryCheck(potentialNextPos2D) // Check potential next position
				: true; // Default to inside if no check provided

			// --- Collision Detection ---
			let collisionDetected = false;
			let shouldEntityDie = false; // Flag to indicate if this entity should die

			const isMoving = distanceSq(currentPos2D, potentialNextPos2D) > 0.0001;

			if (isMoving) {
				// 1. Self-intersection check (ONLY if outside territory)
				if (!isInside && trail && trail.length >= 3) {
					for (let i = 0; i < trail.length - 2; i++) {
						if (
							doSegmentsIntersect(
								currentPos2D,
								potentialNextPos2D,
								trail[i],
								trail[i + 1]
							)
						) {
							// console.log(`${entityId} self-intersection OUTSIDE territory`);
							onSelfIntersection?.(); // This entity dies
							collisionDetected = true;
							shouldEntityDie = true; // Mark this entity for death
							break;
						}
					}
				}

				// 2. Collision with other trails (check regardless of being inside or outside)
				if (!collisionDetected) {
					if (isBot) {
						// Bot checks Player trail
						if (playerTrail && playerTrail.length >= 1) {
							for (let i = 0; i < playerTrail.length - 1; i++) {
								if (
									doSegmentsIntersect(
										currentPos2D,
										potentialNextPos2D,
										playerTrail[i],
										playerTrail[i + 1]
									)
								) {
									if (isInside) {
										// Bot is INSIDE its territory, hits Player trail -> Player dies
										// console.log(`Bot ${entityId} (inside) hit player trail -> Player dies`);
										onPlayerTrailCollision?.(entityId as number); // Player dies, killed by this bot
									} else {
										// Bot is OUTSIDE its territory, hits Player trail -> Bot dies
										// console.log(`Bot ${entityId} (outside) hit player trail -> Bot dies`);
										shouldEntityDie = true; // Mark this bot for death
										// The actual death call (setGameOver or killBot) happens based on who died
										// We need a way to signal *who* killed this bot if it dies outside.
										// Let's assume onPlayerTrailCollision handles the player death case,
										// and we handle the bot's death case via shouldEntityDie.
										// The calling context (BotManager) will handle the killBot call if shouldEntityDie is true.
										// For simplicity, let's call the callback anyway, the store logic will sort it out.
										onPlayerTrailCollision?.(entityId as number); // Signal collision, store decides outcome
									}
									collisionDetected = true;
									break;
								}
							}
						}
						// Bot checks other Bots' trails
						if (!collisionDetected && otherBots) {
							for (const otherBot of otherBots) {
								if (otherBot.trail.length >= 1) {
									for (let i = 0; i < otherBot.trail.length - 1; i++) {
										if (
											doSegmentsIntersect(
												currentPos2D,
												potentialNextPos2D,
												otherBot.trail[i],
												otherBot.trail[i + 1]
											)
										) {
											if (isInside) {
												// Bot is INSIDE its territory, hits other Bot's trail -> Other Bot dies
												// console.log(`Bot ${entityId} (inside) hit bot ${otherBot.id} trail -> Other bot dies`);
												onBotBotTrailCollision?.(otherBot.id as number); // The *other* bot dies, killed by this bot
											} else {
												// Bot is OUTSIDE its territory, hits other Bot's trail -> This Bot dies
												// console.log(`Bot ${entityId} (outside) hit bot ${otherBot.id} trail -> This bot dies`);
												shouldEntityDie = true; // Mark this bot for death
												// Call callback, store decides outcome based on killer/killed IDs
												onBotBotTrailCollision?.(otherBot.id as number); // Signal collision
											}
											collisionDetected = true;
											break;
										}
									}
								}
								if (collisionDetected) break;
							}
						}
					} else {
						// Player checks Bot trails
						if (otherBots) {
							for (const otherBot of otherBots) {
								if (otherBot.trail.length >= 1) {
									for (let i = 0; i < otherBot.trail.length - 1; i++) {
										if (
											doSegmentsIntersect(
												currentPos2D,
												potentialNextPos2D,
												otherBot.trail[i],
												otherBot.trail[i + 1]
											)
										) {
											if (isInside) {
												// Player is INSIDE territory, hits Bot trail -> Bot dies
												// console.log(`Player (inside) hit bot ${otherBot.id} trail -> Bot dies`);
												onBotTrailCollision?.(otherBot.id as number); // Bot dies, killed by player
											} else {
												// Player is OUTSIDE territory, hits Bot trail -> Player dies
												// console.log(`Player (outside) hit bot ${otherBot.id} trail -> Player dies`);
												shouldEntityDie = true; // Mark player for death
												// Call callback, store decides outcome
												onBotTrailCollision?.(otherBot.id as number); // Signal collision
											}
											collisionDetected = true;
											break;
										}
									}
								}
								if (collisionDetected) break;
							}
						}
					}
				}
			} // --- End Collision Detection Block ---

			// If collision detected AND this entity should die, trigger self-death and stop
			if (shouldEntityDie) {
				// console.log(`${entityId} marked for death, triggering onSelfIntersection`);
				onSelfIntersection?.(); // Trigger the generic self-death callback
				return; // Exit useFrame early
			}
			// If collision detected but this entity shouldn't die (it killed someone else),
			// the appropriate callback was already called. We still stop movement for this frame.
			if (collisionDetected) {
				// console.log(`${entityId} detected collision but survived (killed other). Stopping movement.`);
				return; // Exit useFrame early
			}

			// --- Update Position State (if no collision) ---
			internalPosition.current.set(potentialNewX, 0, potentialNewZ);
			groupRef.current.position.copy(internalPosition.current);
			if (onPositionUpdate) {
				onPositionUpdate([
					internalPosition.current.x,
					internalPosition.current.z,
				]);
			}

			// --- Trail Update Logic ---
			const justCrossedBoundary = wasInsideTerritory.current !== isInside;
			const justExited = justCrossedBoundary && !isInside;
			const justEntered = justCrossedBoundary && isInside;

			if (justEntered) {
				// Call handler with the entry point (potentialNextPos2D).
				if (onTrailUpdate) {
					onTrailUpdate(potentialNextPos2D);
				}
			} else if (!isInside) {
				// If outside territory...
				if (justExited) {
					// Call the handler with the position *before* moving outside (currentPos2D).
					// The handler will find the closest boundary point, reset trail, add boundary point, then add this point.
					if (onTrailUpdate) {
						onTrailUpdate(currentPos2D); // Pass the last point inside/on boundary
						lastTrailUpdate.current = time; // Reset timer for subsequent points
					}
				} else {
					// Still outside, add points periodically (potentialNextPos2D).
					if (time - lastTrailUpdate.current >= TRAIL_UPDATE_INTERVAL) {
						if (onTrailUpdate) {
							onTrailUpdate(potentialNextPos2D);
							lastTrailUpdate.current = time; // Reset timer
						}
					}
				}
			}

			// Update territory status for the next frame
			wasInsideTerritory.current = isInside;

			// --- Update Rotation ---
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
			onSelfIntersection, // Prop is passed down
			...entityProps // Includes onTrailUpdate from GameEntityProps
		},
		ref
	) => {
		const wasInsideTerritory = useRef(true); // Internal state matching GameEntity's

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

		// Custom trail update handler - This is passed as `onTrailUpdate` to GameEntity
		const handleTrailUpdate = (position: [number, number]) => {
			// Check if the entity is inside its own territory *before* this update
			// We use the internal ref which is updated at the *end* of the previous frame.
			const isCurrentlyInside = isPointInPolygon(position, territory);
			const justEntered = !wasInsideTerritory.current && isCurrentlyInside;
			const justExited = wasInsideTerritory.current && !isCurrentlyInside;

			if (justExited) {
				// Just exited territory. 'position' is the last point inside/on boundary.
				// 1. Find the closest point on the territory boundary to this exit point.
				const closestBoundaryPoint = findClosestPointOnPolygon(
					position,
					territory
				);

				// 2. Reset the trail.
				onResetTrail?.();

				// 3. Add the closest boundary point to the start of the new trail.
				entityProps.onTrailUpdate?.(closestBoundaryPoint);

				// 4. Add the actual exit point (the last point inside/on boundary) right after.
				entityProps.onTrailUpdate?.(position);
			} else if (justEntered) {
				// Just re-entered territory. 'position' is the entry point (potentialNextPos2D).
				// Add the entry point first.
				entityProps.onTrailUpdate?.(position); // Call original store action (add...ToTrail)

				// Now check trail length *after* adding the entry point.
				const estimatedTrailLength = (trail?.length ?? 0) + 1;
				if (estimatedTrailLength >= 3) {
					onConquerTerritory?.(); // Triggers conquest (which should also reset trail in store to [])
				} else {
					onResetTrail?.(); // Trail too short, reset to []
				}
			} else if (!isCurrentlyInside) {
				// Still outside territory (and not the first frame exiting).
				// 'position' is potentialNextPos2D. Add it to the existing trail.
				entityProps.onTrailUpdate?.(position); // Call original store action (add...ToTrail)
			}
			// If inside and not justEntered, do nothing.

			// Update internal state for next frame check using the territory status of the received position
			wasInsideTerritory.current = isPointInPolygon(position, territory);
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
					trail={trail} // Pass trail down for self-intersection checks
					onTrailUpdate={handleTrailUpdate} // Use the refined handler
					insideTerritoryCheck={(pos) => isPointInPolygon(pos, territory)}
					// onSelfIntersection is passed via entityProps
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
