// Gojo's Limitless Techniques Visualization
let gojoAnimating = false;
let currentTechnique = 0; // 0: Neutral, 1: Blue, 2: Red, 3: Purple, 4: Void, 5: Blue Spiral, 6: Red Divergence
const techniques = ['neutral', 'blue', 'red', 'purple', 'void', 'blueSpiral', 'redDivergence'];
let scene, camera, renderer, particles;
let targetPositions, targetColors, targetSizes;
let voidTime = 0;
let infinityTime = 0; // Time since Infinity was activated
let infinityStartTime = 0; // When Infinity technique was first shown
let blueSpiralTime = 0; // Time since Blue Spiral was activated
let blueSpiralStartTime = 0; // When Blue Spiral technique was first shown
let redDivergenceTime = 0; // Time since Red Divergence was activated
let redDivergenceStartTime = 0; // When Red Divergence technique was first shown
let redPulseTime = 0; // Time for Red technique pulsing
let redPulseStartTime = 0; // When Red technique was first shown
let gojoIsActive = false; // true only when Gojo is the active unified viz panel
const COUNT = 15000;
const VOID_PARTICLE_COUNT = 30000; // More particles for fluid black hole
// ============================================
// INFINITY TECHNIQUE - TWEAKABLE VARIABLES
// ============================================
const INFINITY_SPHERE_RADIUS = 20; // The barrier sphere radius (smaller = tighter barrier)
const INFINITY_TOTAL_PARTICLES = 2000; // Total number of particles to spawn
const INFINITY_SPAWN_DURATION = 20; // Time in seconds to spawn all particles
const INFINITY_APPROACH_SPEED = 5; // Speed of particles approaching from infinity (higher = faster)
const INFINITY_STOP_THRESHOLD = 0.95; // Percentage of radius where particles completely stop (0.95 = 95% of radius)
const INFINITY_SLOWDOWN_POWER = 12; // Power for slowdown curve (higher = more instant stop)
const INFINITY_MIN_STOP_DISTANCE = 5; // Distance from center where particles completely stop (units)
const INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE = 0.4; // Brightness of particles outside sphere (0-1)
const INFINITY_PARTICLE_BRIGHTNESS_INSIDE = 1.0; // Brightness of particles inside sphere (0-1)
const INFINITY_PARTICLE_SIZE = 100; // Size of particles (higher = bigger)
const INFINITY_COLOR_R = 0.12; // Red component of particle color (0-1)
const INFINITY_COLOR_G = 0.12; // Green component of particle color (0-1)
const INFINITY_COLOR_B = 0.25; // Blue component of particle color (0-1)
// ============================================

// ============================================
// GOJO VIZ - TRAILS + MOTION (TWEAKABLE)
// ============================================
const GOJO_TRAILS_ENABLED = true; // if true, particles leave fading trails
const GOJO_TRAIL_FADE_ALPHA = 0.0001; // higher = trails fade faster; lower = longer trails
const GOJO_PAN_ROT_Y = 0.0005; // slower global panning rotation
const GOJO_ROT_SCALE = 0.35; // scales Blue/Red/Purple rotations
// ============================================

let fadeScene, fadeCamera, fadeMesh, fadeMaterial;

// Load Three.js from CDN
let THREE, EffectComposer, RenderPass, UnrealBloomPass;

// Load Three.js libraries
function initGojoWhenReady() {
    if (gojoAnimating) return;
    if (!window.THREE) {
        // Wait for Three.js to load
        setTimeout(initGojoWhenReady, 100);
        return;
    }
    gojoAnimating = true;
    THREE = window.THREE;
    initGojo();
}

observeElement('#unified-viz', () => {
    initGojoWhenReady();
}, 0.3);

// Also listen for manual init event
window.addEventListener('gojo-init', initGojoWhenReady);

function initGojo() {
    const canvas = document.getElementById('gojoCanvas');
    if (!canvas) return;
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure black space background
    camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    camera.position.z = 55;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Using standard renderer (post-processing not needed for this effect)
    // Trails: we manage clearing manually
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);

    // Particle system
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    
    targetPositions = new Float32Array(COUNT * 3);
    targetColors = new Float32Array(COUNT * 3);
    targetSizes = new Float32Array(COUNT);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    particles = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: true,
            opacity: 1.0
        })
    );
    scene.add(particles);

    // Trails fade pass (overlay slightly-transparent black each frame)
    fadeScene = new THREE.Scene();
    fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    fadeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: GOJO_TRAIL_FADE_ALPHA,
        depthWrite: false
    });
    fadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMaterial);
    fadeMesh.frustumCulled = false;
    fadeScene.add(fadeMesh);

    // Initialize the technique state, but do NOT start spawning until Gojo is active
    currentTechnique = 0;
    updateTechnique(0);
    renderer.clear(true, true, true);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Only animate once Gojo is the active unified viz panel
        if (!gojoIsActive) return;

        // Trails: fade previous frame slightly (so trajectories are visible)
        if (GOJO_TRAILS_ENABLED && fadeScene && fadeCamera) {
            renderer.render(fadeScene, fadeCamera);
        } else {
            renderer.clear(true, true, true);
        }
        
        const pos = particles.geometry.attributes.position.array;
        const col = particles.geometry.attributes.color.array;
        const siz = particles.geometry.attributes.size.array;

        if (currentTechnique === 4) {
            // Unlimited Void - special handling for fluid black hole
            voidTime += 0.016; // ~60fps timing
            
            // Update Void particles with fluid dynamics
            for (let i = 0; i < COUNT; i++) {
                const idx = i * 3;
                
                // Determine particle type based on index ranges
                if (i < COUNT * 0.02) {
                    // Event horizon - pure black void (minimal particles)
                    const r = Math.random() * 6;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    targetPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
                    targetPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                    targetPositions[idx + 2] = r * Math.cos(phi);
                    targetColors[idx] = 0;
                    targetColors[idx + 1] = 0;
                    targetColors[idx + 2] = 0;
                    targetSizes[i] = 0.05;
                } else if (i < COUNT * 0.35) {
                    // Accretion disk - fluid swirling plasma
                    const diskIndex = i - COUNT * 0.02;
                    const totalDisk = COUNT * 0.33;
                    const t = diskIndex / totalDisk; // 0 to 1
                    
                    // Radius increases from inner to outer
                    const baseRadius = 6 + t * 25;
                    const radiusVariation = Math.sin(t * 8 + voidTime * 2) * 2;
                    const radius = baseRadius + radiusVariation;
                    
                    // Orbital angle with differential rotation (faster near center)
                    const orbitalSpeed = (1.0 / Math.max(radius, 8)) * 0.8;
                    const baseAngle = (diskIndex / 200) * Math.PI * 2; // Distribute around circle
                    const angle = baseAngle + voidTime * orbitalSpeed;
                    
                    // Height variation for 3D disk
                    const height = Math.sin(angle * 2 + voidTime) * (1 - t) * 3;
                    
                    targetPositions[idx] = radius * Math.cos(angle);
                    targetPositions[idx + 1] = height;
                    targetPositions[idx + 2] = radius * Math.sin(angle);
                    
                    // Color gradient: white/blue inner -> yellow/green middle -> blue outer
                    if (t < 0.3) {
                        // Inner: bright white-blue
                        const brightness = 1.0 - t * 0.5;
                        targetColors[idx] = brightness * 0.8;
                        targetColors[idx + 1] = brightness * 0.9;
                        targetColors[idx + 2] = brightness * 1.0;
                        targetSizes[i] = 0.4 * brightness;
                    } else if (t < 0.6) {
                        // Middle: yellow-green transition
                        const localT = (t - 0.3) / 0.3;
                        targetColors[idx] = 0.8 - localT * 0.3;
                        targetColors[idx + 1] = 0.7 - localT * 0.2;
                        targetColors[idx + 2] = 0.5 - localT * 0.3;
                        targetSizes[i] = 0.3;
                    } else {
                        // Outer: deep blue
                        targetColors[idx] = 0.2;
                        targetColors[idx + 1] = 0.3;
                        targetColors[idx + 2] = 0.6;
                        targetSizes[i] = 0.2;
                    }
                } else {
                    // Deep space stars - sparse, twinkling
                    const starIndex = i - COUNT * 0.35;
                    if (starIndex % 3 === 0) { // Only show 1/3 as stars for sparsity
                        const r = 50 + Math.random() * 150;
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        const twinkle = 0.5 + Math.sin(voidTime * 2 + starIndex) * 0.5;
                        
                        targetPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
                        targetPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
                        targetPositions[idx + 2] = r * Math.cos(phi);
                        targetColors[idx] = twinkle * 0.9;
                        targetColors[idx + 1] = twinkle * 0.9;
                        targetColors[idx + 2] = twinkle * 1.0;
                        targetSizes[i] = twinkle * 0.15;
                    } else {
                        // Hide other particles
                        targetPositions[idx] = 0;
                        targetPositions[idx + 1] = 0;
                        targetPositions[idx + 2] = 0;
                        targetColors[idx] = 0;
                        targetColors[idx + 1] = 0;
                        targetColors[idx + 2] = 0;
                        targetSizes[i] = 0;
                    }
                }
            }
            
            // Smooth interpolation for fluid motion
            for (let i = 0; i < COUNT * 3; i++) {
                pos[i] += (targetPositions[i] - pos[i]) * 0.15;
                col[i] += (targetColors[i] - col[i]) * 0.15;
            }
            for (let i = 0; i < COUNT; i++) {
                siz[i] += (targetSizes[i] - siz[i]) * 0.15;
            }
            
            particles.rotation.set(0, 0, 0);
        } else if (currentTechnique === 0) {
            // Infinity - particles spawn from infinity and approach, slowing at sphere boundary
            if (infinityStartTime === 0) {
                infinityStartTime = Date.now() * 0.001;
            }
            infinityTime = (Date.now() * 0.001) - infinityStartTime;
            
            // Spawn particles ONE AT A TIME (pew pew pew effect)
            // Calculate how many particles should have spawned by now
            const particlesPerSecond = INFINITY_TOTAL_PARTICLES / INFINITY_SPAWN_DURATION;
            const maxActiveParticles = Math.min(COUNT, Math.min(INFINITY_TOTAL_PARTICLES, Math.floor(infinityTime * particlesPerSecond)));
            
            // Get viewport dimensions for edge spawning
            const cameraDistance = 55;
            const fov = 75 * Math.PI / 180;
            const aspect = canvas.offsetWidth / canvas.offsetHeight;
            const viewportHeight = 2 * Math.tan(fov / 2) * cameraDistance;
            const viewportWidth = viewportHeight * aspect;
            const edgeDistance = Math.max(viewportWidth, viewportHeight) * 0.5; // Spawn from edges
            const viewportDepth = 150; // Depth for 3D
            
            for (let i = 0; i < COUNT; i++) {
                const idx = i * 3;
                const currentX = pos[idx];
                const currentY = pos[idx + 1];
                const currentZ = pos[idx + 2];
                const currentDist = Math.sqrt(currentX * currentX + currentY * currentY + currentZ * currentZ);
                
                if (i < maxActiveParticles) {
                    // This particle should be active
                    if (currentDist < 5) {
                        // Particle hasn't been initialized yet - spawn it at screen edges
                        // Spawn from edges of viewport in random directions
                        const spawnType = Math.random();
                        let spawnX, spawnY, spawnZ;
                        
                        if (spawnType < 0.25) {
                            // Left edge
                            spawnX = -edgeDistance;
                            spawnY = (Math.random() - 0.5) * viewportHeight;
                            spawnZ = (Math.random() - 0.5) * viewportDepth;
                        } else if (spawnType < 0.5) {
                            // Right edge
                            spawnX = edgeDistance;
                            spawnY = (Math.random() - 0.5) * viewportHeight;
                            spawnZ = (Math.random() - 0.5) * viewportDepth;
                        } else if (spawnType < 0.75) {
                            // Top edge
                            spawnX = (Math.random() - 0.5) * viewportWidth;
                            spawnY = edgeDistance;
                            spawnZ = (Math.random() - 0.5) * viewportDepth;
                        } else {
                            // Bottom edge
                            spawnX = (Math.random() - 0.5) * viewportWidth;
                            spawnY = -edgeDistance;
                            spawnZ = (Math.random() - 0.5) * viewportDepth;
                        }
                        
                        // Also add some depth variation
                        spawnZ += (Math.random() - 0.5) * viewportDepth;
                        
                        pos[idx] = spawnX;
                        pos[idx + 1] = spawnY;
                        pos[idx + 2] = spawnZ;
                        
                        // Calculate direction toward center
                        const startRadius = Math.sqrt(spawnX * spawnX + spawnY * spawnY + spawnZ * spawnZ);
                        const dirX = -spawnX / startRadius;
                        const dirY = -spawnY / startRadius;
                        const dirZ = -spawnZ / startRadius;
                        
                        // Store direction for movement
                        targetPositions[idx] = dirX;
                        targetPositions[idx + 1] = dirY;
                        targetPositions[idx + 2] = dirZ;
                        
                        // Make visible even at distance (use outside brightness)
                        col[idx] = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE * INFINITY_COLOR_R;
                        col[idx + 1] = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE * INFINITY_COLOR_G;
                        col[idx + 2] = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE * INFINITY_COLOR_B;
                        siz[i] = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE * INFINITY_PARTICLE_SIZE;
                    } else {
                        // Particle is moving or stopped - get direction
                        const dirX = targetPositions[idx];
                        const dirY = targetPositions[idx + 1];
                        const dirZ = targetPositions[idx + 2];
                        
                        // Check if particle has crossed the sphere boundary
                        let speed;
                        if (currentDist > INFINITY_SPHERE_RADIUS) {
                            speed = INFINITY_APPROACH_SPEED; // Fast approach from infinity
                        } else {
                            // Inside sphere: ALMOST INSTANTANEOUS STOP
                            // Very sharp transition - particles almost instantly stop
                            const normalizedDist = currentDist / INFINITY_SPHERE_RADIUS;
                            // Use very high power for almost instant stop
                            speed = 0.1 * Math.pow(normalizedDist, INFINITY_SLOWDOWN_POWER);
                            // If inside stop threshold, stop almost immediately
                            if (currentDist < INFINITY_SPHERE_RADIUS * INFINITY_STOP_THRESHOLD) {
                                speed = 0; // Complete stop - they stay there
                            }
                            // Complete stop very close to center
                            if (currentDist < INFINITY_MIN_STOP_DISTANCE) {
                                speed = 0;
                            }
                        }
                        
                        // Move particle toward center (only if speed > 0)
                        if (speed > 0) {
                            pos[idx] += dirX * speed;
                            pos[idx + 1] += dirY * speed;
                            pos[idx + 2] += dirZ * speed;
                        }
                        // If speed is 0, particle stays where it is (no movement)
                        
                        // Update brightness based on distance
                        const newDist = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                        let brightness;
                        if (newDist > INFINITY_SPHERE_RADIUS) {
                            // Outside sphere - dim but visible
                            brightness = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE;
                        } else {
                            // Inside sphere - brighter as closer
                            const normalizedDist = newDist / INFINITY_SPHERE_RADIUS;
                            brightness = INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE + (INFINITY_PARTICLE_BRIGHTNESS_INSIDE - INFINITY_PARTICLE_BRIGHTNESS_OUTSIDE) * (1.0 - normalizedDist);
                        }
                        
                        col[idx] = brightness * INFINITY_COLOR_R;
                        col[idx + 1] = brightness * INFINITY_COLOR_G;
                        col[idx + 2] = brightness * INFINITY_COLOR_B;
                        // Size increases as particles get closer (brighter = larger)
                        siz[i] = brightness * INFINITY_PARTICLE_SIZE;
                    }
                } else {
                    // Particle not active yet - keep it invisible
                    pos[idx] = 0;
                    pos[idx + 1] = 0;
                    pos[idx + 2] = 0;
                    col[idx] = 0;
                    col[idx + 1] = 0;
                    col[idx + 2] = 0;
                    siz[i] = 0;
                }
            }
            
            particles.rotation.y += GOJO_PAN_ROT_Y;
        } else if (currentTechnique === 5) {
            // Blue Spiral - dynamic: particles come from infinity, spiral inward, and rotate
            if (gojoIsActive && blueSpiralStartTime === 0) {
                blueSpiralStartTime = Date.now() * 0.001;
            }
            if (blueSpiralStartTime > 0) {
                blueSpiralTime = (Date.now() * 0.001) - blueSpiralStartTime;
            }
            
            const BLUE_SPIRAL_SPHERE_RADIUS = 12;
            const BLUE_SPIRAL_SPAWN_DURATION = 15;
            const BLUE_SPIRAL_APPROACH_SPEED = 4;
            const BLUE_SPIRAL_SLOWDOWN_POWER = 8;
            const BLUE_SPIRAL_TURNS = 15;
            
            // Calculate how many particles should be active
            const maxActiveParticles = Math.min(COUNT, Math.floor((blueSpiralTime / BLUE_SPIRAL_SPAWN_DURATION) * COUNT));
            
            for (let i = 0; i < COUNT; i++) {
                const idx = i * 3;
                
                if (i < maxActiveParticles) {
                    // Particle is active - spawn from infinity and spiral inward
                    const t = i / COUNT;
                    
                    // Spiral parameters - multiple arms for complexity
                    const armIndex = i % 4;
                    const armPhase = (armIndex * Math.PI * 2) / 4;
                    
                    // Current distance from center
                    const currentDist = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                    
                    // If particle hasn't been initialized, spawn it from infinity
                    if (currentDist < 0.1) {
                        const spawnDistance = 70 + Math.random() * 30;
                        const spawnAngle = Math.random() * Math.PI * 2;
                        const spawnPolar = Math.acos(2 * Math.random() - 1);
                        pos[idx] = spawnDistance * Math.sin(spawnPolar) * Math.cos(spawnAngle);
                        pos[idx + 1] = spawnDistance * Math.sin(spawnPolar) * Math.sin(spawnAngle);
                        pos[idx + 2] = spawnDistance * Math.cos(spawnPolar);
                    }
                    
                    // Calculate current spherical coordinates
                    const currentDist2 = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                    const currentPolar = Math.acos(pos[idx + 2] / (currentDist2 + 0.001));
                    const currentAzimuth = Math.atan2(pos[idx + 1], pos[idx]);
                    
                    // Spiral target: particles spiral inward while rotating
                    // The spiral wraps around the sphere, getting closer as it rotates
                    const spiralProgress = 1.0 - (currentDist2 / 80); // 0 at infinity, 1 at sphere
                    const targetDistance = BLUE_SPIRAL_SPHERE_RADIUS + (1.0 - spiralProgress) * 30;
                    
                    // Spiral angle: combines particle index, time, and arm phase
                    const spiralAngle = t * BLUE_SPIRAL_TURNS * Math.PI * 2 + armPhase + blueSpiralTime * 1.5;
                    
                    // Target position on 3D spiral
                    const targetPolar = t * Math.PI; // Wraps from top to bottom
                    const targetAzimuth = spiralAngle;
                    
                    // Calculate direction: toward center + spiral rotation
                    const towardCenterX = -pos[idx] / (currentDist2 + 0.001);
                    const towardCenterY = -pos[idx + 1] / (currentDist2 + 0.001);
                    const towardCenterZ = -pos[idx + 2] / (currentDist2 + 0.001);
                    
                    // Spiral rotation component (tangent to sphere)
                    const tangentX = -Math.sin(currentAzimuth);
                    const tangentY = Math.cos(currentAzimuth);
                    const tangentZ = 0;
                    
                    // Combine: move toward center + spiral around
                    const spiralStrength = 0.3;
                    let dirX = towardCenterX + tangentX * spiralStrength;
                    let dirY = towardCenterY + tangentY * spiralStrength;
                    let dirZ = towardCenterZ + tangentZ * spiralStrength;
                    
                    // Normalize direction
                    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                    if (dirLen > 0.01) {
                        dirX /= dirLen;
                        dirY /= dirLen;
                        dirZ /= dirLen;
                    }
                    
                    // Speed: fast from infinity, slow down near sphere (like original Blue)
                    let speed = BLUE_SPIRAL_APPROACH_SPEED;
                    if (currentDist2 > BLUE_SPIRAL_SPHERE_RADIUS) {
                        // Outside sphere - fast approach
                        speed = BLUE_SPIRAL_APPROACH_SPEED;
                    } else {
                        // Inside sphere - slow down and continue spiraling
                        const normalizedDist = currentDist2 / BLUE_SPIRAL_SPHERE_RADIUS;
                        speed = 0.4 * Math.pow(normalizedDist, BLUE_SPIRAL_SLOWDOWN_POWER);
                        // Add continuous spiral rotation even when close
                        speed = Math.max(speed, 0.15);
                    }
                    
                    // Move particle
                    pos[idx] += dirX * speed;
                    pos[idx + 1] += dirY * speed;
                    pos[idx + 2] += dirZ * speed;
                    
                    // Add continuous rotation around the spiral axis
                    // Rotate around Y axis to create the 3D spiral effect
                    const rotSpeed = 0.025 * GOJO_ROT_SCALE;
                    const cosRot = Math.cos(rotSpeed);
                    const sinRot = Math.sin(rotSpeed);
                    const newX = pos[idx] * cosRot - pos[idx + 2] * sinRot;
                    const newZ = pos[idx] * sinRot + pos[idx + 2] * cosRot;
                    pos[idx] = newX;
                    pos[idx + 2] = newZ;
                    
                    // Color: bright blue, pulsing based on position and time
                    const brightness = 0.8 + Math.sin(spiralAngle * 2 + blueSpiralTime * 3) * 0.2;
                    const blueIntensity = 0.9 + Math.sin(currentPolar * 8) * 0.1;
                    col[idx] = 0.15 * brightness;
                    col[idx + 1] = 0.5 * brightness * blueIntensity;
                    col[idx + 2] = 2.0 * brightness * blueIntensity;
                    siz[i] = 1.0 + (1.0 - spiralProgress) * 0.5;
                } else {
                    // Particle not active yet - spawn from far away
                    const spawnDistance = 80 + Math.random() * 20;
                    const spawnAngle = Math.random() * Math.PI * 2;
                    const spawnPolar = Math.acos(2 * Math.random() - 1);
                    pos[idx] = spawnDistance * Math.sin(spawnPolar) * Math.cos(spawnAngle);
                    pos[idx + 1] = spawnDistance * Math.sin(spawnPolar) * Math.sin(spawnAngle);
                    pos[idx + 2] = spawnDistance * Math.cos(spawnPolar);
                    col[idx] = 0;
                    col[idx + 1] = 0;
                    col[idx + 2] = 0;
                    siz[i] = 0;
                }
            }
            
            // Slow global rotation to view the 3D spiral pattern
            particles.rotation.y += 0.015 * GOJO_ROT_SCALE;
        } else if (currentTechnique === 6) {
            // Red Divergence - dynamic: particles explode from center in massive spiral aura
            if (gojoIsActive && redDivergenceStartTime === 0) {
                redDivergenceStartTime = Date.now() * 0.001;
            }
            if (redDivergenceStartTime > 0) {
                redDivergenceTime = (Date.now() * 0.001) - redDivergenceStartTime;
            }
            
            const RED_DIVERGENCE_CORE_RADIUS = 6;
            const RED_DIVERGENCE_SPAWN_DURATION = 8; // Faster spawn for more particles
            const RED_DIVERGENCE_EXPLOSION_SPEED = 12; // Much faster explosion
            const RED_DIVERGENCE_SPIRAL_TURNS = 20; // More spiral turns for crazier pattern
            const RED_DIVERGENCE_MAX_DISTANCE = 150; // Particles travel further
            const RED_DIVERGENCE_PARTICLE_MULTIPLIER = 1.5; // Use more particles
            
            // Calculate how many particles should be active - spawn faster and use more
            const maxActiveParticles = Math.min(COUNT, Math.floor((redDivergenceTime / RED_DIVERGENCE_SPAWN_DURATION) * COUNT * RED_DIVERGENCE_PARTICLE_MULTIPLIER));
            
            for (let i = 0; i < COUNT; i++) {
                const idx = i * 3;
                
                if (i < maxActiveParticles) {
                    // Particle is active - explode from center in spiral pattern
                    const t = i / COUNT;
                    
                    // Spiral parameters - multiple arms for massive aura effect
                    const armIndex = i % 5;
                    const armPhase = (armIndex * Math.PI * 2) / 5;
                    
                    // Current distance from center
                    const currentDist = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                    
                    // If particle hasn't been initialized, spawn it at center
                    if (currentDist < 0.1) {
                        // Start at center with slight random offset
                        const offset = (Math.random() - 0.5) * RED_DIVERGENCE_CORE_RADIUS * 0.5;
                        pos[idx] = offset;
                        pos[idx + 1] = offset;
                        pos[idx + 2] = offset;
                    }
                    
                    // Calculate current spherical coordinates
                    const currentDist2 = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                    const currentPolar = Math.acos(pos[idx + 2] / (currentDist2 + 0.001));
                    const currentAzimuth = Math.atan2(pos[idx + 1], pos[idx]);
                    
                    // Spiral angle: particles spiral outward as they expand
                    const spiralAngle = t * RED_DIVERGENCE_SPIRAL_TURNS * Math.PI * 2 + armPhase - redDivergenceTime * 2;
                    
                    // Target distance: particles want to expand outward
                    const expansionProgress = currentDist2 / RED_DIVERGENCE_MAX_DISTANCE;
                    const targetDistance = RED_DIVERGENCE_CORE_RADIUS + expansionProgress * (RED_DIVERGENCE_MAX_DISTANCE - RED_DIVERGENCE_CORE_RADIUS);
                    
                    // Calculate direction: away from center + spiral rotation
                    const awayFromCenterX = pos[idx] / (currentDist2 + 0.001);
                    const awayFromCenterY = pos[idx + 1] / (currentDist2 + 0.001);
                    const awayFromCenterZ = pos[idx + 2] / (currentDist2 + 0.001);
                    
                    // Spiral rotation component (tangent to expansion sphere)
                    const tangentX = -Math.sin(currentAzimuth);
                    const tangentY = Math.cos(currentAzimuth);
                    const tangentZ = 0;
                    
                    // Combine: explode outward + stronger spiral around for crazy divergence
                    const spiralStrength = 0.7; // Stronger spiral for more chaos
                    let dirX = awayFromCenterX + tangentX * spiralStrength;
                    let dirY = awayFromCenterY + tangentY * spiralStrength;
                    let dirZ = awayFromCenterZ + tangentZ * spiralStrength;
                    
                    // Normalize direction
                    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                    if (dirLen > 0.01) {
                        dirX /= dirLen;
                        dirY /= dirLen;
                        dirZ /= dirLen;
                    }
                    
                    // Speed: CRAZY fast explosion, accelerate as it expands (intense divergence)
                    let speed = RED_DIVERGENCE_EXPLOSION_SPEED;
                    if (currentDist2 < RED_DIVERGENCE_CORE_RADIUS) {
                        // Inside core - accelerate outward rapidly
                        const normalizedDist = currentDist2 / RED_DIVERGENCE_CORE_RADIUS;
                        speed = RED_DIVERGENCE_EXPLOSION_SPEED * (0.8 + normalizedDist * 0.4);
                    } else {
                        // Outside core - ACCELERATE outward (massive push away effect)
                        // Speed increases dramatically with distance - feels like getting pushed
                        speed = RED_DIVERGENCE_EXPLOSION_SPEED * (1.2 + expansionProgress * expansionProgress * 1.5);
                    }
                    
                    // Move particle outward
                    pos[idx] += dirX * speed;
                    pos[idx + 1] += dirY * speed;
                    pos[idx + 2] += dirZ * speed;
                    
                    // Add continuous spiral rotation as particles expand - FASTER for crazier effect
                    // Rotate around Y axis to create the 3D spiral divergence effect
                    const rotSpeed = -0.05 * GOJO_ROT_SCALE; // Faster rotation, opposite direction from Blue
                    const cosRot = Math.cos(rotSpeed);
                    const sinRot = Math.sin(rotSpeed);
                    const newX = pos[idx] * cosRot - pos[idx + 2] * sinRot;
                    const newZ = pos[idx] * sinRot + pos[idx + 2] * cosRot;
                    pos[idx] = newX;
                    pos[idx + 2] = newZ;
                    
                    // Add additional rotation around X axis for more 3D chaos
                    const rotSpeedX = 0.03 * GOJO_ROT_SCALE;
                    const cosRotX = Math.cos(rotSpeedX);
                    const sinRotX = Math.sin(rotSpeedX);
                    const newY = pos[idx + 1] * cosRotX - pos[idx + 2] * sinRotX;
                    const newZ2 = pos[idx + 1] * sinRotX + pos[idx + 2] * cosRotX;
                    pos[idx + 1] = newY;
                    pos[idx + 2] = newZ2;
                    
                    // Color: INTENSE bright red, pulsing based on position and time
                    const brightness = 1.0 + Math.sin(spiralAngle * 3 + redDivergenceTime * 6) * 0.2;
                    const redIntensity = 1.2 + Math.sin(currentPolar * 8) * 0.3;
                    col[idx] = 3.5 * brightness * redIntensity; // Much brighter red
                    col[idx + 1] = 0.3 * brightness;
                    col[idx + 2] = 0.15 * brightness;
                    siz[i] = 1.5 + expansionProgress * 1.2; // Larger particles for more impact
                } else {
                    // Particle not active yet - keep at center
                    pos[idx] = 0;
                    pos[idx + 1] = 0;
                    pos[idx + 2] = 0;
                    col[idx] = 0;
                    col[idx + 1] = 0;
                    col[idx + 2] = 0;
                    siz[i] = 0;
                }
            }
            
            // Faster global rotation to view the crazy 3D divergence spiral pattern
            particles.rotation.y += 0.04 * GOJO_ROT_SCALE;
            particles.rotation.x += 0.015 * GOJO_ROT_SCALE;
        } else if (currentTechnique === 2) {
            // Red - continuous stream: dense at core, spirals out radially with net forward flux
            if (gojoIsActive && redPulseStartTime === 0) {
                redPulseStartTime = Date.now() * 0.001;
            }
            if (redPulseStartTime > 0) {
                redPulseTime = (Date.now() * 0.001) - redPulseStartTime;
            }
            
            const RED_STREAM_SPAWN_RATE = COUNT / 3.0; // Particles per second (spawns continuously)
            const RED_STREAM_SPEED = 10.0; // Speed of outward radial flow
            const RED_STREAM_MAX_DISTANCE = 100; // Maximum distance before reset
            const RED_STREAM_SPIRAL_TURNS = 5.0; // Number of spiral rotations over max distance
            const RED_CORE_DENSITY = 0.4; // How dense particles are at core (0-1)
            const RED_SPIRAL_STRENGTH = 0.6; // How strong the spiral is (0-1)
            
            // Calculate how many particles should be active (continuous spawning)
            const maxActiveParticles = Math.min(COUNT, Math.floor(redPulseTime * RED_STREAM_SPAWN_RATE));
            
            for (let i = 0; i < COUNT; i++) {
                const idx = i * 3;
                const currentX = pos[idx];
                const currentY = pos[idx + 1];
                const currentZ = pos[idx + 2];
                const currentDist = Math.sqrt(currentX * currentX + currentY * currentY + currentZ * currentZ);
                
                if (i < maxActiveParticles) {
                    // Particle should be active
                    if (currentDist < 1.5) {
                        // Particle at or near origin - initialize it
                        // Start at origin with slight random offset for dense core
                        const coreOffset = (Math.random() - 0.5) * RED_CORE_DENSITY * 2.0;
                        pos[idx] = coreOffset;
                        pos[idx + 1] = coreOffset;
                        pos[idx + 2] = coreOffset;
                        
                        // Store initial spherical direction for this particle (radial direction)
                        // Use consistent seed based on particle index for stable pattern
                        const seed = i * 137.508; // Golden angle
                        const theta = (seed % (Math.PI * 2));
                        const phi = Math.acos(1 - 2 * ((seed * 0.618) % 1)); // Even distribution on sphere
                        
                        // Store radial direction (this is the main outward direction)
                        targetPositions[idx] = Math.sin(phi) * Math.cos(theta);
                        targetPositions[idx + 1] = Math.sin(phi) * Math.sin(theta);
                        targetPositions[idx + 2] = Math.cos(phi);
                        
                        // Store spiral phase offset (unique per particle)
                        targetSizes[i] = theta; // Use theta as spiral phase
                    }
                    
                    // Get stored radial direction (main outward push)
                    const radialDirX = targetPositions[idx];
                    const radialDirY = targetPositions[idx + 1];
                    const radialDirZ = targetPositions[idx + 2];
                    const spiralPhase = targetSizes[i];
                    
                    // Calculate spiral angle based on distance from origin
                    // This creates a continuous spiral as particles move outward
                    const spiralAngle = (currentDist / RED_STREAM_MAX_DISTANCE) * RED_STREAM_SPIRAL_TURNS * Math.PI * 2 + spiralPhase + redPulseTime * 0.5;
                    
                    // Calculate current position's spherical coordinates
                    const currentPhi = Math.acos(Math.max(-1, Math.min(1, currentZ / (currentDist + 0.001))));
                    const currentTheta = Math.atan2(currentY, currentX);
                    
                    // Create tangent vectors for spiral rotation (perpendicular to radial)
                    // These are perpendicular to the radial direction
                    const upX = -Math.sin(currentPhi) * Math.cos(currentTheta);
                    const upY = -Math.sin(currentPhi) * Math.sin(currentTheta);
                    const upZ = Math.cos(currentPhi);
                    
                    // Cross product to get tangent (perpendicular to both radial and up)
                    const tangentX = radialDirY * upZ - radialDirZ * upY;
                    const tangentY = radialDirZ * upX - radialDirX * upZ;
                    const tangentZ = radialDirX * upY - radialDirY * upX;
                    
                    // Normalize tangent
                    const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
                    if (tangentLen > 0.01) {
                        const normTanX = tangentX / tangentLen;
                        const normTanY = tangentY / tangentLen;
                        const normTanZ = tangentZ / tangentLen;
                        
                        // Combine radial direction (main push) with spiral tangent
                        // Spiral strength increases with distance
                        const spiralFactor = Math.min(1.0, currentDist / 30.0) * RED_SPIRAL_STRENGTH;
                        const cosSpiral = Math.cos(spiralAngle);
                        const sinSpiral = Math.sin(spiralAngle);
                        
                        // Final direction: mostly radial, with spiral component
                        const finalDirX = radialDirX * (1.0 - spiralFactor * 0.3) + normTanX * sinSpiral * spiralFactor;
                        const finalDirY = radialDirY * (1.0 - spiralFactor * 0.3) + normTanY * sinSpiral * spiralFactor;
                        const finalDirZ = radialDirZ * (1.0 - spiralFactor * 0.3) + normTanZ * sinSpiral * spiralFactor;
                        
                        // Normalize final direction
                        const finalDirLen = Math.sqrt(finalDirX * finalDirX + finalDirY * finalDirY + finalDirZ * finalDirZ);
                        if (finalDirLen > 0.01) {
                            const normX = finalDirX / finalDirLen;
                            const normY = finalDirY / finalDirLen;
                            const normZ = finalDirZ / finalDirLen;
                            
                            // Move particle outward (continuous forward flux - always pushing radially out)
                            pos[idx] += normX * RED_STREAM_SPEED;
                            pos[idx + 1] += normY * RED_STREAM_SPEED;
                            pos[idx + 2] += normZ * RED_STREAM_SPEED;
                        } else {
                            // Fallback: pure radial expansion
                            pos[idx] += radialDirX * RED_STREAM_SPEED;
                            pos[idx + 1] += radialDirY * RED_STREAM_SPEED;
                            pos[idx + 2] += radialDirZ * RED_STREAM_SPEED;
                        }
                    } else {
                        // Fallback: pure radial expansion
                        pos[idx] += radialDirX * RED_STREAM_SPEED;
                        pos[idx + 1] += radialDirY * RED_STREAM_SPEED;
                        pos[idx + 2] += radialDirZ * RED_STREAM_SPEED;
                    }
                    
                    // Check if particle has gone too far - reset to origin for continuous stream
                    const newDist = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
                    if (newDist > RED_STREAM_MAX_DISTANCE) {
                        // Reset to origin for continuous loop
                        pos[idx] = (Math.random() - 0.5) * RED_CORE_DENSITY * 2.0;
                        pos[idx + 1] = (Math.random() - 0.5) * RED_CORE_DENSITY * 2.0;
                        pos[idx + 2] = (Math.random() - 0.5) * RED_CORE_DENSITY * 2.0;
                    }
                    
                    // Color: bright red, intensity based on distance from core
                    // Denser/brightest at core, fades as it expands
                    const distFactor = Math.min(1.0, newDist / 50.0);
                    const brightness = 1.0 - distFactor * 0.3; // Brighter near core
                    
                    col[idx] = 3.5 * brightness; // Bright red
                    col[idx + 1] = 0.3 * brightness;
                    col[idx + 2] = 0.15 * brightness;
                    
                    // Size: larger near core, smaller as it expands
                    siz[i] = 1.8 - distFactor * 1.0;
                } else {
                    // Particle not active yet - keep at origin
                    pos[idx] = 0;
                    pos[idx + 1] = 0;
                    pos[idx + 2] = 0;
                    col[idx] = 0;
                    col[idx + 1] = 0;
                    col[idx + 2] = 0;
                    siz[i] = 0;
                }
            }
            
            // No global rotation - particles spiral on their own
        } else {
            // Other techniques - standard interpolation
            for (let i = 0; i < COUNT * 3; i++) {
                pos[i] += (targetPositions[i] - pos[i]) * 0.1;
                col[i] += (targetColors[i] - col[i]) * 0.1;
            }
            for (let i = 0; i < COUNT; i++) {
                siz[i] += (targetSizes[i] - siz[i]) * 0.1;
            }
            
            // Technique-specific rotations
            if (currentTechnique === 1) { // Blue - inward spiral
                particles.rotation.z -= 0.1 * GOJO_ROT_SCALE;
            } else if (currentTechnique === 3) { // Purple - complex rotation
                particles.rotation.z += 0.2 * GOJO_ROT_SCALE;
                particles.rotation.y += 0.05 * GOJO_ROT_SCALE;
            }
        }

        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;
        particles.geometry.attributes.size.needsUpdate = true;

        renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        camera.aspect = canvas.width / canvas.height;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Called by unified viz switching: start/stop Gojo animation only when panel is active
window.gojoSetActive = function (active) {
    gojoIsActive = !!active;
    if (!gojoAnimating || !renderer) return;

    if (gojoIsActive) {
        // Start clean so trails show trajectories clearly
        renderer.clear(true, true, true);
        // If Infinity is the current technique, begin the "pew pew" spawn now
        if (currentTechnique === 0) {
            updateTechnique(0);
        }
        // If Blue Spiral is the current technique, begin spawning now
        if (currentTechnique === 5) {
            blueSpiralStartTime = Date.now() * 0.001;
        }
        // If Red technique is active, begin pulsing now
        if (currentTechnique === 2) {
            redPulseStartTime = Date.now() * 0.001;
        }
        // If Red Divergence is the current technique, begin exploding now
        if (currentTechnique === 6) {
            redDivergenceStartTime = Date.now() * 0.001;
        }
    } else {
        // When Gojo becomes inactive, reset timers
        infinityStartTime = 0;
        blueSpiralStartTime = 0;
        redPulseStartTime = 0;
        redDivergenceStartTime = 0;
    }
};

// Technique particle generators
function getNeutral(i) {
    // Infinity - particles start at infinity and approach over time
    // All particles start invisible/far away, will be positioned in animation
    return {
        x: 0,
        y: 0,
        z: 0,
        r: 0,
        g: 0,
        b: 0,
        s: 0
    };
}

function getBlue(i) {
    // Attractive singularity - particles spiral inward
    if (i < COUNT * 0.1) {
        // Core singularity
        const r = Math.random() * 9;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            r: 0.1, g: 0.3, b: 3.0, s: 2.5
        };
    } else {
        // Spiral arms converging
        const armCount = 3;
        const t = (i / COUNT);
        const angle = t * 15 + ((i % armCount) * (Math.PI * 2 / armCount));
        const radius = 2 + (t * 40);
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            z: (Math.random() - 0.5) * (10 * t),
            r: 0.2, g: 0.5, b: 1.0, s: 1.0
        };
    }
}

function getBlueSpiral(i) {
    // Beautiful 3D spiral wrapping around a central sphere/ball
    // Particles form a spiral pattern that wraps around a sphere, like wrapping a ball
    const t = i / COUNT;
    
    // Central sphere parameters
    const sphereRadius = 10; // Radius of the central ball
    
    // Spiral parameters
    const spiralTurns = 20; // Number of full rotations around sphere
    const spiralLayers = 10; // Number of layers wrapping around
    
    // Create multiple spiral arms for visual complexity
    const armIndex = i % 4; // 4 spiral arms
    const armPhase = (armIndex * Math.PI * 2) / 4;
    
    // Base angle - wraps around sphere horizontally (azimuth)
    const baseAngle = t * spiralTurns * Math.PI * 2 + armPhase;
    
    // Polar angle - determines vertical position (0 = top, π = bottom)
    // This creates the spiral wrapping from top to bottom
    const polarAngle = t * Math.PI;
    
    // Spiral distance from center - increases as we wrap around
    const distanceFromCenter = sphereRadius + (t * 18); // Spiral grows outward
    
    // Create 3D spiral using spherical coordinates
    // The spiral wraps around the sphere following its curvature
    const x = distanceFromCenter * Math.sin(polarAngle) * Math.cos(baseAngle);
    const y = distanceFromCenter * Math.sin(polarAngle) * Math.sin(baseAngle);
    const z = distanceFromCenter * Math.cos(polarAngle);
    
    // Add slight variation for organic, flowing feel
    const variation = 1.2;
    const finalX = x + (Math.random() - 0.5) * variation;
    const finalY = y + (Math.random() - 0.5) * variation;
    const finalZ = z + (Math.random() - 0.5) * variation;
    
    // Color: bright blue, pulsing based on spiral position
    const brightness = 0.8 + Math.sin(baseAngle * 5) * 0.2;
    const blueIntensity = 0.9 + Math.sin(polarAngle * 8) * 0.1;
    
    return {
        x: finalX,
        y: finalY,
        z: finalZ,
        r: 0.15 * brightness,
        g: 0.5 * brightness * blueIntensity,
        b: 2.0 * brightness * blueIntensity,
        s: 1.0 + t * 0.5
    };
}

function getRed(i) {
    // Repulsive divergence - exponential expansion
    if (i < COUNT * 0.15) {
        // Core explosion point
        const angle = Math.random() * Math.PI * 2;
        return {
            x: 26 * Math.cos(angle),
            y: 26 * Math.sin(angle),
            z: (Math.random() - 0.5) * 1,
            r: 3.0, g: 0.1, b: 0.1, s: 2.5
        };
    } else {
        // Exponential expansion: d(t) = d₀e^(λt)
        const lambda = 0.05;
        const t = (i / COUNT);
        const radius = 30 * Math.exp(lambda * t * 100);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.sin(phi) * Math.sin(theta),
            z: radius * Math.cos(phi),
            r: 1.0 + t * 2, g: 0.1, b: 0.1, s: 0.7 + t
        };
    }
}

function getPurple(i) {
    // Hollow Purple - superposition of Blue and Red (annihilation)
    if (Math.random() > 0.8) {
        // Erased space particles
        return {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            z: (Math.random() - 0.5) * 100,
            r: 0.5, g: 0.5, b: 0.7, s: 0.8
        };
    }
    // Spiral pattern with void regions
    const r = 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        r: 0.6, g: 0.5, b: 1.0, s: 2.5
    };
}

function getVoid(i) {
    // Unlimited Void - Initial setup (will be animated in real-time)
    // This is just for initial positioning, actual animation happens in animate loop
    const total = COUNT;
    
    if (i < total * 0.02) {
        // Event horizon
        return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0.05 };
    } else if (i < total * 0.35) {
        // Accretion disk - will be animated
        const t = (i - total * 0.02) / (total * 0.33);
        const radius = 6 + t * 25;
        const angle = (i / 200) * Math.PI * 2;
        return {
            x: radius * Math.cos(angle),
            y: 0,
            z: radius * Math.sin(angle),
            r: 0.5, g: 0.5, b: 0.8, s: 0.3
        };
    } else {
        // Space stars
        const r = 50 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            r: 0.5, g: 0.5, b: 0.5, s: 0.1
        };
    }
}

function updateTechnique(index) {
    currentTechnique = index;
    const tech = techniques[index];
    
    // Reset Infinity when switching TO it (starts empty)
    if (index === 0) {
        // Reset timer
        infinityTime = 0;
        // Only start the timer when Gojo is actually active (prevents spawning on page load)
        infinityStartTime = gojoIsActive ? (Date.now() * 0.001) : 0;
    }
    
    // Reset Blue Spiral when switching TO it (starts empty)
    if (index === 5) {
        blueSpiralTime = 0;
        blueSpiralStartTime = gojoIsActive ? (Date.now() * 0.001) : 0;
    }
    
    // Reset Red technique when switching TO it (starts at origin)
    if (index === 2) {
        redPulseTime = 0;
        redPulseStartTime = gojoIsActive ? (Date.now() * 0.001) : 0;
    }
    
    // Reset Red Divergence when switching TO it (starts empty)
    if (index === 6) {
        redDivergenceTime = 0;
        redDivergenceStartTime = gojoIsActive ? (Date.now() * 0.001) : 0;
        
        // Reset all particles to center (starts empty)
        if (particles && particles.geometry) {
            const pos = particles.geometry.attributes.position.array;
            const col = particles.geometry.attributes.color.array;
            const siz = particles.geometry.attributes.size.array;
            for (let i = 0; i < COUNT; i++) {
                pos[i * 3] = 0;
                pos[i * 3 + 1] = 0;
                pos[i * 3 + 2] = 0;
                col[i * 3] = 0;
                col[i * 3 + 1] = 0;
                col[i * 3 + 2] = 0;
                siz[i] = 0;
            }
            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.color.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
        }
    }
    
    // Update technique name display
    const nameEl = document.getElementById('gojoTechniqueName');
    if (nameEl) {
        const names = [
            'Limitless: Infinity',
            'Cursed Technique Lapse: Blue',
            'Cursed Technique Reversal: Red',
            'Hollow Technique: Purple',
            'Domain Expansion: Unlimited Void',
            'Cursed Technique Lapse: Blue (3D Spiral)',
            'Cursed Technique Reversal: Red (Divergence Spiral)'
        ];
        nameEl.textContent = names[index];
    }
    
    // Update particle material and scene background
    if (particles && particles.material) {
        if (index === 4) {
            // Void - smaller particles for fluid look, pure black background
            particles.material.size = 0.1;
            scene.background = new THREE.Color(0x000000);
        } else {
            const sizes = [0.15, 0.2, 0.2, 0.25, 0.1, 0.3, 0.35];
            particles.material.size = sizes[index];
            scene.background = null; // Transparent for other techniques
        }
    }
    
    // Generate particle positions (for non-Infinity, non-BlueSpiral, and non-RedDivergence techniques)
    if (index !== 0 && index !== 5 && index !== 6) {
        for (let i = 0; i < COUNT; i++) {
            let p;
            if (tech === 'blue') p = getBlue(i);
            else if (tech === 'red') p = getRed(i);
            else if (tech === 'purple') p = getPurple(i);
            else if (tech === 'void') p = getVoid(i);
            
            targetPositions[i * 3] = p.x;
            targetPositions[i * 3 + 1] = p.y;
            targetPositions[i * 3 + 2] = p.z;
            targetColors[i * 3] = p.r;
            targetColors[i * 3 + 1] = p.g;
            targetColors[i * 3 + 2] = p.b;
            targetSizes[i] = p.s;
        }
    }
}

// Global function to switch techniques
window.switchGojoTechnique = function(direction) {
    if (!gojoAnimating || !targetPositions) return;
    currentTechnique = (currentTechnique + direction + techniques.length) % techniques.length;
    updateTechnique(currentTechnique);
};
