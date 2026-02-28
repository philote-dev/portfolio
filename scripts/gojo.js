// Gojo's Limitless Techniques Visualization
let gojoAnimating = false;
let currentTechnique = 0; // 0: Neutral, 1: Blue, 2: Red, 3: Purple, 4: Void
const techniques = ['neutral', 'blue', 'red', 'purple', 'void'];
let scene, camera, renderer, particles;
let targetPositions, targetColors, targetSizes;
let voidTime = 0;
let infinityTime = 0; // Time since Infinity was activated
let infinityStartTime = 0; // When Infinity technique was first shown
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
const INFINITY_PARTICLE_SIZE = 0.7; // Size of particles (higher = bigger)
const INFINITY_COLOR_R = 0.12; // Red component of particle color (0-1)
const INFINITY_COLOR_G = 0.12; // Green component of particle color (0-1)
const INFINITY_COLOR_B = 0.25; // Blue component of particle color (0-1)
// ============================================

// ============================================
// GOJO VIZ - TRAILS + MOTION (TWEAKABLE)
// ============================================
const GOJO_TRAILS_ENABLED = true; // if true, particles leave fading trails
const GOJO_TRAIL_FADE_ALPHA = 0.045; // higher = trails fade faster; lower = longer/more visible trails
const GOJO_PAN_ROT_Y = 0.0012; // slower global panning rotation
const GOJO_ROT_SCALE = 0.35; // scales Blue/Red/Purple rotations
// ============================================

let fadeScene, fadeCamera, fadeMesh, fadeMaterial;

// ============================================
// INFINITY "COMET" TRAILS (TWEAKABLE)
// ============================================
const INFINITY_COMET_TRAILS_ENABLED = true; // faint tail behind each moving particle
const INFINITY_COMET_TRAIL_OPACITY = 0.35; // overall opacity of the tail lines
const INFINITY_COMET_TRAIL_STRETCH = 10.0; // exaggerates tail length (multiplies per-frame delta)
const INFINITY_COMET_TRAIL_MIN_LEN = 0.15; // hide tiny tails (stopped particles)
const INFINITY_COMET_TRAIL_MAX_PARTICLES = 2500; // cap for performance
// ============================================

let infinityTrailLine, infinityTrailGeom, infinityTrailPos, infinityTrailCol, infinityPrevPos;

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

    // Infinity comet trails: line segment from (tailStart) -> (particlePos)
    // This makes trajectories readable even when points are tiny.
    if (INFINITY_COMET_TRAILS_ENABLED) {
        const maxSeg = Math.min(INFINITY_COMET_TRAIL_MAX_PARTICLES, COUNT);
        infinityPrevPos = new Float32Array(maxSeg * 3);
        infinityTrailPos = new Float32Array(maxSeg * 2 * 3); // 2 vertices per segment
        infinityTrailCol = new Float32Array(maxSeg * 2 * 3);

        infinityTrailGeom = new THREE.BufferGeometry();
        infinityTrailGeom.setAttribute('position', new THREE.BufferAttribute(infinityTrailPos, 3));
        infinityTrailGeom.setAttribute('color', new THREE.BufferAttribute(infinityTrailCol, 3));

        infinityTrailLine = new THREE.LineSegments(
            infinityTrailGeom,
            new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: INFINITY_COMET_TRAIL_OPACITY,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        infinityTrailLine.visible = false;
        scene.add(infinityTrailLine);
    }

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
            const trailCount = INFINITY_COMET_TRAILS_ENABLED
                ? Math.min(maxActiveParticles, INFINITY_COMET_TRAIL_MAX_PARTICLES, COUNT)
                : 0;
            
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

            // Update comet trails for the active particles (small, readable tails)
            if (INFINITY_COMET_TRAILS_ENABLED && infinityTrailLine && infinityTrailGeom && infinityPrevPos) {
                infinityTrailLine.visible = true;
                for (let i = 0; i < trailCount; i++) {
                    const pIdx = i * 3;
                    const segIdx = i * 6; // 2 vertices * 3

                    const px = pos[pIdx];
                    const py = pos[pIdx + 1];
                    const pz = pos[pIdx + 2];

                    const prevx = infinityPrevPos[pIdx];
                    const prevy = infinityPrevPos[pIdx + 1];
                    const prevz = infinityPrevPos[pIdx + 2];

                    const dx = px - prevx;
                    const dy = py - prevy;
                    const dz = pz - prevz;
                    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // If particle is stopped or barely moving, hide tail
                    if (len < INFINITY_COMET_TRAIL_MIN_LEN) {
                        infinityTrailPos[segIdx] = px;
                        infinityTrailPos[segIdx + 1] = py;
                        infinityTrailPos[segIdx + 2] = pz;
                        infinityTrailPos[segIdx + 3] = px;
                        infinityTrailPos[segIdx + 4] = py;
                        infinityTrailPos[segIdx + 5] = pz;
                    } else {
                        // Tail start is "behind" the particle, exaggerating by stretch factor
                        const tx = px - dx * INFINITY_COMET_TRAIL_STRETCH;
                        const ty = py - dy * INFINITY_COMET_TRAIL_STRETCH;
                        const tz = pz - dz * INFINITY_COMET_TRAIL_STRETCH;

                        infinityTrailPos[segIdx] = tx;
                        infinityTrailPos[segIdx + 1] = ty;
                        infinityTrailPos[segIdx + 2] = tz;
                        infinityTrailPos[segIdx + 3] = px;
                        infinityTrailPos[segIdx + 4] = py;
                        infinityTrailPos[segIdx + 5] = pz;
                    }

                    // Color tail based on particle color, scaled down for subtlety
                    const cr = col[pIdx];
                    const cg = col[pIdx + 1];
                    const cb = col[pIdx + 2];
                    infinityTrailCol[segIdx] = cr * 0.9;
                    infinityTrailCol[segIdx + 1] = cg * 0.9;
                    infinityTrailCol[segIdx + 2] = cb * 0.9;
                    infinityTrailCol[segIdx + 3] = cr;
                    infinityTrailCol[segIdx + 4] = cg;
                    infinityTrailCol[segIdx + 5] = cb;

                    // Store current as prev for next frame
                    infinityPrevPos[pIdx] = px;
                    infinityPrevPos[pIdx + 1] = py;
                    infinityPrevPos[pIdx + 2] = pz;
                }

                // Hide unused segments
                for (let i = trailCount; i < Math.min(INFINITY_COMET_TRAIL_MAX_PARTICLES, COUNT); i++) {
                    const segIdx = i * 6;
                    infinityTrailPos[segIdx] = 0;
                    infinityTrailPos[segIdx + 1] = 0;
                    infinityTrailPos[segIdx + 2] = 0;
                    infinityTrailPos[segIdx + 3] = 0;
                    infinityTrailPos[segIdx + 4] = 0;
                    infinityTrailPos[segIdx + 5] = 0;

                    infinityTrailCol[segIdx] = 0;
                    infinityTrailCol[segIdx + 1] = 0;
                    infinityTrailCol[segIdx + 2] = 0;
                    infinityTrailCol[segIdx + 3] = 0;
                    infinityTrailCol[segIdx + 4] = 0;
                    infinityTrailCol[segIdx + 5] = 0;
                }

                infinityTrailGeom.attributes.position.needsUpdate = true;
                infinityTrailGeom.attributes.color.needsUpdate = true;
            } else if (infinityTrailLine) {
                infinityTrailLine.visible = false;
            }
            
            particles.rotation.y += GOJO_PAN_ROT_Y;
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
            } else if (currentTechnique === 2) { // Red - outward spiral
                particles.rotation.z += 0.1 * GOJO_ROT_SCALE;
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
        
        // Reset all Infinity particles to invisible/center (starts empty)
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

        // Reset comet trail history so first streaks don't jump
        if (INFINITY_COMET_TRAILS_ENABLED && infinityPrevPos) {
            for (let i = 0; i < infinityPrevPos.length; i++) infinityPrevPos[i] = 0;
        }
        if (infinityTrailLine) infinityTrailLine.visible = false;
    }
    
    // Update technique name display
    const nameEl = document.getElementById('gojoTechniqueName');
    if (nameEl) {
        const names = [
            'Limitless: Infinity',
            'Cursed Technique Lapse: Blue',
            'Cursed Technique Reversal: Red',
            'Hollow Technique: Purple',
            'Domain Expansion: Unlimited Void'
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
            // Slightly larger points so trails read better (still keeping the same look)
            const sizes = [0.18, 0.24, 0.24, 0.3, 0.12];
            particles.material.size = sizes[index];
            scene.background = null; // Transparent for other techniques
        }
    }
    
    // Generate particle positions (for non-Infinity techniques)
    if (index !== 0) {
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
