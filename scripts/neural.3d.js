function observeElement(selector, callback, threshold = 0.2) {
    const element = document.querySelector(selector);
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
	    if (entry.isIntersecting) {
		callback();
		observer.unobserve(entry.target);
	    }
	});
    }, { threshold });
    observer.observe(element);
}

let neuralAnimating = false;
observeElement('#unified-viz', () => {
    if (neuralAnimating) return;
    neuralAnimating = true;
    initNeural();
}, 0.3);

function initNeural() {
    const canvas = document.getElementById('neuralCanvas');
    const ctx = canvas.getContext('2d');
    
    const layers = [4, 6, 6, 4];
    let neurons = [];
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let time = 0;
    let dataParticles = [];
    let pulseWaves = [];
    
    // 3D rotation and perspective
    let rotationX = 0;
    let rotationY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const perspective = 800; // Perspective distance
    
    // 3D projection function
    function project3D(x, y, z) {
	const cosX = Math.cos(rotationX);
	const sinX = Math.sin(rotationX);
	const cosY = Math.cos(rotationY);
	const sinY = Math.sin(rotationY);
	
	// Rotate around Y axis
	let x1 = x * cosY - z * sinY;
	let z1 = x * sinY + z * cosY;
	
	// Rotate around X axis
	let y1 = y * cosX - z1 * sinX;
	z1 = y * sinX + z1 * cosX;
	
	// Perspective projection
	const scale = perspective / (perspective + z1);
	return {
	    x: x1 * scale + canvas.width / 2,
	    y: y1 * scale + canvas.height / 2,
	    z: z1,
	    scale: scale
	};
    }

    function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.offsetWidth;
	canvas.height = container.offsetHeight;
	
	neurons = [];
	const depthSpacing = 200;
	for (let l = 0; l < layers.length; l++) {
	    neurons[l] = [];
	    const layerZ = (l - layers.length / 2) * depthSpacing;
	    for (let n = 0; n < layers[l]; n++) {
		const x = (l + 1) * (canvas.width / (layers.length + 1)) - canvas.width / 2;
		const y = (n + 1) * (canvas.height / (layers[l] + 1)) - canvas.height / 2;
		const z = layerZ + (Math.random() - 0.5) * 50; // Add some depth variation
		neurons[l][n] = { x, y, z, activation: 0, phase: Math.random() * Math.PI * 2 };
	    }
	}
	mouseX = canvas.width / 2;
	mouseY = canvas.height / 2;
	dataParticles = [];
	pulseWaves = [];
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse interaction for 3D rotation
    canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	mouseX = e.clientX - rect.left;
	mouseY = e.clientY - rect.top;
	
	if (isDragging) {
	    const deltaX = mouseX - lastMouseX;
	    const deltaY = mouseY - lastMouseY;
	    targetRotationY += deltaX * 0.01;
	    targetRotationX += deltaY * 0.01;
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
    
    // Click to trigger cascade
    canvas.addEventListener('click', (e) => {
	const rect = canvas.getBoundingClientRect();
	const clickX = e.clientX - rect.left;
	const clickY = e.clientY - rect.top;
	
	// Find nearest neuron and trigger cascade
	let minDist = Infinity;
	let nearestNeuron = null;
	for (let l = 0; l < layers.length; l++) {
	    for (let n = 0; n < layers[l]; n++) {
		const neuron = neurons[l][n];
		const proj = project3D(neuron.x, neuron.y, neuron.z);
		const dist = Math.sqrt((proj.x - clickX) ** 2 + (proj.y - clickY) ** 2);
		if (dist < minDist) {
		    minDist = dist;
		    nearestNeuron = { layer: l, index: n };
		}
	    }
	}
	
	if (nearestNeuron && minDist < 50) {
	    neurons[nearestNeuron.layer][nearestNeuron.index].activation = 1;
	    createPulseWave(nearestNeuron.layer);
	}
    });

    function createPulseWave(layerIndex) {
	pulseWaves.push({
	    layer: layerIndex,
	    progress: 0,
	    intensity: 1
	});
    }

    function animate() {
	ctx.fillStyle = 'rgba(46, 52, 64, 0.2)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	time += 0.02;
	
	// Smooth rotation
	rotationX += (targetRotationX - rotationX) * 0.1;
	rotationY += (targetRotationY - rotationY) * 0.1;
	
	// Auto-rotate slowly when not dragging
	if (!isDragging) {
	    targetRotationY += 0.002;
	}

	// Sort neurons by depth for proper 3D rendering
	const sortedNeurons = [];
	for (let l = 0; l < layers.length; l++) {
	    for (let n = 0; n < layers[l]; n++) {
		const neuron = neurons[l][n];
		const proj = project3D(neuron.x, neuron.y, neuron.z);
		sortedNeurons.push({ ...neuron, proj, layer: l, index: n });
	    }
	}
	sortedNeurons.sort((a, b) => b.proj.z - a.proj.z);

	// Update neurons
	for (let l = 0; l < layers.length; l++) {
	    for (let n = 0; n < layers[l]; n++) {
		const neuron = neurons[l][n];
		const proj = project3D(neuron.x, neuron.y, neuron.z);
		const dx = proj.x - mouseX;
		const dy = proj.y - mouseY;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const targetActivation = Math.max(0, 1 - dist / 250);
		neuron.activation += (targetActivation - neuron.activation) * 0.12;
		
		if (neuron.activation > 0.7 && Math.random() < 0.01) {
		    createPulseWave(l);
		}
	    }
	}

	// Draw connections first (behind neurons)
	for (let l = 0; l < layers.length - 1; l++) {
	    for (let n1 = 0; n1 < layers[l]; n1++) {
		for (let n2 = 0; n2 < layers[l + 1]; n2++) {
		    const neuron1 = neurons[l][n1];
		    const neuron2 = neurons[l + 1][n2];
		    const proj1 = project3D(neuron1.x, neuron1.y, neuron1.z);
		    const proj2 = project3D(neuron2.x, neuron2.y, neuron2.z);
		    
		    // Only draw if both are in front
		    if (proj1.z > -perspective && proj2.z > -perspective) {
			const strength = (neuron1.activation + neuron2.activation) * 0.5;
			const gradient = ctx.createLinearGradient(proj1.x, proj1.y, proj2.x, proj2.y);
			const hue = 180 + strength * 60;
			gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
			gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${strength * 0.4 * proj1.scale})`);
			gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
			ctx.strokeStyle = gradient;
			ctx.lineWidth = (1 + strength * 2) * proj1.scale;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(proj1.x, proj1.y);
			ctx.lineTo(proj2.x, proj2.y);
			ctx.stroke();
			
			if (strength > 0.3 && Math.random() < 0.02) {
			    dataParticles.push({
				x: neuron1.x,
				y: neuron1.y,
				z: neuron1.z,
				targetX: neuron2.x,
				targetY: neuron2.y,
				targetZ: neuron2.z,
				progress: 0,
				hue: hue
			    });
			}
		    }
		}
	    }
	}
	
	// Draw neurons with 3D depth
	for (const { proj, activation, phase, layer, index } of sortedNeurons) {
	    if (proj.z < -perspective) continue; // Behind camera
	    
	    const wave = Math.sin(time + phase) * 0.3;
	    const finalActivation = Math.max(0, activation + wave * 0.2);
	    const baseSize = 3 + finalActivation * 8;
	    const size = baseSize * proj.scale;
	    const hue = 180 + finalActivation * 80;
	    
	    const pulseIntensity = pulseWaves.filter(p => p.layer === layer).reduce((sum, p) => {
		const distFromPulse = Math.abs(p.progress - 0.5) * 2;
		return sum + (1 - distFromPulse) * p.intensity;
	    }, 0);
	    
	    // 3D glow effect
	    for (let i = 3; i > 0; i--) {
		const glowSize = size * (i + 2) * (1 + pulseIntensity * 0.3);
		const glowAlpha = (finalActivation * 0.3) / i * (1 + pulseIntensity * 0.5) * proj.scale;
		const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowSize);
		gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${glowAlpha})`);
		gradient.addColorStop(0.5, `hsla(${hue + 20}, 100%, 70%, ${glowAlpha * 0.5})`);
		gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, glowSize, 0, Math.PI * 2);
		ctx.fill();
	    }
	    
	    // 3D neuron core with depth shading
	    const depthShade = Math.max(0.3, 1 + proj.z / perspective);
	    const coreGradient = ctx.createRadialGradient(
		proj.x - size * 0.3, proj.y - size * 0.3, 0,
		proj.x, proj.y, size
	    );
	    coreGradient.addColorStop(0, `hsl(${hue + 40}, 100%, ${75 * depthShade}%)`);
	    coreGradient.addColorStop(0.7, `hsl(${hue}, 100%, ${55 * depthShade}%)`);
	    coreGradient.addColorStop(1, `hsl(${hue - 20}, 80%, ${45 * depthShade}%)`);
	    ctx.fillStyle = coreGradient;
	    ctx.beginPath();
	    ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
	    ctx.fill();
	    
	    if (finalActivation > 0.3) {
		ctx.fillStyle = `rgba(255, 255, 255, ${finalActivation * 0.6 * proj.scale})`;
		ctx.beginPath();
		ctx.arc(proj.x - size * 0.3, proj.y - size * 0.3, size * 0.3, 0, Math.PI * 2);
		ctx.fill();
	    }
	}
	
	// Update and draw data particles in 3D
	for (let i = dataParticles.length - 1; i >= 0; i--) {
	    const particle = dataParticles[i];
	    particle.progress += 0.03;
	    
	    if (particle.progress >= 1) {
		dataParticles.splice(i, 1);
		continue;
	    }
	    
	    const x = particle.x + (particle.targetX - particle.x) * particle.progress;
	    const y = particle.y + (particle.targetY - particle.y) * particle.progress;
	    const z = particle.z + (particle.targetZ - particle.z) * particle.progress;
	    const proj = project3D(x, y, z);
	    
	    if (proj.z > -perspective) {
		const glowGradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 6 * proj.scale);
		glowGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, 0.8)`);
		glowGradient.addColorStop(1, `hsla(${particle.hue}, 100%, 70%, 0)`);
		ctx.fillStyle = glowGradient;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, 6 * proj.scale, 0, Math.PI * 2);
		ctx.fill();
		
		ctx.fillStyle = `hsl(${particle.hue}, 100%, 60%)`;
		ctx.beginPath();
		ctx.arc(proj.x, proj.y, 3 * proj.scale, 0, Math.PI * 2);
		ctx.fill();
	    }
	}
	
	// Update pulse waves
	for (let i = pulseWaves.length - 1; i >= 0; i--) {
	    const pulse = pulseWaves[i];
	    pulse.progress += 0.05;
	    pulse.intensity *= 0.95;
	    
	    if (pulse.progress >= 1 || pulse.intensity < 0.1) {
		pulseWaves.splice(i, 1);
		continue;
	    }
	    
	    const layerX = (pulse.layer + 1) * (canvas.width / (layers.length + 1));
	    const waveRadius = pulse.progress * canvas.width * 0.3;
	    const alpha = pulse.intensity * (1 - pulse.progress) * 0.3;
	    
	    ctx.strokeStyle = `hsla(200, 100%, 70%, ${alpha})`;
	    ctx.lineWidth = 2;
	    ctx.beginPath();
	    ctx.arc(layerX, canvas.height / 2, waveRadius, 0, Math.PI * 2);
	    ctx.stroke();
	}
	
	requestAnimationFrame(animate);
    }
    animate();
}
