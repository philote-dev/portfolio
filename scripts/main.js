// SIMPLE SMOOTH SCROLL TRANSITION - QUICK AND IMMEDIATE
const header = document.querySelector('header');
const aboutContent = document.getElementById('aboutContent');

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const headerHeight = window.innerHeight;
    const scrollPercentage = Math.min(scrollY / headerHeight, 1);
    const headerElement = document.querySelector('.header-content');
    
    // Fast transition - starts immediately at 0% and completes by 15%
    if (scrollPercentage < 0.15) {
	// Transition zone - starts immediately on scroll
	const transitionProgress = Math.min(scrollPercentage / 0.15, 1);
	headerElement.style.opacity = Math.max(0, 1 - transitionProgress);
	// Name moves up more to get out of the way (increased from 30px to 80px)
	headerElement.style.transform = `translateY(${-transitionProgress * 80}px) scale(${1 - transitionProgress * 0.3})`;
	aboutContent.style.opacity = transitionProgress;
	aboutContent.style.transform = `translate(-50%, -50%) translateY(${20 - transitionProgress * 20}px)`;
	
	if (transitionProgress > 0.1) {
	    aboutContent.classList.add('active');
	    header.classList.add('scrolled');
	} else {
	    aboutContent.classList.remove('active');
	    header.classList.remove('scrolled');
	}
    }
    else {
	// Show about - fully transitioned by 15%
	headerElement.style.opacity = 0;
	// Name fully moved up and out of the way
	headerElement.style.transform = `translateY(-80px) scale(0.7)`;
	aboutContent.style.opacity = 1;
	aboutContent.style.transform = `translate(-50%, -50%) translateY(0)`;
	aboutContent.classList.add('active');
	header.classList.add('scrolled');
    }
});

// PROJECT MODAL FUNCTIONS
function openModal(projectId) {
    const modal = document.getElementById(`modal-${projectId}`);
    if (modal) {
	modal.classList.add('active');
	document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeModal(event, projectId) {
    const modal = document.getElementById(`modal-${projectId}`);
    if (modal) {
	modal.classList.remove('active');
	document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
	document.querySelectorAll('.modal.active').forEach(modal => {
	    modal.classList.remove('active');
	    document.body.style.overflow = 'auto';
	});
    }
});

// SHOW MORE PROJECTS FUNCTIONALITY
function toggleMoreProjects() {
    const hiddenProjects = document.querySelectorAll('.project-hidden');
    const showMoreBtn = document.getElementById('showMoreBtn');
    
    hiddenProjects.forEach(project => {
	project.classList.toggle('show');
    });
    
    showMoreBtn.classList.toggle('expanded');
}

// UNIFIED VISUALIZATION SWITCHING
let currentVizIndex = 0;
const vizTypes = ['neural', 'quantum', 'gojo'];

function switchViz(direction) {
    const prevVizType = vizTypes[currentVizIndex];
    // Remove active class from current visualization
    const currentCanvas = document.querySelector('.viz-canvas.active');
    const currentPanel = document.querySelector('.viz-panel.active');
    
    if (currentCanvas) currentCanvas.classList.remove('active');
    if (currentPanel) currentPanel.classList.remove('active');
    
    // Update index
    currentVizIndex += direction;
    if (currentVizIndex < 0) currentVizIndex = vizTypes.length - 1;
    if (currentVizIndex >= vizTypes.length) currentVizIndex = 0;
    
    // Activate new visualization
    const newVizType = vizTypes[currentVizIndex];
    const newCanvas = document.getElementById(`${newVizType}Canvas`);
    const newPanel = document.querySelector(`.viz-panel[data-viz="${newVizType}"]`);
    
    if (newCanvas) newCanvas.classList.add('active');
    if (newPanel) newPanel.classList.add('active');

    // Notify Gojo viz when it becomes active/inactive (controls when Infinity starts)
    if (prevVizType === 'gojo' && typeof window.gojoSetActive === 'function') {
        window.gojoSetActive(false);
    }
    if (newVizType === 'gojo' && typeof window.gojoSetActive === 'function') {
        window.gojoSetActive(true);
    }
    
    // Initialize neural if switching to it and not already initialized
    if (newVizType === 'neural' && typeof initNeural === 'function' && !window.neuralAnimating) {
	setTimeout(() => {
	    if (!window.neuralAnimating) {
		initNeural();
	    }
	}, 100);
    }
    
    // Initialize quantum if switching to it and not already initialized
    if (newVizType === 'quantum' && typeof initQuantum === 'function' && !window.quantumAnimating) {
	setTimeout(() => {
	    if (!window.quantumAnimating) {
		initQuantum();
	    }
	}, 100);
    }
    
    // Initialize gojo if switching to it and not already initialized
    if (newVizType === 'gojo' && typeof initGojo === 'function' && !gojoAnimating) {
	setTimeout(() => {
	    if (!gojoAnimating && window.THREE) {
		// Trigger initialization
		const event = new Event('gojo-init');
		window.dispatchEvent(event);
	    }
	}, 100);
    }
}

// Helper function to observe element visibility
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

// Initialize first visualization when it comes into view
observeElement('#unified-viz', () => {
    const activeCanvas = document.querySelector('.viz-canvas.active');
    if (activeCanvas) {
	const vizType = activeCanvas.id.replace('Canvas', '');
	if (vizType === 'neural' && typeof initNeural === 'function' && !window.neuralAnimating) {
	    setTimeout(() => {
		if (!window.neuralAnimating) {
		    initNeural();
		}
	    }, 100);
	}
    }
}, 0.3);

// Keyboard navigation for visualizations
document.addEventListener('keydown', (e) => {
    const unifiedViz = document.getElementById('unified-viz');
    if (!unifiedViz) return;
    
    const rect = unifiedViz.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
	e.preventDefault();
	switchViz(e.key === 'ArrowRight' ? 1 : -1);
    }
});


