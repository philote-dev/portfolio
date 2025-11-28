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
observeElement('#neural', () => {
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

    function resizeCanvas() {
	const container = canvas.parentElement;
	canvas.width = container.offsetWidth;
	canvas.height = container.offsetHeight;
	
	// Recalculate neuron positions to keep centered
	neurons = [];
	for (let l = 0; l < layers.length; l++) {
	    neurons[l] = [];
	    for (let n = 0; n < layers[l]; n++) {
		const x = (l + 1) * (canvas.width / (layers.length + 1));
		const y = (n + 1) * (canvas.height / (layers[l] + 1));
		neurons[l][n] = { x, y, activation: 0, phase: Math.random() * Math.PI * 2 };
	    }
	}
	mouseX = canvas.width / 2;
	mouseY = canvas.height / 2;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	mouseX = e.clientX - rect.left;
	mouseY = e.clientY - rect.top;
    });

    function animate() {
	ctx.fillStyle = 'rgba(46, 52, 64, 0.1)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	time += 0.02;

	for (let l = 0; l < layers.length; l++) {
	    for (let n = 0; n < layers[l]; n++) {
		const neuron = neurons[l][n];
		const dx = neuron.x - mouseX;
		const dy = neuron.y - mouseY;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const targetActivation = Math.max(0, 1 - dist / 250);
		neuron.activation += (targetActivation - neuron.activation) * 0.12;
		const wave = Math.sin(time + neuron.phase) * 0.3;
		const finalActivation = Math.max(0, neuron.activation + wave * 0.2);
		const size = 3 + finalActivation * 8;
		const hue = 180 + finalActivation * 80;

		// Enhanced multi-layer glow effect
		for (let i = 3; i > 0; i--) {
		    const glowSize = size * (i + 2);
		    const glowAlpha = (finalActivation * 0.3) / i;
		    const gradient = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, glowSize);
		    gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${glowAlpha})`);
		    gradient.addColorStop(0.5, `hsla(${hue + 20}, 100%, 70%, ${glowAlpha * 0.5})`);
		    gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
		    ctx.fillStyle = gradient;
		    ctx.beginPath();
		    ctx.arc(neuron.x, neuron.y, glowSize, 0, Math.PI * 2);
		    ctx.fill();
		}

		// Core neuron with rim lighting
		const coreGradient = ctx.createRadialGradient(
		    neuron.x - size * 0.3, neuron.y - size * 0.3, 0,
		    neuron.x, neuron.y, size
		);
		coreGradient.addColorStop(0, `hsl(${hue + 40}, 100%, 75%)`);
		coreGradient.addColorStop(0.7, `hsl(${hue}, 100%, 55%)`);
		coreGradient.addColorStop(1, `hsl(${hue - 20}, 80%, 45%)`);
		ctx.fillStyle = coreGradient;
		ctx.beginPath();
		ctx.arc(neuron.x, neuron.y, size, 0, Math.PI * 2);
		ctx.fill();

		// Bright highlight
		if (finalActivation > 0.3) {
		    ctx.fillStyle = `rgba(255, 255, 255, ${finalActivation * 0.6})`;
		    ctx.beginPath();
		    ctx.arc(neuron.x - size * 0.3, neuron.y - size * 0.3, size * 0.3, 0, Math.PI * 2);
		    ctx.fill();
		}
	    }
	}

	for (let l = 0; l < layers.length - 1; l++) {
	    for (let n1 = 0; n1 < layers[l]; n1++) {
		for (let n2 = 0; n2 < layers[l + 1]; n2++) {
		    const neuron1 = neurons[l][n1];
		    const neuron2 = neurons[l + 1][n2];
		    const strength = (neuron1.activation + neuron2.activation) * 0.5;
		    const gradient = ctx.createLinearGradient(neuron1.x, neuron1.y, neuron2.x, neuron2.y);
		    const hue = 180 + strength * 60;
		    gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
		    gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${strength * 0.6})`);
		    gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
		    ctx.strokeStyle = gradient;
		    ctx.lineWidth = 1 + strength * 3;
		    ctx.lineCap = 'round';
		    ctx.beginPath();
		    ctx.moveTo(neuron1.x, neuron1.y);
		    ctx.lineTo(neuron2.x, neuron2.y);
		    ctx.stroke();
		}
	    }
	}
	requestAnimationFrame(animate);
    }
    animate();
}
