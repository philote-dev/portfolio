// PHYSICS-ACCURATE BLOCH SPHERE SIMULATOR
// A proper 3D visualization of quantum state on the Bloch sphere

window.quantumAnimating = false;
window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };

// Convert quantum state to Bloch sphere coordinates (θ, φ)
// |ψ⟩ = α|0⟩ + β|1⟩ where α and β are complex numbers
// On Bloch sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
function stateToBloch(state) {
    // Magnitudes (amplitudes)
    const alphaMag = Math.sqrt(state.real0 ** 2 + state.imag0 ** 2);
    const betaMag = Math.sqrt(state.real1 ** 2 + state.imag1 ** 2);
    
    // Normalize (ensure |α|² + |β|² = 1)
    const norm = Math.sqrt(alphaMag ** 2 + betaMag ** 2);
    const alphaNorm = norm > 0 ? alphaMag / norm : 1;
    const betaNorm = norm > 0 ? betaMag / norm : 0;
    
    // Polar angle: θ = 2 * arccos(|α|)
    const theta = 2 * Math.acos(Math.min(1, Math.max(0, alphaNorm)));
    
    // Azimuthal angle: φ = arg(β) - arg(α)
    // arg(α) = atan2(Im(α), Re(α))
    const alphaArg = Math.atan2(state.imag0, state.real0);
    const betaArg = Math.atan2(state.imag1, state.real1);
    const phi = betaArg - alphaArg;
    
    // Convert to Cartesian coordinates on unit sphere
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    
    return { x, y, z, theta, phi, alphaMag: alphaNorm, betaMag: betaNorm };
}

// Convert Bloch sphere coordinates to quantum state
function blochToState(theta, phi) {
    // |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
    const cosHalfTheta = Math.cos(theta / 2);
    const sinHalfTheta = Math.sin(theta / 2);
    
    return {
        real0: cosHalfTheta,
        imag0: 0,
        real1: sinHalfTheta * Math.cos(phi),
        imag1: sinHalfTheta * Math.sin(phi)
    };
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
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        context.fillStyle = color || '#88c0d0';
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 32);
        const texture = new THREE.CanvasTexture(canvas);
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
    
    // Probability cloud visualization
    const cloudGeometry = new THREE.BufferGeometry();
    const cloudParticles = 200;
    const cloudPositions = new Float32Array(cloudParticles * 3);
    const cloudColors = new Float32Array(cloudParticles * 3);
    const cloudSizes = new Float32Array(cloudParticles);
    
    for (let i = 0; i < cloudParticles; i++) {
        const idx = i * 3;
        cloudPositions[idx] = 0;
        cloudPositions[idx + 1] = 0;
        cloudPositions[idx + 2] = 0;
        cloudColors[idx] = 0.53; // #88c0d0
        cloudColors[idx + 1] = 0.75;
        cloudColors[idx + 2] = 0.82;
        cloudSizes[i] = 0;
    }
    
    cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
    cloudGeometry.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));
    cloudGeometry.setAttribute('size', new THREE.BufferAttribute(cloudSizes, 1));
    
    const cloudMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const cloud = new THREE.Points(cloudGeometry, cloudMaterial);
    scene.add(cloud);
    
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
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(2, Math.min(8, camera.position.z));
    });
    
    // Update visualization based on quantum state
    function updateVisualization() {
        const bloch = stateToBloch(window.quantumState);
        
        // Update state vector and point
        const stateVector = new THREE.Vector3(bloch.x, bloch.y, bloch.z);
        arrowHelper.setDirection(stateVector.normalize());
        arrowHelper.setLength(1, 0.1, 0.05);
        statePoint.position.copy(stateVector);
        
        // Update probability cloud
        const prob0 = bloch.alphaMag ** 2;
        const prob1 = bloch.betaMag ** 2;
        
        // Distribute cloud particles based on probabilities
        for (let i = 0; i < cloudParticles; i++) {
            const idx = i * 3;
            let x, y, z;
            
            if (i < cloudParticles * prob0) {
                // Particles near |0⟩ (north pole)
                const theta = Math.random() * 0.3;
                const phi = Math.random() * Math.PI * 2;
                x = Math.sin(theta) * Math.cos(phi);
                y = Math.sin(theta) * Math.sin(phi);
                z = Math.cos(theta);
            } else {
                // Particles near |1⟩ (south pole)
                const theta = Math.PI - Math.random() * 0.3;
                const phi = Math.random() * Math.PI * 2;
                x = Math.sin(theta) * Math.cos(phi);
                y = Math.sin(theta) * Math.sin(phi);
                z = Math.cos(theta);
            }
            
            cloudPositions[idx] = x;
            cloudPositions[idx + 1] = y;
            cloudPositions[idx + 2] = z;
            
            const brightness = i < cloudParticles * prob0 ? prob0 : prob1;
            cloudColors[idx] = 0.53 * brightness;
            cloudColors[idx + 1] = 0.75 * brightness;
            cloudColors[idx + 2] = 0.82 * brightness;
            cloudSizes[i] = brightness * 0.05;
        }
        
        cloudGeometry.attributes.position.needsUpdate = true;
        cloudGeometry.attributes.color.needsUpdate = true;
        cloudGeometry.attributes.size.needsUpdate = true;
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
    const prob0 = window.quantumState.real0 ** 2 + window.quantumState.imag0 ** 2;
    const prob1 = window.quantumState.real1 ** 2 + window.quantumState.imag1 ** 2;
    const quantumInfo = document.getElementById('quantumInfo');
    if (quantumInfo) {
        const alpha = Math.sqrt(prob0);
        const beta = Math.sqrt(prob1);
        const phase = Math.atan2(window.quantumState.imag1, window.quantumState.real1) - 
                      Math.atan2(window.quantumState.imag0, window.quantumState.real0);
        quantumInfo.innerHTML = `|ψ⟩ = ${alpha.toFixed(2)}|0⟩ + ${beta.toFixed(2)}e<sup>i${phase.toFixed(2)}</sup>|1⟩<br>
            P(|0⟩) = ${prob0.toFixed(3)} | P(|1⟩) = ${prob1.toFixed(3)}`;
    }
}

// Quantum gates - proper matrix operations
function applyHadamard() {
    // H = (1/√2) * [[1, 1], [1, -1]]
    const sqrt2 = Math.sqrt(2) / 2;
    const newReal0 = sqrt2 * (window.quantumState.real0 + window.quantumState.real1);
    const newImag0 = sqrt2 * (window.quantumState.imag0 + window.quantumState.imag1);
    const newReal1 = sqrt2 * (window.quantumState.real0 - window.quantumState.real1);
    const newImag1 = sqrt2 * (window.quantumState.imag0 - window.quantumState.imag1);
    window.quantumState = { real0: newReal0, imag0: newImag0, real1: newReal1, imag1: newImag1 };
    updateQuantumInfo();
}

function applyPauliX() {
    // X = [[0, 1], [1, 0]] - bit flip
    const temp0 = window.quantumState.real0;
    const temp0i = window.quantumState.imag0;
    window.quantumState.real0 = window.quantumState.real1;
    window.quantumState.imag0 = window.quantumState.imag1;
    window.quantumState.real1 = temp0;
    window.quantumState.imag1 = temp0i;
    updateQuantumInfo();
}

function applyPauliY() {
    // Y = [[0, -i], [i, 0]] - bit and phase flip
    const temp0 = window.quantumState.real0;
    const temp0i = window.quantumState.imag0;
    window.quantumState.real0 = window.quantumState.imag1;
    window.quantumState.imag0 = -window.quantumState.real1;
    window.quantumState.real1 = -temp0i;
    window.quantumState.imag1 = temp0;
    updateQuantumInfo();
}

function applyPauliZ() {
    // Z = [[1, 0], [0, -1]] - phase flip
    window.quantumState.real1 *= -1;
    window.quantumState.imag1 *= -1;
    updateQuantumInfo();
}

function applyPhase() {
    // S = [[1, 0], [0, i]] - π/2 phase gate
    const temp = window.quantumState.real1;
    window.quantumState.real1 = -window.quantumState.imag1;
    window.quantumState.imag1 = temp;
    updateQuantumInfo();
}

function resetQuantum() {
    window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };
    updateQuantumInfo();
}
