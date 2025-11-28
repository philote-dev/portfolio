// SIMPLE SMOOTH SCROLL TRANSITION - QUICK AND IMMEDIATE
const header = document.querySelector('header');
const aboutContent = document.getElementById('aboutContent');

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const headerHeight = window.innerHeight;
    const scrollPercentage = Math.min(scrollY / headerHeight, 1);
    const headerElement = document.querySelector('.header-content');
    
    // Faster transition - starts immediately at 5% and completes by 35%
    if (scrollPercentage < 0.05) {
	// Show name
	headerElement.style.opacity = 1;
	headerElement.style.transform = `translateY(0) scale(1)`;
	aboutContent.style.opacity = 0;
	aboutContent.style.transform = `translate(-50%, -50%) translateY(20px)`;
	aboutContent.classList.remove('active');
	header.classList.remove('scrolled');
    } 
    else if (scrollPercentage >= 0.05 && scrollPercentage < 0.35) {
	// Quick transition zone - completes by 35%
	const transitionProgress = (scrollPercentage - 0.05) / 0.3;
	headerElement.style.opacity = Math.max(0, 1 - transitionProgress);
	headerElement.style.transform = `translateY(${-transitionProgress * 30}px) scale(${1 - transitionProgress * 0.3})`;
	aboutContent.style.opacity = transitionProgress;
	aboutContent.style.transform = `translate(-50%, -50%) translateY(${20 - transitionProgress * 20}px)`;
	aboutContent.classList.add('active');
	header.classList.add('scrolled');
    }
    else {
	// Show about - fully transitioned by 35%
	headerElement.style.opacity = 0;
	headerElement.style.transform = `translateY(-30px) scale(0.7)`;
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
