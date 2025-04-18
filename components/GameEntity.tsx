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

			// --- Collision Detection (Only if OUTSIDE territory) ---
			let collisionDetected = false;
			const isMoving = distanceSq(currentPos2D, potentialNextPos2D) > 0.0001;

			if (!isInside) {
				// Only check collisions when outside territory
				// Only check collision if moving significantly
				if (isMoving) {
					// 1. Self-intersection check
					if (trail && trail.length >= 3) {
						for (let i = 0; i < trail.length - 2; i++) {
							if (
								doSegmentsIntersect(
									currentPos2D,
									potentialNextPos2D,
									trail[i],
									trail[i + 1]
								)
							) {
								onSelfIntersection?.();
								collisionDetected = true;
								break;
							}
						}
					}

					// 2. Collision with other trails
					if (!collisionDetected) {
						if (isBot) {
							// Bot checks Player trail (only if player trail exists)
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
										onPlayerTrailCollision?.(entityId as number);
										collisionDetected = true;
										break;
									}
								}
							}
							// Bot checks other Bots' trails (only if trails exist)
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
												onBotBotTrailCollision?.(otherBot.id as number);
												collisionDetected = true;
												break;
											}
										}
									}
									if (collisionDetected) break;
								}
							}
						} else {
							// Player checks Bot trails (only if trails exist)
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
												onBotTrailCollision?.(otherBot.id as number);
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
				}
				// --- INSIDE Territory Collision Checks (Territory Intrusion) ---
				if (isMoving) {
					// Check collision with *other* entities' trails that might be intruding
					if (isBot) {
						// Bot checks Player trail inside Bot's territory
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
									// Bot crossed Player's trail inside Bot territory -> Player dies
									// console.log(`Bot ${entityId} hit player trail INSIDE its territory.`);
									onPlayerTrailCollision?.(entityId as number); // Player dies, killed by this bot
									collisionDetected = true;
									break;
								}
							}
						}
						// Bot checks other Bots' trails inside Bot's territory
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
											// Bot crossed other Bot's trail inside own territory -> Other bot dies
											// console.log(`Bot ${entityId} hit bot ${otherBot.id} trail INSIDE its territory.`);
											onBotBotTrailCollision?.(otherBot.id as number); // The *other* bot dies, killed by this bot
											collisionDetected = true;
											break;
										}
									}
								}
								if (collisionDetected) break;
							}
						}
					} else {
						// Player checks Bot trails inside Player's territory
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
											// Player crossed Bot's trail inside Player territory -> Bot dies
											// console.log(`Player hit bot ${otherBot.id} trail INSIDE player territory.`);
											onBotTrailCollision?.(otherBot.id as number); // Bot dies, killed by player
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

			// If collision detected, stop movement and exit
			if (collisionDetected) {
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

			if (isInside) {
				// Just entered territory
				if (justCrossedBoundary) {
					// Call onTrailUpdate with the entry point to potentially trigger conquest
					if (onTrailUpdate) {
						onTrailUpdate(potentialNextPos2D); // Pass the point that crossed the boundary
					}
				}
				// If already inside or just entered, the trail is not actively growing.
				// Conquest/reset logic is handled by the callback in GameEntityWithTrail.
			} else {
				// Outside territory
				if (justCrossedBoundary) {
					// Just exited territory. The callback in GameEntityWithTrail should have reset the trail.
					// Start the new trail by adding the exit point.
					if (onTrailUpdate) {
						onTrailUpdate(potentialNextPos2D);
						lastTrailUpdate.current = time; // Reset timer
					}
				} else {
					// Still outside territory, add point if interval passed
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
			onSelfIntersection, // Prop is passed down but check is removed from here
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
			const justEntered = !wasInsideTerritory.current && isInside;
			const justExited = wasInsideTerritory.current && !isInside;

			// Call the original onTrailUpdate from props (the store action)
			entityProps.onTrailUpdate?.(position);

			if (justEntered) {
				// Just re-entered territory.
				// Check trail length *after* the entry point has been added by the store action above.
				if (trail.length + 1 >= 3) {
					// Check length including the point just added
					onConquerTerritory?.(); // Triggers conquest (which should also reset trail in store)
				} else {
					onResetTrail?.(); // Trail too short, just reset it.
				}
			} else if (justExited) {
				// Just exited territory. Reset trail state immediately.
				onResetTrail?.();
				// The exit point itself is added by the store action called above.
			}
			// REMOVED Self-intersection check from here - it's handled in GameEntity's useFrame

			// Update internal state for next frame
			wasInsideTerritory.current = isInside;
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
					onTrailUpdate={handleTrailUpdate} // Use the refined handler for conquest logic
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
