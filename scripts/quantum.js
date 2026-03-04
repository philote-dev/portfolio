// PHYSICS-ACCURATE BLOCH SPHERE SIMULATOR (IMPROVED VERSION)
// A proper 3D visualization of quantum state on the Bloch sphere

window.quantumAnimating = false;
window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };

// Normalize quantum state to ensure |α|² + |β|² = 1
function normalizeState(state) {
    const norm = Math.sqrt(
        state.real0 ** 2 + state.imag0 ** 2 + 
        state.real1 ** 2 + state.imag1 ** 2
    );
    if (norm > 0.0001) {
        return {
            real0: state.real0 / norm,
            imag0: state.imag0 / norm,
            real1: state.real1 / norm,
            imag1: state.imag1 / norm
        };
    }
    return { real0: 1, imag0: 0, real1: 0, imag1: 0 };
}

// Convert quantum state to Bloch sphere coordinates (θ, φ)
// |ψ⟩ = α|0⟩ + β|1⟩ where α and β are complex numbers
// On Bloch sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
function stateToBloch(state) {
    const normalized = normalizeState(state);
    
    // Magnitudes (amplitudes)
    const alphaMag = Math.sqrt(normalized.real0 ** 2 + normalized.imag0 ** 2);
    const betaMag = Math.sqrt(normalized.real1 ** 2 + normalized.imag1 ** 2);
    
    // Polar angle: θ = 2 * arccos(|α|)
    const theta = 2 * Math.acos(Math.min(1, Math.max(0, alphaMag)));
    
    // Azimuthal angle: φ = arg(β) - arg(α)
    const alphaArg = Math.atan2(normalized.imag0, normalized.real0);
    const betaArg = Math.atan2(normalized.imag1, normalized.real1);
    const phi = betaArg - alphaArg;
    
    // Convert to Cartesian coordinates on unit sphere
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    
    return { x, y, z, theta, phi, alphaMag, betaMag };
}

function initQuantum() {
    if (window.quantumAnimating) return;
    
    const canvas = document.getElementById('quantumCanvas');
    if (!canvas) return;
    
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded. Please wait for it to load.');
        setTimeout(initQuantum, 100);
        return;
    }
    
    window.quantumAnimating = true;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1e2e);
    
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    camera.position.set(0, 0, 4);
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x88c0d0, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    // Bloch Sphere (unit sphere)
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x2e3440,
        wireframe: true,
        wireframeLinewidth: 1,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    
    // Coordinate axes
    const axesHelper = new THREE.AxesHelper(1.2);
    scene.add(axesHelper);
    
    // Axis labels
    const createLabel = (text, position, color) => {
        const labelCanvas = document.createElement('canvas');
        const context = labelCanvas.getContext('2d');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        context.fillStyle = color || '#88c0d0';
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 32);
        const texture = new THREE.CanvasTexture(labelCanvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(0.3, 0.15, 1);
        return sprite;
    };
    
    scene.add(createLabel('|0⟩', new THREE.Vector3(0, 0, 1.3), '#88c0d0'));
    scene.add(createLabel('|1⟩', new THREE.Vector3(0, 0, -1.3), '#b48ead'));
    scene.add(createLabel('X', new THREE.Vector3(1.3, 0, 0), '#d08770'));
    scene.add(createLabel('Y', new THREE.Vector3(0, 1.3, 0), '#a3be8c'));
    
    // State vector (arrow pointing to state on sphere)
    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        1,
        0xff6b6b,
        0.1,
        0.05
    );
    scene.add(arrowHelper);
    
    // State point (marker on sphere)
    const pointGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const pointMaterial = new THREE.MeshPhongMaterial({
        color: 0xff6b6b,
        emissive: 0xff6b6b,
        emissiveIntensity: 0.5
    });
    const statePoint = new THREE.Mesh(pointGeometry, pointMaterial);
    scene.add(statePoint);
    
    // Fine gradient probability density visualization (like Gojo animations)
    const probabilityGeometry = new THREE.BufferGeometry();
    const probabilityParticles = 2000; // More particles for finer, cleaner look
    const probPositions = new Float32Array(probabilityParticles * 3);
    const probColors = new Float32Array(probabilityParticles * 3);
    
    // Initialize particles
    for (let i = 0; i < probabilityParticles; i++) {
        const idx = i * 3;
        probPositions[idx] = 0;
        probPositions[idx + 1] = 0;
        probPositions[idx + 2] = 0;
        probColors[idx] = 0.53;
        probColors[idx + 1] = 0.75;
        probColors[idx + 2] = 0.82;
    }
    
    probabilityGeometry.setAttribute('position', new THREE.BufferAttribute(probPositions, 3));
    probabilityGeometry.setAttribute('color', new THREE.BufferAttribute(probColors, 3));
    
    // Use PointsMaterial with smaller size for finer particles
    const probabilityMaterial = new THREE.PointsMaterial({
        size: 0.02, // Much smaller than before (was 0.08)
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    const probabilityCloud = new THREE.Points(probabilityGeometry, probabilityMaterial);
    scene.add(probabilityCloud);
    
    // Mouse controls for rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraRotation = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            cameraRotation.y += deltaX * 0.01;
            cameraRotation.x += deltaY * 0.01;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Zoom only when holding Shift key, otherwise allow page scrolling
    canvas.addEventListener('wheel', (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            // Hold Shift/Ctrl/Cmd to zoom the animation
            e.preventDefault();
            camera.position.z += e.deltaY * 0.01;
            camera.position.z = Math.max(2, Math.min(8, camera.position.z));
        }
        // Otherwise, let the scroll event bubble up for normal page scrolling
    });
    
    // Update visualization based on quantum state
    function updateVisualization() {
        const bloch = stateToBloch(window.quantumState);
        
        // Update state vector and point
        const stateVector = new THREE.Vector3(bloch.x, bloch.y, bloch.z);
        arrowHelper.setDirection(stateVector.normalize());
        arrowHelper.setLength(1, 0.1, 0.05);
        statePoint.position.copy(stateVector);
        
        // Update super fine gradient probability density
        const prob0 = bloch.alphaMag ** 2;
        const prob1 = bloch.betaMag ** 2;
        
        // Phase for color transition (pinkish for phase changes)
        const phase = bloch.phi;
        const phaseFactor = (Math.sin(phase) + 1) / 2; // 0 to 1 based on phase
        
        // Create fine, gradient distribution around poles based on probabilities
        // More particles, finer distribution like Gojo animations
        for (let i = 0; i < probabilityParticles; i++) {
            const idx = i * 3;
            let x, y, z;
            let brightness;
            
            // Distribute particles based on probabilities with smooth, fine transitions
            const rand = Math.random();
            if (rand < prob0) {
                // Particles near |0⟩ (north pole) - fine gradient distribution
                const theta = Math.random() * Math.random() * Math.random() * 0.4; // Very concentrated near pole
                const phi = Math.random() * Math.PI * 2;
                const radius = Math.random() * Math.random() * 0.3; // Tighter spread
                x = Math.sin(theta) * Math.cos(phi) * (1 + radius);
                y = Math.sin(theta) * Math.sin(phi) * (1 + radius);
                z = Math.cos(theta) * (1 + radius);
                brightness = prob0 * (1 - theta / 0.4) * (0.7 + Math.random() * 0.3); // Gradient fade
            } else {
                // Particles near |1⟩ (south pole) - fine gradient distribution
                const theta = Math.PI - Math.random() * Math.random() * Math.random() * 0.4;
                const phi = Math.random() * Math.PI * 2;
                const radius = Math.random() * Math.random() * 0.3;
                x = Math.sin(theta) * Math.cos(phi) * (1 + radius);
                y = Math.sin(theta) * Math.sin(phi) * (1 + radius);
                z = Math.cos(theta) * (1 + radius);
                brightness = prob1 * (1 - (Math.PI - theta) / 0.4) * (0.7 + Math.random() * 0.3);
            }
            
            // Normalize to unit sphere surface
            const length = Math.sqrt(x * x + y * y + z * z);
            if (length > 0) {
                x /= length;
                y /= length;
                z /= length;
            }
            
            probPositions[idx] = x;
            probPositions[idx + 1] = y;
            probPositions[idx + 2] = z;
            
            // Color transition: blue to pinkish based on phase
            // Blue: (0.53, 0.75, 0.82) -> Pink: (0.71, 0.44, 0.68) - b48ead
            const colorIntensity = Math.max(0.6, brightness); // Increased minimum for visibility
            const blueR = 0.53;
            const blueG = 0.75;
            const blueB = 0.82;
            const pinkR = 0.71; // b48ead
            const pinkG = 0.44;
            const pinkB = 0.68;
            
            // Interpolate between blue and pink based on phase
            probColors[idx] = (blueR + (pinkR - blueR) * phaseFactor) * colorIntensity;
            probColors[idx + 1] = (blueG + (pinkG - blueG) * phaseFactor) * colorIntensity;
            probColors[idx + 2] = (blueB + (pinkB - blueB) * phaseFactor) * colorIntensity;
        }
        
        probabilityGeometry.attributes.position.needsUpdate = true;
        probabilityGeometry.attributes.color.needsUpdate = true;
    }
    
    // Animation loop
    function animate() {
	requestAnimationFrame(animate);
        
        // Smooth camera rotation
        camera.position.x = Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x) * camera.position.z;
        camera.position.y = Math.sin(cameraRotation.x) * camera.position.z;
        camera.lookAt(0, 0, 0);
        
        // Update visualization
        updateVisualization();
        
        renderer.render(scene, camera);
    }
    
    // Initial update
    updateQuantumInfo();
    updateVisualization();
    animate();
    
    // Handle resize
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    }
    window.addEventListener('resize', resizeCanvas);
}

function updateQuantumInfo() {
    const normalized = normalizeState(window.quantumState);
    const prob0 = normalized.real0 ** 2 + normalized.imag0 ** 2;
    const prob1 = normalized.real1 ** 2 + normalized.imag1 ** 2;
    const quantumInfo = document.getElementById('quantumInfo');
    if (quantumInfo) {
        const alpha = Math.sqrt(prob0);
        const beta = Math.sqrt(prob1);
        quantumInfo.innerHTML = `|ψ⟩ = ${alpha.toFixed(2)}|0⟩ + ${beta.toFixed(2)}|1⟩<br>
            P(|0⟩) = ${prob0.toFixed(2)} | P(|1⟩) = ${prob1.toFixed(2)}`;
    }
}

// Quantum gates - proper matrix operations with normalization
function applyHadamard() {
    // H = (1/√2) * [[1, 1], [1, -1]]
    const sqrt2 = Math.sqrt(2) / 2;
    const newReal0 = sqrt2 * (window.quantumState.real0 + window.quantumState.real1);
    const newImag0 = sqrt2 * (window.quantumState.imag0 + window.quantumState.imag1);
    const newReal1 = sqrt2 * (window.quantumState.real0 - window.quantumState.real1);
    const newImag1 = sqrt2 * (window.quantumState.imag0 - window.quantumState.imag1);
    window.quantumState = normalizeState({ real0: newReal0, imag0: newImag0, real1: newReal1, imag1: newImag1 });
    updateQuantumInfo();
}

function applyPauliX() {
    // X = [[0, 1], [1, 0]] - bit flip
    const temp0 = window.quantumState.real0;
    const temp0i = window.quantumState.imag0;
    window.quantumState = normalizeState({
        real0: window.quantumState.real1,
        imag0: window.quantumState.imag1,
        real1: temp0,
        imag1: temp0i
    });
    updateQuantumInfo();
}

function applyPauliY() {
    // Y = [[0, -i], [i, 0]] - bit and phase flip
    const temp0 = window.quantumState.real0;
    const temp0i = window.quantumState.imag0;
    window.quantumState = normalizeState({
        real0: window.quantumState.imag1,
        imag0: -window.quantumState.real1,
        real1: -temp0i,
        imag1: temp0
    });
    updateQuantumInfo();
}

function applyPauliZ() {
    // Z = [[1, 0], [0, -1]] - phase flip
    window.quantumState = normalizeState({
        real0: window.quantumState.real0,
        imag0: window.quantumState.imag0,
        real1: -window.quantumState.real1,
        imag1: -window.quantumState.imag1
    });
    updateQuantumInfo();
}

function applyPhase() {
    // S = [[1, 0], [0, i]] - π/2 phase gate
    const temp = window.quantumState.real1;
    window.quantumState = normalizeState({
        real0: window.quantumState.real0,
        imag0: window.quantumState.imag0,
        real1: -window.quantumState.imag1,
        imag1: temp
    });
    updateQuantumInfo();
}

function resetQuantum() {
    window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };
    updateQuantumInfo();
}

// Toggle Pauli dropdown menu
function togglePauliDropdown() {
    const submenu = document.getElementById('pauliSubmenu');
    const btn = document.getElementById('pauliBtn');
    if (submenu && btn) {
        const isShowing = submenu.classList.toggle('show');
        btn.classList.toggle('show', isShowing);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const submenu = document.getElementById('pauliSubmenu');
    const pauliBtn = document.getElementById('pauliBtn');
    if (submenu && pauliBtn && !submenu.contains(e.target) && !pauliBtn.contains(e.target)) {
        submenu.classList.remove('show');
        pauliBtn.classList.remove('show');
    }
});