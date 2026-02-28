window.quantumAnimating = false;
window.quantumState = { real0: 1, imag0: 0, real1: 0, imag1: 0 };
let quantumTime = 0;

// Quantum will be initialized when switching to it via switchViz function
// This observer is kept as fallback but won't auto-start
observeElement('#unified-viz', () => {
    // Don't auto-start quantum, let switchViz handle it
}, 0.3);

function initQuantum() {
    if (window.quantumAnimating) return;
    window.quantumAnimating = true;
    
    const canvas = document.getElementById('quantumCanvas');
    const ctx = canvas.getContext('2d');
    function resizeCanvas() {
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();

    function animate() {
	ctx.fillStyle = 'rgba(46, 52, 64, 0.05)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	quantumTime += 0.02;

	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2 + 120; // MOVED UP
	const radius = Math.min(canvas.width, canvas.height) * 0.2;

	const prob0 = window.quantumState.real0 ** 2 + window.quantumState.imag0 ** 2;
	const prob1 = window.quantumState.real1 ** 2 + window.quantumState.imag1 ** 2;

	for (let i = 0; i < 3; i++) {
	    const orbitRadius = radius * (0.5 + i * 0.25);
	    ctx.strokeStyle = `rgba(136, 192, 208, ${0.3 - i * 0.08})`;
	    ctx.lineWidth = 1;
	    ctx.beginPath();
	    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
	    ctx.stroke();
	}

	const angle0 = Math.atan2(window.quantumState.imag0, window.quantumState.real0);
	const angle1 = Math.atan2(window.quantumState.imag1, window.quantumState.real1);

	drawCloud(ctx, centerX, centerY, angle0, prob0, '#88c0d0', radius);
	drawCloud(ctx, centerX, centerY, angle1, prob1, '#b48ead', radius);

	const waveHeight = Math.sin(quantumTime) * 20;
	ctx.strokeStyle = 'rgba(180, 142, 173, 0.4)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(centerX - radius, centerY);
	for (let x = -radius; x <= radius; x += 5) {
	    const y = centerY + Math.sin((x / radius) * Math.PI + quantumTime) * waveHeight;
	    ctx.lineTo(centerX + x, y);
	}
	ctx.stroke();

	requestAnimationFrame(animate);
    }
    animate();
}

function drawCloud(ctx, centerX, centerY, angle, probability, color, radius) {
    const x = centerX + Math.cos(angle) * radius * Math.sqrt(probability);
    const y = centerY + Math.sin(angle) * radius * Math.sqrt(probability);
    const pulse = Math.sin(quantumTime * 2) * 0.3 + 0.7;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.4 * pulse);
    const rgbColor = color === '#88c0d0' ? '136, 192, 208' : '180, 142, 173';
    gradient.addColorStop(0, `rgba(${rgbColor}, ${probability * 0.8})`);
    gradient.addColorStop(1, `rgba(${rgbColor}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4 * pulse, 0, Math.PI * 2);
    ctx.fill();

    const particles = 8;
    for (let i = 0; i < particles; i++) {
	const particleAngle = (i / particles) * Math.PI * 2 + quantumTime;
	const particleX = x + Math.cos(particleAngle) * radius * 0.3 * probability;
	const particleY = y + Math.sin(particleAngle) * radius * 0.3 * probability;
	ctx.fillStyle = color;
	ctx.globalAlpha = probability * 0.6;
	ctx.beginPath();
	ctx.arc(particleX, particleY, 2 * probability, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;
    }
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

