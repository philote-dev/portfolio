// Valentine's Page - Particle-based Heart to Letters Animation
let valentineAnimating = false;
let valentineScene, valentineCamera, valentineRenderer;
let heartParticles = null;
let letterParticles = [];
let wordParticles = [];
let wordTextElements = []; // HTML text elements for words
let backgroundParticles = null;
let blossomParticles = [];
let streamParticles = null;
let streamTime = 0;
let animationPhase = 0; // 0: heart, 1: transitioning to letters, 2: letters, 3: zoomed into letter
let transitionProgress = 0;
let selectedLetterIndex = -1;
let zoomedLetterIndex = -1;
let zoomProgress = 0;
let isZooming = false;
const LILAC_COLOR = 0xc8a2c8; // Lilac color
const PARTICLE_COUNT = 5000;
const HEART_PARTICLE_COUNT = 2000;
const LETTER_PARTICLE_COUNT = 800; // per letter
const BACKGROUND_PARTICLE_COUNT = 3000;
const BLOSSOM_COUNT = 40; // Number of sphere blossoms
const STREAM_PARTICLE_COUNT = 2000; // White particle streams

const LETTERS = ['L', 'I', 'L', 'A', 'C'];
const LETTER_WORDS = {
    'L': 'Lovely',
    'I': 'Intelligent',
    'A': 'Amazing',
    'C': 'Creature'
};

// Heart shape parametric equations
function getHeartPoint(t, scale = 1) {
    const x = 16 * Math.pow(Math.sin(t), 3) * scale;
    const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale; // Flipped Y
    return { x, y };
}

// Initialize valentine visualization
function initValentineWhenReady() {
    if (valentineAnimating) return;
    if (!window.THREE) {
        setTimeout(initValentineWhenReady, 100);
        return;
    }
    valentineAnimating = true;
    initValentine();
}

function initValentine() {
    const canvas = document.getElementById('valentineCanvas');
    if (!canvas) return;
    
    const THREE = window.THREE;
    
    // Scene setup
    valentineScene = new THREE.Scene();
    valentineScene.background = new THREE.Color(0x1a1a2e); // Dark purple background
    
    valentineCamera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    valentineCamera.position.z = 50;
    valentineCamera.position.y = 5;
    
    valentineRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    valentineRenderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    valentineRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    valentineScene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(LILAC_COLOR, 1, 100);
    pointLight.position.set(0, 0, 30);
    valentineScene.add(pointLight);
    
    // Create particle heart
    createParticleHeart();
    
    // Create background particles (blossoms and streams)
    createBackgroundParticles();
    createBlossoms();
    createStreamParticles();
    
    // Create letter particles (initially hidden)
    createLetterParticles();
    
    // Add click handler to canvas
    canvas.addEventListener('click', onCanvasClick);
    
    // Start animation
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (!valentineRenderer) return;
        const canvas = document.getElementById('valentineCanvas');
        if (!canvas) return;
        valentineCamera.aspect = canvas.offsetWidth / canvas.offsetHeight;
        valentineCamera.updateProjectionMatrix();
        valentineRenderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    });
}

function createParticleHeart() {
    const THREE = window.THREE;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(HEART_PARTICLE_COUNT * 3);
    const colors = new Float32Array(HEART_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(HEART_PARTICLE_COUNT);
    
    // Fill 3D heart volume with particles (not just outline)
    // Use layered approach: sample heart curve and add depth
    for (let i = 0; i < HEART_PARTICLE_COUNT; i++) {
        // Sample along heart curve
        const t = (i / HEART_PARTICLE_COUNT) * Math.PI * 2;
        const { x: heartX, y: heartY } = getHeartPoint(t, 0.6);
        
        // Add radial variation to fill the volume
        const radialOffset = (Math.random() - 0.5) * 0.8;
        const angle = Math.atan2(heartY, heartX);
        const x = heartX + Math.cos(angle) * radialOffset;
        const y = heartY + Math.sin(angle) * radialOffset;
        
        // Add depth (Z variation) for 3D volume
        const z = (Math.random() - 0.5) * 3;
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Lilac color with variation
        const r = 0.78 + (Math.random() - 0.5) * 0.1;
        const g = 0.64 + (Math.random() - 0.5) * 0.1;
        const b = 0.78 + (Math.random() - 0.5) * 0.1;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        
        sizes[i] = 0.08 + Math.random() * 0.05; // Tiny particles
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.5, // Tiny particles
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    
    heartParticles = new THREE.Points(geometry, material);
    valentineScene.add(heartParticles);
}

function createBackgroundParticles() {
    const THREE = window.THREE;
    
    // Simplified background - just keep it minimal
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(BACKGROUND_PARTICLE_COUNT * 3);
    const colors = new Float32Array(BACKGROUND_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(BACKGROUND_PARTICLE_COUNT);
    
    // Scatter particles across the background (away from center)
    for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
        // Bias particles toward borders (further from center)
        const angle = Math.random() * Math.PI * 2;
        // Use a distribution that favors outer edges
        const distFactor = 0.5 + Math.random() * 0.5; // 0.5 to 1.0, favoring outer
        const distance = 30 + distFactor * 50; // Start 30-80 units from center
        
        positions[i * 3] = Math.cos(angle) * distance;
        positions[i * 3 + 1] = Math.sin(angle) * distance;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        
        // Soft pink/lilac colors
        const r = 0.75 + (Math.random() - 0.5) * 0.15;
        const g = 0.60 + (Math.random() - 0.5) * 0.15;
        const b = 0.75 + (Math.random() - 0.5) * 0.15;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        
        sizes[i] = 0.03 + Math.random() * 0.05; // Smaller, finer particles
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.2, // Smaller, finer particles
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    backgroundParticles = new THREE.Points(geometry, material);
    valentineScene.add(backgroundParticles);
}

function createBlossoms() {
    const THREE = window.THREE;
    
    // Create sphere blossom shapes (like flower spheres)
    for (let i = 0; i < BLOSSOM_COUNT; i++) {
        const particlesPerBlossom = 80 + Math.floor(Math.random() * 40);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particlesPerBlossom * 3);
        const colors = new Float32Array(particlesPerBlossom * 3);
        const sizes = new Float32Array(particlesPerBlossom);
        
        // Random position (away from center)
        const centerX = (Math.random() - 0.5) * 100;
        const centerY = (Math.random() - 0.5) * 80;
        const centerZ = (Math.random() - 0.5) * 40;
        const radius = 1.5 + Math.random() * 1.5;
        
        // Create sphere blossom (particles on sphere surface with petal-like clustering)
        for (let p = 0; p < particlesPerBlossom; p++) {
            // Spherical coordinates with petal clustering
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Add petal-like variation
            const petalFactor = 1 + Math.sin(theta * 5) * 0.2;
            const r = radius * petalFactor;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            positions[p * 3] = centerX + x;
            positions[p * 3 + 1] = centerY + y;
            positions[p * 3 + 2] = centerZ + z;
            
            // Soft pink/lilac colors
            const r_color = 0.75 + (Math.random() - 0.5) * 0.2;
            const g_color = 0.60 + (Math.random() - 0.5) * 0.2;
            const b_color = 0.75 + (Math.random() - 0.5) * 0.2;
            colors[p * 3] = r_color;
            colors[p * 3 + 1] = g_color;
            colors[p * 3 + 2] = b_color;
            
            sizes[p] = 0.08 + Math.random() * 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const blossom = new THREE.Points(geometry, material);
        blossom.userData.centerX = centerX;
        blossom.userData.centerY = centerY;
        blossom.userData.centerZ = centerZ;
        blossom.userData.rotationSpeed = 0.2 + Math.random() * 0.3;
        blossom.userData.rotationAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        valentineScene.add(blossom);
        blossomParticles.push(blossom);
    }
}

function createStreamParticles() {
    const THREE = window.THREE;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STREAM_PARTICLE_COUNT * 3);
    const colors = new Float32Array(STREAM_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(STREAM_PARTICLE_COUNT);
    
    // Create flowing white particle streams
    const numStreams = 8;
    const particlesPerStream = Math.floor(STREAM_PARTICLE_COUNT / numStreams);
    
    for (let streamIdx = 0; streamIdx < numStreams; streamIdx++) {
        // Random stream origin and direction
        const originX = (Math.random() - 0.5) * 120;
        const originY = (Math.random() - 0.5) * 100;
        const originZ = (Math.random() - 0.5) * 50;
        
        const dirX = (Math.random() - 0.5) * 0.5;
        const dirY = (Math.random() - 0.5) * 0.5;
        const dirZ = (Math.random() - 0.5) * 0.3;
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        const normalizedDirX = dirX / dirLength;
        const normalizedDirY = dirY / dirLength;
        const normalizedDirZ = dirZ / dirLength;
        
        const streamLength = 30 + Math.random() * 40;
        
        for (let p = 0; p < particlesPerStream; p++) {
            const particleIdx = streamIdx * particlesPerStream + p;
            if (particleIdx >= STREAM_PARTICLE_COUNT) break;
            
            // Position along stream with some spread
            const t = (p / particlesPerStream) * streamLength;
            const spread = (Math.random() - 0.5) * 2;
            
            positions[particleIdx * 3] = originX + normalizedDirX * t + (Math.random() - 0.5) * spread;
            positions[particleIdx * 3 + 1] = originY + normalizedDirY * t + (Math.random() - 0.5) * spread;
            positions[particleIdx * 3 + 2] = originZ + normalizedDirZ * t + (Math.random() - 0.5) * spread;
            
            // White color with slight variation
            const brightness = 0.8 + Math.random() * 0.2;
            colors[particleIdx * 3] = brightness;
            colors[particleIdx * 3 + 1] = brightness;
            colors[particleIdx * 3 + 2] = brightness;
            
            sizes[particleIdx] = 0.1 + Math.random() * 0.15;
        }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    streamParticles = new THREE.Points(geometry, material);
    streamParticles.userData.originalPositions = positions.slice();
    valentineScene.add(streamParticles);
}

function createLetterParticles() {
    const THREE = window.THREE;
    
    LETTERS.forEach((letter, letterIndex) => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(LETTER_PARTICLE_COUNT * 3);
        const colors = new Float32Array(LETTER_PARTICLE_COUNT * 3);
        const sizes = new Float32Array(LETTER_PARTICLE_COUNT);
        
        // Create letter shape with particles - make them more defined
        const letterPoints = getLetterPoints(letter);
        
        // Increase particle density for clearer letters
        const particlesPerPoint = Math.max(1, Math.floor(LETTER_PARTICLE_COUNT / letterPoints.length));
        
        let particleIdx = 0;
        for (let pointIdx = 0; pointIdx < letterPoints.length && particleIdx < LETTER_PARTICLE_COUNT; pointIdx++) {
            const point = letterPoints[pointIdx];
            
            // Create multiple particles per point for density
            for (let p = 0; p < particlesPerPoint && particleIdx < LETTER_PARTICLE_COUNT; p++) {
                // Much smaller randomness for tighter letter definition
                const offsetX = (Math.random() - 0.5) * 0.15;
                const offsetY = (Math.random() - 0.5) * 0.15;
                const offsetZ = (Math.random() - 0.5) * 0.1;
                
                const baseX = (letterIndex - 2) * 12; // Space letters
                positions[particleIdx * 3] = baseX + point.x + offsetX;
                positions[particleIdx * 3 + 1] = point.y + offsetY;
                positions[particleIdx * 3 + 2] = offsetZ;
                
                // Lilac color
                const r = 0.78 + (Math.random() - 0.5) * 0.1;
                const g = 0.64 + (Math.random() - 0.5) * 0.1;
                const b = 0.78 + (Math.random() - 0.5) * 0.1;
                colors[particleIdx * 3] = r;
                colors[particleIdx * 3 + 1] = g;
                colors[particleIdx * 3 + 2] = b;
                
                sizes[particleIdx] = 0.08 + Math.random() * 0.05; // Tiny letter particles
                particleIdx++;
            }
        }
        
        // Fill any remaining particles
        for (let i = particleIdx; i < LETTER_PARTICLE_COUNT; i++) {
            const point = letterPoints[Math.floor(Math.random() * letterPoints.length)];
            const offsetX = (Math.random() - 0.5) * 0.15;
            const offsetY = (Math.random() - 0.5) * 0.15;
            const offsetZ = (Math.random() - 0.5) * 0.1;
            
            const baseX = (letterIndex - 2) * 12;
            positions[i * 3] = baseX + point.x + offsetX;
            positions[i * 3 + 1] = point.y + offsetY;
            positions[i * 3 + 2] = offsetZ;
            
            const r = 0.78 + (Math.random() - 0.5) * 0.1;
            const g = 0.64 + (Math.random() - 0.5) * 0.1;
            const b = 0.78 + (Math.random() - 0.5) * 0.1;
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
            
            sizes[i] = 0.08 + Math.random() * 0.05;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
    const material = new THREE.PointsMaterial({
        size: 0.6, // Slightly larger for better visibility
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });
        
        const letterParticle = new THREE.Points(geometry, material);
        letterParticle.userData.letter = letter;
        letterParticle.userData.letterIndex = letterIndex;
        letterParticle.userData.targetOpacity = 0;
        letterParticle.userData.originalPositions = positions.slice();
        valentineScene.add(letterParticle);
        letterParticles.push(letterParticle);
    });
}

function getLetterPoints(letter) {
    const points = [];
    const width = 4;
    const height = 6;
    const step = 0.05; // Smaller step for more defined letters
    
    if (letter === 'L') {
        // Vertical line
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Horizontal line
        for (let x = -width/2; x <= width/2; x += step) {
            points.push({ x, y: -height/2 });
        }
    } else if (letter === 'I') {
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: 0, y });
        }
    } else if (letter === 'A') {
        // Left diagonal (from bottom left to top)
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: -width/2 + t * width/2, y: -height/2 + t * height });
        }
        // Right diagonal (from bottom right to top)
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: width/2 - t * width/2, y: -height/2 + t * height });
        }
        // Crossbar (horizontal line in middle)
        for (let x = -width/3; x <= width/3; x += step) {
            points.push({ x, y: 0 });
        }
    } else if (letter === 'C') {
        // C shape (arc)
        for (let angle = Math.PI * 0.3; angle <= Math.PI * 1.7; angle += step) {
            const radius = height / 2;
            points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
    } else if (letter === 'O') {
        // O shape (circle)
        for (let angle = 0; angle <= Math.PI * 2; angle += step) {
            const radius = height / 2;
            points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
    } else if (letter === 'V') {
        // V shape
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: -width/2 + t * width, y: height/2 - t * height });
        }
    } else if (letter === 'E') {
        // E shape
        // Vertical line
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Top horizontal
        for (let x = -width/2; x <= width/2; x += step) {
            points.push({ x, y: height/2 });
        }
        // Middle horizontal
        for (let x = -width/2; x <= width/2 * 0.7; x += step) {
            points.push({ x, y: 0 });
        }
        // Bottom horizontal
        for (let x = -width/2; x <= width/2; x += step) {
            points.push({ x, y: -height/2 });
        }
    } else if (letter === 'Y') {
        // Y shape
        // Top V
        for (let t = 0; t <= 0.5; t += step) {
            points.push({ x: -width/2 + t * width, y: height/2 - t * height });
        }
        for (let t = 0.5; t <= 1; t += step) {
            points.push({ x: width/2 - (t - 0.5) * width, y: height/2 - t * height });
        }
        // Bottom vertical
        for (let y = 0; y >= -height/2; y -= step) {
            points.push({ x: 0, y });
        }
    } else if (letter === 'N') {
        // N shape
        // Left vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Right vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: width/2, y });
        }
        // Diagonal
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: -width/2 + t * width, y: height/2 - t * height });
        }
    } else if (letter === 'T') {
        // T shape
        // Top horizontal
        for (let x = -width/2; x <= width/2; x += step) {
            points.push({ x, y: height/2 });
        }
        // Vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: 0, y });
        }
    } else if (letter === 'G') {
        // G shape (like C but with a line)
        for (let angle = Math.PI * 0.3; angle <= Math.PI * 1.7; angle += step) {
            const radius = height / 2;
            points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
        // Add horizontal line
        for (let x = 0; x <= width/2; x += step) {
            points.push({ x, y: 0 });
        }
    } else if (letter === 'U') {
        // U shape
        // Left vertical
        for (let y = height/2; y >= -height/2; y -= step) {
            points.push({ x: -width/2, y });
        }
        // Bottom curve
        for (let x = -width/2; x <= width/2; x += step) {
            const y = -height/2 + Math.sqrt(1 - Math.pow((x / (width/2)), 2)) * (height/4);
            points.push({ x, y: -height/2 + (height/4) });
        }
        // Right vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: width/2, y });
        }
    } else if (letter === 'M') {
        // M shape
        // Left vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Right vertical
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: width/2, y });
        }
        // Left diagonal
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: -width/2 + t * width/2, y: height/2 - t * height/2 });
        }
        // Right diagonal
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: t * width/2, y: height/2 - t * height/2 });
        }
    } else if (letter === 'S') {
        // S shape
        // Top curve
        for (let angle = Math.PI * 0.2; angle <= Math.PI; angle += step) {
            const radius = height / 4;
            points.push({ x: Math.cos(angle) * radius, y: height/4 + Math.sin(angle) * radius });
        }
        // Middle line
        for (let x = -width/3; x <= width/3; x += step) {
            points.push({ x, y: 0 });
        }
        // Bottom curve
        for (let angle = 0; angle <= Math.PI * 0.8; angle += step) {
            const radius = height / 4;
            points.push({ x: Math.cos(angle) * radius, y: -height/4 - Math.sin(angle) * radius });
        }
    } else if (letter === 'P') {
        // P shape
        // Vertical line
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Top curve
        for (let angle = Math.PI / 2; angle <= Math.PI * 1.5; angle += step) {
            const radius = height / 4;
            points.push({ x: Math.cos(angle) * radius, y: height/4 + Math.sin(angle) * radius });
        }
        // Middle horizontal
        for (let x = -width/2; x <= 0; x += step) {
            points.push({ x, y: 0 });
        }
    } else if (letter === 'R') {
        // R shape (like P with diagonal)
        // Vertical line
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
        }
        // Top curve
        for (let angle = Math.PI / 2; angle <= Math.PI * 1.5; angle += step) {
            const radius = height / 4;
            points.push({ x: Math.cos(angle) * radius, y: height/4 + Math.sin(angle) * radius });
        }
        // Middle horizontal
        for (let x = -width/2; x <= 0; x += step) {
            points.push({ x, y: 0 });
        }
        // Diagonal
        for (let t = 0; t <= 1; t += step) {
            points.push({ x: t * width/2, y: -t * height/2 });
        }
    } else {
        // Default: simple box for unknown letters
        for (let x = -width/2; x <= width/2; x += step) {
            points.push({ x, y: -height/2 });
            points.push({ x, y: height/2 });
        }
        for (let y = -height/2; y <= height/2; y += step) {
            points.push({ x: -width/2, y });
            points.push({ x: width/2, y });
        }
    }
    
    return points;
}

function createWordText(letterIndex, word) {
    const THREE = window.THREE;
    
    // Remove existing word text for this letter
    const existing = wordTextElements.find(e => e.userData.letterIndex === letterIndex);
    if (existing) {
        existing.remove();
        wordTextElements = wordTextElements.filter(e => e.userData.letterIndex !== letterIndex);
    }
    
    // Create HTML text element for the word
    const canvas = document.getElementById('valentineCanvas');
    const container = canvas.parentElement;
    
    const wordDiv = document.createElement('div');
    wordDiv.className = 'valentine-word-text';
    wordDiv.textContent = word;
    wordDiv.style.opacity = '0';
    wordDiv.style.transition = 'opacity 0.5s ease-in-out';
    
    // Position under the letter using 3D to screen projection
    const baseX = (letterIndex - 2) * 12;
    const baseY = -10; // Below the letters
    const baseZ = 0;
    
    const updatePosition = function() {
        const THREE = window.THREE;
        if (!THREE || !valentineCamera) return;
        
        const vector = new THREE.Vector3(baseX, baseY, baseZ);
        vector.project(valentineCamera);
        
        const canvasRect = canvas.getBoundingClientRect();
        const x = (vector.x * 0.5 + 0.5) * canvasRect.width;
        const y = (vector.y * -0.5 + 0.5) * canvasRect.height;
        
        wordDiv.style.left = `${x}px`;
        wordDiv.style.top = `${y}px`;
    };
    
    updatePosition();
    container.appendChild(wordDiv);
    
    wordDiv.userData.letterIndex = letterIndex;
    wordDiv.userData.updatePosition = updatePosition;
    wordTextElements.push(wordDiv);
    
    return wordDiv;
}

function animate() {
    if (!valentineAnimating) return;
    
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Animate background particles (independent of heart) - move away from center, crowd borders
    if (backgroundParticles) {
        const positions = backgroundParticles.geometry.attributes.position.array;
        // Only start moving away after heart dissolves (animationPhase >= 2)
        const shouldMoveAway = animationPhase >= 2;
        
        for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            
            // Calculate distance from center
            const dist = Math.sqrt(x * x + y * y);
            
            if (shouldMoveAway) {
                // Move particles away from center more aggressively
                if (dist > 0.1) {
                    const dirX = x / dist;
                    const dirY = y / dist;
                    const moveSpeed = 0.05; // Faster movement
                    positions[i * 3] += dirX * moveSpeed;
                    positions[i * 3 + 1] += dirY * moveSpeed;
                }
                
                // Push particles toward borders if they're too close to center
                if (dist < 30) {
                    const dirX = x / (dist + 0.1);
                    const dirY = y / (dist + 0.1);
                    const pushSpeed = 0.08;
                    positions[i * 3] += dirX * pushSpeed;
                    positions[i * 3 + 1] += dirY * pushSpeed;
                }
            }
            
            // Gentle vertical float
            positions[i * 3 + 1] += Math.sin(time + i) * 0.01;
        }
        backgroundParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animate blossoms (gentle rotation, float, and move away from center)
    blossomParticles.forEach(blossom => {
        blossom.rotation.x += blossom.userData.rotationSpeed * 0.001;
        blossom.rotation.y += blossom.userData.rotationSpeed * 0.0015;
        blossom.position.y += Math.sin(time + blossom.userData.centerX) * 0.02;
        
        // Move away from center
        const dist = Math.sqrt(
            blossom.position.x * blossom.position.x + 
            blossom.position.y * blossom.position.y
        );
        if (dist > 0.1) {
            const dirX = blossom.position.x / dist;
            const dirY = blossom.position.y / dist;
            const moveSpeed = 0.015;
            blossom.position.x += dirX * moveSpeed;
            blossom.position.y += dirY * moveSpeed;
        }
    });
    
    // Animate stream particles (flowing motion)
    if (streamParticles) {
        streamTime += 0.01;
        const positions = streamParticles.geometry.attributes.position.array;
        const originalPos = streamParticles.userData.originalPositions;
        
        for (let i = 0; i < STREAM_PARTICLE_COUNT; i++) {
            // Flow particles along their stream direction
            const streamIdx = Math.floor(i / (STREAM_PARTICLE_COUNT / 8));
            const flowSpeed = 0.3;
            
            // Get original position
            const origX = originalPos[i * 3];
            const origY = originalPos[i * 3 + 1];
            const origZ = originalPos[i * 3 + 2];
            
            // Calculate direction (normalized) - use next particle in stream
            const particlesPerStream = Math.floor(STREAM_PARTICLE_COUNT / 8);
            const nextParticleIdx = Math.min(i + 1, (streamIdx + 1) * particlesPerStream - 1);
            const nextX = originalPos[nextParticleIdx * 3];
            const nextY = originalPos[nextParticleIdx * 3 + 1];
            const nextZ = originalPos[nextParticleIdx * 3 + 2];
            
            const dirX = nextX - origX;
            const dirY = nextY - origY;
            const dirZ = nextZ - origZ;
            const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
            
            if (dirLen > 0.01) {
                const normalizedDirX = dirX / dirLen;
                const normalizedDirY = dirY / dirLen;
                const normalizedDirZ = dirZ / dirLen;
                
                // Flow along direction with looping
                const flowOffset = (streamTime * flowSpeed + streamIdx * 10) % 50;
                positions[i * 3] = origX + normalizedDirX * flowOffset;
                positions[i * 3 + 1] = origY + normalizedDirY * flowOffset;
                positions[i * 3 + 2] = origZ + normalizedDirZ * flowOffset;
            } else {
                // Fallback: use original position
                positions[i * 3] = origX;
                positions[i * 3 + 1] = origY;
                positions[i * 3 + 2] = origZ;
            }
        }
        streamParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    if (animationPhase === 0) {
        // Heart phase - gentle pulse and rotation (only heart rotates)
        if (heartParticles) {
            heartParticles.rotation.y += 0.005;
            const scale = 1 + Math.sin(time * 2) * 0.05;
            heartParticles.scale.set(scale, scale, scale);
        }
    } else if (animationPhase === 1) {
        // Transition phase - heart dissolves into letters
        transitionProgress += 0.015;
        
        if (heartParticles) {
            // Fade out heart
            heartParticles.material.opacity = Math.max(0, 1 - transitionProgress * 2);
            
            // Scatter heart particles
            const positions = heartParticles.geometry.attributes.position.array;
            const letterTargets = [];
            LETTERS.forEach((_, idx) => {
                letterTargets.push({ x: (idx - 2) * 12, y: 0, z: 0 });
            });
            
            for (let i = 0; i < HEART_PARTICLE_COUNT; i++) {
                const targetIdx = Math.floor((i / HEART_PARTICLE_COUNT) * LETTERS.length);
                const target = letterTargets[targetIdx];
                const currentX = positions[i * 3];
                const currentY = positions[i * 3 + 1];
                const currentZ = positions[i * 3 + 2];
                
                positions[i * 3] += (target.x - currentX) * 0.05;
                positions[i * 3 + 1] += (target.y - currentY) * 0.05;
                positions[i * 3 + 2] += (target.z - currentZ) * 0.05;
            }
            heartParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Fade in letters
        letterParticles.forEach((particle, index) => {
            const delay = index * 0.15;
            const letterProgress = Math.max(0, Math.min(1, (transitionProgress - delay) * 3));
            particle.material.opacity = letterProgress;
        });
        
        if (transitionProgress >= 1) {
            animationPhase = 2;
            if (heartParticles) {
                valentineScene.remove(heartParticles);
                heartParticles = null;
            }
            // Automatically show letter buttons when transition completes
            setTimeout(() => {
                startLetterExpansions();
            }, 500);
        }
    } else if (animationPhase === 2) {
        // Letters phase - letters float gently
        letterParticles.forEach((particle, index) => {
            particle.rotation.y = Math.sin(time + index) * 0.05;
            particle.position.y = Math.sin(time * 0.5 + index) * 0.3;
        });
    }
    
    // Update word text positions (project 3D to screen)
    wordTextElements.forEach(element => {
        if (element.userData.updatePosition) {
            element.userData.updatePosition();
        }
    });
    
    valentineRenderer.render(valentineScene, valentineCamera);
}

function onCanvasClick(event) {
    if (animationPhase === 0) {
        // Click on heart - start transition (same as clicking "Click me" button)
        startHeartToLettersTransition();
    } else if (animationPhase === 2) {
        // Click on letters - expand to word
        const canvas = document.getElementById('valentineCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const THREE = window.THREE;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), valentineCamera);
        
        // Check which letter was clicked
        let clicked = false;
        letterParticles.forEach((particle, index) => {
            if (particle.material.opacity > 0.5) {
                const intersects = raycaster.intersectObject(particle);
                if (intersects.length > 0) {
                    expandLetterToWord(index);
                    clicked = true;
                }
            }
        });
        
        // If no letter clicked, try clicking based on screen position
        if (!clicked) {
            // Approximate letter positions based on screen coordinates
            const centerX = rect.width / 2;
            const letterWidth = rect.width / 5; // Approximate width per letter
            const clickedIndex = Math.floor((event.clientX - (centerX - letterWidth * 2)) / letterWidth);
            
            if (clickedIndex >= 0 && clickedIndex < LETTERS.length) {
                expandLetterToWord(clickedIndex);
            }
        }
    }
}

function startHeartToLettersTransition() {
    if (animationPhase === 0) {
        animationPhase = 1;
        transitionProgress = 0;
    }
}

// Handle expand button click - triggers transition if needed, then shows letters
function handleValentineExpand() {
    // If still in heart phase, start the transition
    if (animationPhase === 0) {
        startHeartToLettersTransition();
    }
    // If transition is complete, show letter buttons
    if (animationPhase === 2) {
        startLetterExpansions();
    }
}

function startSequentialWordAnimations() {
    // This is now handled by the expand button
    // Keep for backwards compatibility but don't auto-start
}

function startLetterExpansions() {
    // Hide expand button permanently and show letter buttons
    const expandBtn = document.getElementById('valentineExpandBtn');
    if (expandBtn) {
        expandBtn.style.opacity = '0';
        expandBtn.style.pointerEvents = 'none';
        expandBtn.style.display = 'none'; // Completely hide it
    }
    
    // Create letter buttons (don't auto-zoom)
    createLetterButtons();
}

function createLetterButtons() {
    const container = document.getElementById('valentineLetterButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    LETTERS.forEach((letter, index) => {
        const btn = document.createElement('button');
        btn.className = 'valentine-letter-btn';
        btn.textContent = letter;
        btn.onclick = () => zoomIntoLetter(index);
        container.appendChild(btn);
    });
}

function zoomIntoLetter(letterIndex) {
    if (isZooming) return;
    
    isZooming = true;
    zoomedLetterIndex = letterIndex;
    zoomProgress = 0;
    
    const letter = LETTERS[letterIndex];
    let word;
    if (letterIndex === 2 && letter === 'L') {
        word = 'Linda';
    } else {
        word = LETTER_WORDS[letter] || letter;
    }
    
    // Show zoom view
    const zoomView = document.getElementById('valentineZoomView');
    const zoomWord = document.getElementById('valentineZoomWord');
    
    if (zoomView && zoomWord) {
        zoomWord.textContent = word;
        zoomView.classList.add('active');
        
        // Animate camera zoom into letter
        animateZoomIn(letterIndex, () => {
            isZooming = false;
        });
    }
}

function exitZoom() {
    if (isZooming) return;
    
    isZooming = true;
    const zoomView = document.getElementById('valentineZoomView');
    
    if (zoomView) {
        zoomView.classList.remove('active');
        animateZoomOut(() => {
            isZooming = false;
            zoomedLetterIndex = -1;
        });
    }
}

function navigateLetter(direction) {
    if (isZooming) return;
    
    let newIndex = zoomedLetterIndex + direction;
    if (newIndex < 0) newIndex = LETTERS.length - 1;
    if (newIndex >= LETTERS.length) newIndex = 0;
    
    zoomIntoLetter(newIndex);
}

function animateZoomIn(letterIndex, callback) {
    const targetX = (letterIndex - 2) * 12;
    const targetY = 0;
    const targetZ = 20; // Zoom in closer
    
    const startX = valentineCamera.position.x;
    const startY = valentineCamera.position.y;
    const startZ = valentineCamera.position.z;
    
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        valentineCamera.position.x = startX + (targetX - startX) * eased;
        valentineCamera.position.y = startY + (targetY - startY) * eased;
        valentineCamera.position.z = startZ + (targetZ - startZ) * eased;
        valentineCamera.lookAt(targetX, targetY, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (callback) callback();
        }
    }
    
    animate();
}

function animateZoomOut(callback) {
    const targetX = 0;
    const targetY = 5;
    const targetZ = 50; // Back to original position
    
    const startX = valentineCamera.position.x;
    const startY = valentineCamera.position.y;
    const startZ = valentineCamera.position.z;
    
    const duration = 800;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        
        valentineCamera.position.x = startX + (targetX - startX) * eased;
        valentineCamera.position.y = startY + (targetY - startY) * eased;
        valentineCamera.position.z = startZ + (targetZ - startZ) * eased;
        valentineCamera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (callback) callback();
        }
    }
    
    animate();
}

// Make functions globally accessible
window.startLetterExpansions = startLetterExpansions;
window.handleValentineExpand = handleValentineExpand;
window.zoomIntoLetter = zoomIntoLetter;
window.exitZoom = exitZoom;

function expandLetterToWord(letterIndex) {
    if (selectedLetterIndex === letterIndex) {
        // Already selected - collapse
        const wordText = wordTextElements.find(e => e.userData.letterIndex === letterIndex);
        if (wordText) {
            wordText.style.opacity = '0';
        }
        selectedLetterIndex = -1;
    } else {
        // Expand new letter
        selectedLetterIndex = letterIndex;
        const letter = LETTERS[letterIndex];
        // Handle the second 'L' for "Linda"
        let word;
        if (letterIndex === 2 && letter === 'L') {
            word = 'Linda';
        } else {
            word = LETTER_WORDS[letter] || letter;
        }
        
        // Hide other words
        wordTextElements.forEach(e => {
            if (e.userData.letterIndex !== letterIndex) {
                e.style.opacity = '0';
            }
        });
        
        // Create or show word
        let wordText = wordTextElements.find(e => e.userData.letterIndex === letterIndex);
        if (!wordText) {
            wordText = createWordText(letterIndex, word);
        }
        wordText.style.opacity = '1';
    }
}

// Activate valentine page
window.activateValentine = function() {
    // Switch to valentine visualization
    const valentineCanvas = document.getElementById('valentineCanvas');
    const valentinePanel = document.querySelector('.viz-panel[data-viz="valentine"]');
    const currentCanvas = document.querySelector('.viz-canvas.active');
    const currentPanel = document.querySelector('.viz-panel.active');
    
    if (currentCanvas) currentCanvas.classList.remove('active');
    if (currentPanel) currentPanel.classList.remove('active');
    
    if (valentineCanvas) valentineCanvas.classList.add('active');
    if (valentinePanel) valentinePanel.classList.add('active');
    
    // Reset animation state
    animationPhase = 0;
    transitionProgress = 0;
    selectedLetterIndex = -1;
    
    // Recreate heart if needed
    if (!heartParticles && valentineScene) {
        createParticleHeart();
    }
    
    // Reset letters
    letterParticles.forEach(particle => {
        particle.material.opacity = 0;
    });
    
    // Hide word particles
    wordParticles.forEach(particle => {
        particle.userData.targetOpacity = 0;
        particle.material.opacity = 0;
    });
    
    // Initialize if not already
    if (!valentineAnimating) {
        initValentineWhenReady();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.THREE) {
            initValentineWhenReady();
        } else {
            setTimeout(initValentineWhenReady, 500);
        }
    });
} else {
    if (window.THREE) {
        initValentineWhenReady();
    } else {
        setTimeout(initValentineWhenReady, 500);
    }
}
