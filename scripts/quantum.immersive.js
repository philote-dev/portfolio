window.quantumAnimating = false;
window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };
let quantumTime = 0;

observeElement('#unified-viz', () => {
}, 0.3);

function initQuantum() {
    if (window.quantumAnimating) return;
    window.quantumAnimating = true;
    
    const canvas = document.getElementById('quantumCanvas');
    const ctx = canvas.getContext('2d');
    
    // Immersive 3D system
    let rotationX = 0.4;
    let rotationY = 0;
    let targetRotationX = 0.4;
    let targetRotationY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Quantum particles and effects
    let quantumParticles = [];
    let measurementParticles = [];
    let interferenceWaves = [];
    let entanglementLines = [];
    
    function resizeCanvas() {
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    
    // Mouse interaction
    canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	const mouseX = e.clientX - rect.left;
	const mouseY = e.clientY - rect.top;
	
	if (isDragging) {
	    const deltaX = mouseX - lastMouseX;
	    const deltaY = mouseY - lastMouseY;
	    targetRotationY += deltaX * 0.015;
	    targetRotationX += deltaY * 0.015;
	}
	
	lastMouseX = mouseX;
	lastMouseY = mouseY;
    });
    
    canvas.addEventListener('mousedown', () => {
	isDragging = true;
    });
    
    canvas.addEventListener('mouseup', () => {
	isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
	isDragging = false;
    });

    // 3D math functions
    function rotate3D(x, y, z) {
	const cosX = Math.cos(rotationX);
	const sinX = Math.sin(rotationX);
	const cosY = Math.cos(rotationY);
	const sinY = Math.sin(rotationY);
	
	let x1 = x * cosY - z * sinY;
	let z1 = x * sinY + z * cosY;
	
	let y1 = y * cosX - z1 * sinX;
	z1 = y * sinX + z1 * cosX;
	
	return { x: x1, y: y1, z: z1 };
    }
    
    function project3D(x, y, z, radius) {
	const perspective = 1200;
	const scale = perspective / (perspective + z);
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2 + 120;
	return {
	    x: centerX + x * radius * scale,
	    y: centerY + y * radius * scale,
	    z: z,
	    scale: Math.max(0.1, scale)
	};
    }
    
    function spherePoint(theta, phi) {
	const x = Math.sin(phi) * Math.cos(theta);
	const y = Math.sin(phi) * Math.sin(theta);
	const z = Math.cos(phi);
	return rotate3D(x, y, z);
    }

    function animate() {
	ctx.fillStyle = 'rgba(20, 25, 35, 0.3)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	quantumTime += 0.015;
	
	// Smooth rotation
	rotationX += (targetRotationX - rotationX) * 0.08;
	rotationY += (targetRotationY - rotationY) * 0.08;
	
	// Auto-rotate
	if (!isDragging) {
	    targetRotationY += 0.003;
	}

	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2 + 120;
	const radius = Math.min(canvas.width, canvas.height) * 0.28;

	const prob0 = window.quantumState.real0 ** 2 + window.quantumState.imag0 ** 2;
	const prob1 = window.quantumState.real1 ** 2 + window.quantumState.imag1 ** 2;
	
	const angle0 = Math.atan2(window.quantumState.imag0, window.quantumState.real0);
	const angle1 = Math.atan2(window.quantumState.imag1, window.quantumState.real1);

	// Draw immersive 3D Bloch sphere with wireframe
	const sphereGrid = [];
	for (let phi = 0; phi <= Math.PI; phi += Math.PI / 25) {
	    for (let theta = 0; theta <= Math.PI * 2; theta += Math.PI / 25) {
		const point = spherePoint(theta, phi);
		const proj = project3D(point.x, point.y, point.z, radius);
		sphereGrid.push({ ...proj, phi, theta, normal: point });
	    }
	}
	
	sphereGrid.sort((a, b) => b.z - a.z);
	
	// Draw sphere with dynamic lighting
	for (const point of sphereGrid) {
	    if (point.z < -1000) continue;
	    
	    const lightDir = { x: 0.5, y: 0.5, z: 1 };
	    const dot = point.normal.x * lightDir.x + point.normal.y * lightDir.y + point.normal.z * lightDir.z;
	    const brightness = Math.max(0.15, (dot + 1) / 2);
	    
	    // Add quantum state influence to brightness
	    const stateInfluence = Math.sin(quantumTime * 2 + point.theta * 2) * 0.2;
	    const finalBrightness = brightness + stateInfluence;
	    
	    const alpha = 0.2 * finalBrightness * point.scale;
	    ctx.fillStyle = `rgba(136, 192, 208, ${alpha})`;
	    ctx.beginPath();
	    ctx.arc(point.x, point.y, 4 * point.scale, 0, Math.PI * 2);
	    ctx.fill();
	}
	
	// Draw wireframe grid
	ctx.strokeStyle = 'rgba(136, 192, 208, 0.15)';
	ctx.lineWidth = 0.5;
	for (let phi = 0; phi <= Math.PI; phi += Math.PI / 8) {
	    ctx.beginPath();
	    for (let theta = 0; theta <= Math.PI * 2; theta += Math.PI / 30) {
		const point = spherePoint(theta, phi);
		const proj = project3D(point.x, point.y, point.z, radius);
		if (proj.z > -1000) {
		    if (theta === 0) ctx.moveTo(proj.x, proj.y);
		    else ctx.lineTo(proj.x, proj.y);
		}
	    }
	    ctx.stroke();
	}
	
	for (let theta = 0; theta <= Math.PI * 2; theta += Math.PI / 8) {
	    ctx.beginPath();
	    for (let phi = 0; phi <= Math.PI; phi += Math.PI / 30) {
		const point = spherePoint(theta, phi);
		const proj = project3D(point.x, point.y, point.z, radius);
		if (proj.z > -1000) {
		    if (phi === 0) ctx.moveTo(proj.x, proj.y);
		    else ctx.lineTo(proj.x, proj.y);
		}
	    }
	    ctx.stroke();
	}

	// Create quantum particles
	if (Math.random() < 0.3) {
	    const theta = Math.random() * Math.PI * 2;
	    const phi = Math.random() * Math.PI;
	    const point = spherePoint(theta, phi);
	    quantumParticles.push({
		theta, phi,
		x: point.x, y: point.y, z: point.z,
		life: 1,
		speed: 0.01 + Math.random() * 0.02,
		color: Math.random() > 0.5 ? '#88c0d0' : '#b48ead',
		trail: []
	    });
	}
	
	// Update and draw quantum particles
	for (let i = quantumParticles.length - 1; i >= 0; i--) {
	    const particle = quantumParticles[i];
	    particle.life -= 0.008;
	    
	    // Quantum state influences particle movement
	    const stateForce = Math.sin(quantumTime * 3 + particle.theta * 3) * 0.02;
	    particle.theta += particle.speed + stateForce;
	    particle.phi += particle.speed * 0.5;
	    
	    const point = spherePoint(particle.theta, particle.phi);
	    particle.x = point.x;
	    particle.y = point.y;
	    particle.z = point.z;
	    
	    // Add to trail
	    const proj = project3D(particle.x, particle.y, particle.z, radius);
	    particle.trail.push({ ...proj, life: 1 });
	    if (particle.trail.length > 15) particle.trail.shift();
	    
	    if (particle.life <= 0) {
		quantumParticles.splice(i, 1);
		continue;
	    }
	    
	    // Draw trail
	    for (let j = 0; j < particle.trail.length; j++) {
		const trailPoint = particle.trail[j];
		trailPoint.life -= 0.1;
		if (trailPoint.life <= 0) continue;
		
		const alpha = trailPoint.life * particle.life * 0.4;
		ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
		ctx.beginPath();
		ctx.arc(trailPoint.x, trailPoint.y, 2 * trailPoint.scale, 0, Math.PI * 2);
		ctx.fill();
	    }
	    
	    // Draw particle
	    if (proj.z > -1000) {
		const glowGradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 8 * proj.scale);
		const rgb = particle.color === '#88c0d0' ? '136, 192, 208' : '180, 142, 173';
		glowGradient.addColorStop(0, `rgba(${rgb}, ${particle.life * 0.8})`);
		glowGradient.addColorStop(1, `rgba(${rgb}, 0)`);
		ctx.fillStyle = glowGradient;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, 8 * proj.scale, 0, Math.PI * 2);
		ctx.fill();
		
		ctx.fillStyle = particle.color;
		ctx.globalAlpha = particle.life;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, 3 * proj.scale, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	    }
	}

	// Draw 3D state vectors with quantum field
	const stateVectors = [
	    { angle: angle0, prob: prob0, color: '#88c0d0' },
	    { angle: angle1, prob: prob1, color: '#b48ead' }
	];
	
	for (const state of stateVectors) {
	    if (state.prob < 0.01) continue;
	    
	    const phi = Math.PI / 2;
	    const theta = state.angle;
	    const point = spherePoint(theta, phi);
	    const length = radius * Math.sqrt(state.prob);
	    
	    const start = project3D(0, 0, 0, radius);
	    const end = project3D(point.x * length / radius, point.y * length / radius, point.z * length / radius, radius);
	    
	    if (end.z < -1000) continue;
	    
	    // Quantum field around vector
	    for (let i = 0; i < 20; i++) {
		const fieldAngle = (i / 20) * Math.PI * 2;
		const fieldDist = 15 + Math.sin(quantumTime * 2 + fieldAngle * 3) * 5;
		const fieldPoint = {
		    x: end.x + Math.cos(fieldAngle) * fieldDist * end.scale,
		    y: end.y + Math.sin(fieldAngle) * fieldDist * end.scale
		};
		
		const fieldAlpha = 0.3 * state.prob * end.scale;
		ctx.fillStyle = state.color + Math.floor(fieldAlpha * 255).toString(16).padStart(2, '0');
		ctx.beginPath();
		ctx.arc(fieldPoint.x, fieldPoint.y, 2 * end.scale, 0, Math.PI * 2);
		ctx.fill();
	    }
	    
	    // Vector with gradient
	    const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
	    gradient.addColorStop(0, state.color);
	    gradient.addColorStop(1, state.color + '00');
	    ctx.strokeStyle = gradient;
	    ctx.lineWidth = 3 * end.scale;
	    ctx.lineCap = 'round';
	    ctx.beginPath();
	    ctx.moveTo(start.x, start.y);
	    ctx.lineTo(end.x, end.y);
	    ctx.stroke();
	    
	    // Arrowhead
	    const arrowSize = 12 * end.scale;
	    const arrowAngle = Math.atan2(end.y - start.y, end.x - start.x);
	    ctx.fillStyle = state.color;
	    ctx.beginPath();
	    ctx.moveTo(end.x, end.y);
	    ctx.lineTo(
		end.x - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
		end.y - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
	    );
	    ctx.lineTo(
		end.x - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
		end.y - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
	    );
	    ctx.closePath();
	    ctx.fill();
	}

	// Immersive probability clouds
	for (const state of stateVectors) {
	    if (state.prob < 0.01) continue;
	    
	    const phi = Math.PI / 2;
	    const theta = state.angle;
	    const point = spherePoint(theta, phi);
	    const dist = radius * Math.sqrt(state.prob);
	    
	    const cloudPoint = {
		x: point.x * dist / radius,
		y: point.y * dist / radius,
		z: point.z * dist / radius
	    };
	    
	    const proj = project3D(cloudPoint.x, cloudPoint.y, cloudPoint.z, radius);
	    if (proj.z < -1000) continue;
	    
	    // Multi-layered cloud with pulsing
	    const pulse = Math.sin(quantumTime * 3) * 0.2 + 0.8;
	    for (let layer = 0; layer < 5; layer++) {
		const layerRadius = radius * (0.25 + layer * 0.08) * pulse * proj.scale;
		const layerAlpha = (state.prob * 0.5) / (layer + 1) * proj.scale;
		const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, layerRadius);
		const rgb = state.color === '#88c0d0' ? '136, 192, 208' : '180, 142, 173';
		gradient.addColorStop(0, `rgba(${rgb}, ${layerAlpha})`);
		gradient.addColorStop(0.6, `rgba(${rgb}, ${layerAlpha * 0.6})`);
		gradient.addColorStop(1, `rgba(${rgb}, 0)`);
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, layerRadius, 0, Math.PI * 2);
		ctx.fill();
	    }
	    
	    // Orbiting particles
	    const particleCount = 25;
	    for (let i = 0; i < particleCount; i++) {
		const particleAngle = (i / particleCount) * Math.PI * 2 + quantumTime * 2;
		const particleRadius = radius * 0.4 * state.prob;
		const orbitPoint = {
		    x: cloudPoint.x + Math.cos(particleAngle) * particleRadius / radius,
		    y: cloudPoint.y + Math.sin(particleAngle) * particleRadius / radius,
		    z: cloudPoint.z
		};
		const particleProj = project3D(orbitPoint.x, orbitPoint.y, orbitPoint.z, radius);
		
		if (particleProj.z > -1000) {
		    const particleSize = 3 * state.prob * particleProj.scale;
		    const particleGlow = ctx.createRadialGradient(particleProj.x, particleProj.y, 0, particleProj.x, particleProj.y, particleSize * 3);
		    const rgb = state.color === '#88c0d0' ? '136, 192, 208' : '180, 142, 173';
		    particleGlow.addColorStop(0, `rgba(${rgb}, ${state.prob * 0.9})`);
		    particleGlow.addColorStop(1, `rgba(${rgb}, 0)`);
		    ctx.fillStyle = particleGlow;
		    ctx.beginPath();
		    ctx.arc(particleProj.x, particleProj.y, particleSize * 3, 0, Math.PI * 2);
		    ctx.fill();
		    
		    ctx.fillStyle = state.color;
		    ctx.globalAlpha = state.prob * 0.8;
		    ctx.beginPath();
		    ctx.arc(particleProj.x, particleProj.y, particleSize, 0, Math.PI * 2);
		    ctx.fill();
		    ctx.globalAlpha = 1;
		}
	    }
	}

	// Quantum interference pattern
	if (prob0 > 0.1 && prob1 > 0.1) {
	    for (let i = 0; i < 50; i++) {
		const theta = (i / 50) * Math.PI * 2;
		const phi = Math.PI / 2;
		const point = spherePoint(theta, phi);
		const dist0 = Math.cos(theta - angle0) * prob0;
		const dist1 = Math.cos(theta - angle1) * prob1;
		const interference = Math.abs(dist0 + dist1) * Math.min(prob0, prob1) * 0.5;
		
		if (interference > 0.15) {
		    const interferencePoint = {
			x: point.x * radius * 0.85 / radius,
			y: point.y * radius * 0.85 / radius,
			z: point.z * radius * 0.85 / radius
		    };
		    const proj = project3D(interferencePoint.x, interferencePoint.y, interferencePoint.z, radius);
		    
		    if (proj.z > -1000) {
			const pulse = Math.sin(quantumTime * 4 + theta * 2) * 0.3 + 0.7;
			ctx.fillStyle = `rgba(180, 142, 173, ${interference * pulse * proj.scale})`;
			ctx.beginPath();
			ctx.arc(proj.x, proj.y, 4 * interference * proj.scale, 0, Math.PI * 2);
			ctx.fill();
		    }
		}
	    }
	}

	// Quantum wave function visualization
	const wavePoints = [];
	for (let x = -radius; x <= radius; x += 3) {
	    const waveY = Math.sin((x / radius) * Math.PI * 3 + quantumTime * 2) * 20;
	    const waveZ = Math.cos((x / radius) * Math.PI * 3 + quantumTime * 2) * 15;
	    const point = rotate3D(x / radius, waveY / radius, waveZ / radius);
	    const proj = project3D(point.x, point.y, point.z, radius);
	    wavePoints.push(proj);
	}
	
	ctx.strokeStyle = 'rgba(180, 142, 173, 0.6)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	for (let i = 0; i < wavePoints.length; i++) {
	    const p = wavePoints[i];
	    if (p.z > -1000) {
		if (i === 0) ctx.moveTo(p.x, p.y);
		else ctx.lineTo(p.x, p.y);
	    }
	}
	ctx.stroke();
	
	// Add glowing points along wave
	for (const p of wavePoints) {
	    if (p.z > -1000 && Math.random() < 0.3) {
		const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6 * p.scale);
		glow.addColorStop(0, 'rgba(180, 142, 173, 0.8)');
		glow.addColorStop(1, 'rgba(180, 142, 173, 0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(p.x, p.y, 6 * p.scale, 0, Math.PI * 2);
		ctx.fill();
	    }
	}

	requestAnimationFrame(animate);
    }
    
    animate();
}

function updateQuantumInfo() {
    const prob0 = window.quantumState.real0 ** 2 + window.quantumState.imag0 ** 2;
    const prob1 = window.quantumState.real1 ** 2 + window.quantumState.imag1 ** 2;
    const quantumInfo = document.getElementById('quantumInfo');
    if (quantumInfo) {
	quantumInfo.innerHTML = `|ψ⟩ = ${prob0.toFixed(2)}|0⟩ + ${prob1.toFixed(2)}|1⟩`;
    }
}

function applyHadamard() {
    const sqrt2 = Math.sqrt(2) / 2;
    const newReal0 = sqrt2 * (window.quantumState.real0 + window.quantumState.real1);
    const newImag0 = sqrt2 * (window.quantumState.imag0 + window.quantumState.imag1);
    const newReal1 = sqrt2 * (window.quantumState.real0 - window.quantumState.real1);
    const newImag1 = sqrt2 * (window.quantumState.imag0 - window.quantumState.imag1);
    window.quantumState = { real0: newReal0, imag0: newImag0, real1: newReal1, imag1: newImag1 };
    updateQuantumInfo();
}

function applyPauliX() {
    const temp0 = window.quantumState.real0;
    const temp0i = window.quantumState.imag0;
    window.quantumState.real0 = window.quantumState.real1;
    window.quantumState.imag0 = window.quantumState.imag1;
    window.quantumState.real1 = temp0;
    window.quantumState.imag1 = temp0i;
    updateQuantumInfo();
}

function applyPhase() {
    window.quantumState.real1 *= -1;
    window.quantumState.imag1 *= -1;
    updateQuantumInfo();
}

function resetQuantum() {
    window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };
    updateQuantumInfo();
}
