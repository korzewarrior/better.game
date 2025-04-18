// Simple SPA Router
const Router = {
    routes: {},
    currentPage: null,
    contentArea: null,
    isTransitioning: false,
    pendingNavigation: null,
    
    // Initialize the router
    init: function(contentSelector) {
        this.contentArea = document.querySelector(contentSelector);
        
        // Create a loading indicator
        this.createLoadingIndicator();
        
        // Set up initial page
        this.currentPage = window.location.hash.substring(1) || 'home';
        
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            // Find closest anchor tag
            const link = e.target.closest('a');
            if (!link) return;
            
            // Check if it's an internal link (starts with #)
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const pageName = href.substring(1);
                
                // Don't navigate if we're already on this page
                if (this.currentPage === pageName) return;
                
                // If we're transitioning, queue this navigation for after transition completes
                if (this.isTransitioning) {
                    this.pendingNavigation = pageName;
                    // Update the active state of nav buttons immediately for better UX
                    this.updateActiveNavButton(pageName);
                    return;
                }
                
                this.navigateTo(pageName);
            }
        });
        
        // Handle back/forward buttons
        window.addEventListener('popstate', () => {
            const pageName = window.location.hash.substring(1) || 'home';
            if (this.currentPage !== pageName) {
                if (this.isTransitioning) {
                    this.pendingNavigation = pageName;
                } else {
                    this.currentPage = pageName;
                    this.loadContent(this.currentPage);
                }
            }
        });
        
        // Load the current page
        this.loadContent(this.currentPage);
        
        // Set the initial active button
        this.updateActiveNavButton(this.currentPage);
    },
    
    // Update active nav button
    updateActiveNavButton: function(pageName) {
        // Remove active class from all nav buttons
        document.querySelectorAll('.nav .btn').forEach(btn => {
            btn.classList.remove('btn-active');
        });
        
        // Add active class to the current page button
        const activeButton = document.querySelector(`.nav .btn[href="#${pageName}"]`);
        if (activeButton) {
            activeButton.classList.add('btn-active');
        }
    },
    
    // Create a loading indicator
    createLoadingIndicator: function() {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'page-loading-indicator';
        document.body.appendChild(this.loadingIndicator);
    },
    
    // Show loading indicator
    showLoading: function() {
        this.loadingIndicator.classList.add('active');
    },
    
    // Hide loading indicator
    hideLoading: function() {
        this.loadingIndicator.classList.remove('active');
    },
    
    // Register a page
    add: function(path, templateId) {
        this.routes[path] = templateId;
    },
    
    // Navigate to a page
    navigateTo: function(pageName) {
        // Update the URL without reloading
        window.history.pushState(null, null, `#${pageName}`);
        this.currentPage = pageName;
        this.loadContent(pageName);
        this.updateActiveNavButton(pageName);
    },
    
    // Load content for the specified page
    loadContent: function(pageName) {
        // Prevent multiple transitions at once
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // Clear any pending navigation when we start a new one
        this.pendingNavigation = null;
        
        // Default to home if page not found
        if (!this.routes[pageName]) {
            pageName = 'home';
        }
        
        const templateId = this.routes[pageName];
        const template = document.getElementById(templateId);
        
        if (template) {
            // Show loading briefly to indicate page change
            this.showLoading();
            
            // First, prepare the new content while the old content is still visible
            const newContent = template.content.cloneNode(true);
            
            // Apply transition effect to fade out current content
            this.contentArea.classList.add('page-transition-out');
            
            // After the fade-out animation completes, swap the content
            setTimeout(() => {
                // Clear the content area
                this.contentArea.innerHTML = '';
                
                // Hide loading
                this.hideLoading();
                
                // Add the new content to the DOM
                this.contentArea.appendChild(newContent);
                
                // Apply transition effect to fade in new content
                this.contentArea.classList.remove('page-transition-out');
                this.contentArea.classList.add('page-transition-in');
                
                // Execute any scripts in the new content
                this.executeScripts();
                
                // Ensure any videos play correctly
                this.ensureVideosPlay();
                
                // Initialize FAQ accordion if on FAQ page
                if (pageName === 'faq') {
                    this.initFaqAccordion();
                }
                
                // Initialize Play page if on Play page
                if (pageName === 'play') {
                    this.initPlayPage();
                }
                
                // Remove the animation class and mark transition as complete
                setTimeout(() => {
                    this.contentArea.classList.remove('page-transition-in');
                    this.isTransitioning = false;
                    
                    // Try to ensure videos play again after transition completes
                    this.ensureVideosPlay();
                    
                    // Dispatch an event for custom page initialization
                    document.dispatchEvent(new CustomEvent('pageLoaded', { 
                        detail: { page: pageName }
                    }));
                    
                    // Scroll to top of the page
                    window.scrollTo(0, 0);
                    
                    // Check if there's a pending navigation request
                    if (this.pendingNavigation) {
                        const nextPage = this.pendingNavigation;
                        this.pendingNavigation = null;
                        this.navigateTo(nextPage);
                    }
                }, 500); // Match animation duration from CSS
                
            }, 400); // Match transition-out duration from CSS
        }
    },
    
    // Initialize FAQ accordion functionality
    initFaqAccordion: function() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight;
                
                // Close all other answers
                document.querySelectorAll('.faq-answer').forEach(a => {
                    a.style.maxHeight = null;
                });
                
                document.querySelectorAll('.faq-question').forEach(q => {
                    q.classList.remove('active');
                });
                
                // If the clicked item wasn't already open, open it
                if (!isOpen) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                    question.classList.add('active');
                }
            });
        });

        // Initialize FAQ search functionality
        this.initFaqSearch();
    },
    
    // Initialize FAQ search functionality
    initFaqSearch: function() {
        const searchInput = document.getElementById('faq-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const faqItems = document.querySelectorAll('.faq-item');
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
                
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // If search is cleared, show all items
            if (searchTerm === '') {
                faqItems.forEach(item => {
                    item.style.display = 'block';
                });
            }
        });
    },
    
    // Ensure videos play correctly
    ensureVideosPlay: function() {
        const videos = this.contentArea.querySelectorAll('video');
        videos.forEach(video => {
            // If the video is paused, we should try to play it
            if (video.paused) {
                // Check if the user has manually unmuted the video
                const userUnmuted = video.hasAttribute('data-user-unmuted') && 
                                    video.getAttribute('data-user-unmuted') === 'true';
                
                // Only force mute if the user hasn't explicitly unmuted
                if (!userUnmuted) {
                    video.muted = true;
                }
                
                // Sometimes we need to load/reload the video
                if (video.readyState === 0) {
                    video.load();
                }
                
                // Try to play the video
                const playPromise = video.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Video play prevented by browser:', error);
                        // We'll try one more time, but keep it muted to respect autoplay policies
                        setTimeout(() => {
                            video.muted = true;
                            video.play().catch(e => 
                                console.warn('Second play attempt failed:', e)
                            );
                        }, 1000);
                    });
                }
                
                // We don't need to add additional click/touch handlers if the video 
                // already has an onclick attribute
                if (!video.hasAttribute('onclick') && !video.hasAttribute('data-play-handlers-attached')) {
                    video.setAttribute('data-play-handlers-attached', 'true');
                    
                    // This handler is only for helping autoplay and won't affect sound
                    const playVideo = () => {
                        video.play().catch(e => console.warn('Play after user interaction failed:', e));
                    };
                    
                    video.addEventListener('touchstart', playVideo, { once: true });
                    video.addEventListener('click', playVideo, { once: true });
                }
            }
        });
    },
    
    // Execute scripts found in the loaded content
    executeScripts: function() {
        const scripts = this.contentArea.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    },
    
    // Initialize Play page functionality
    initPlayPage: function() {
        // Main platform selection toggle
        const downloadButton = document.getElementById('show-download-options');
        if (downloadButton) {
            downloadButton.addEventListener('click', function() {
                document.getElementById('download-options').style.display = 'block';
                this.style.display = 'none'; // Hide the download button after clicking
            });
        }
        
        // Platform buttons - Windows, Linux, Reboot
        const platformButtons = ['windows', 'linux', 'reboot'];
        platformButtons.forEach(platform => {
            const button = document.getElementById(`show-${platform}`);
            if (button) {
                button.addEventListener('click', function() {
                    // Hide all platform sections first
                    platformButtons.forEach(p => {
                        const section = document.getElementById(`${p}-section`);
                        if (section) {
                            section.style.display = 'none';
                        }
                    });
                    
                    // Show the selected platform section
                    const section = document.getElementById(`${platform}-section`);
                    if (section) {
                        section.style.display = 'block';
                    }
                });
            }
        });
        
        // GPU Selection for Reboot-to-Play
        document.querySelectorAll('.gpu-option').forEach(button => {
            button.addEventListener('click', function() {
                // Get the target GPU section
                const targetGpu = this.getAttribute('data-target');
                
                // Hide all GPU sections
                document.querySelectorAll('.gpu-section').forEach(section => {
                    section.style.display = 'none';
                });
                
                // Show the selected GPU section
                const targetSection = document.getElementById(`${targetGpu}-section`);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
            });
        });
        
        // NVIDIA Agreement Checkbox Handler
        const nvAgreement = document.getElementById('nvidia-agreement');
        if (nvAgreement) {
            nvAgreement.addEventListener('change', function() {
                // Show or hide download info based on checkbox state
                const downloadInfo = document.getElementById('nvidia-download-info');
                if (downloadInfo) {
                    downloadInfo.style.display = this.checked ? 'block' : 'none';
                }
            });
        }
    }
};

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Register all pages
    Router.add('home', 'home-template');
    Router.add('faq', 'faq-template');
    Router.add('shop', 'shop-template');
    Router.add('play', 'play-template');
    Router.add('account', 'account-template');
    Router.add('tos', 'tos-template');
    Router.add('eula', 'eula-template');
    Router.add('privacy', 'privacy-template');
    Router.add('contact', 'contact-template');
    Router.add('copyright', 'copyright-template');
    
    // Start the router
    Router.init('#page-content');

    // Add a single document-level event listener to help with autoplay on first user interaction
    const handleFirstInteraction = function() {
        // Find all videos and try to play them
        document.querySelectorAll('video').forEach(video => {
            if (video.paused) {
                // Don't force mute if the video has been explicitly unmuted by the user
                if (!video.hasAttribute('data-user-unmuted') || 
                    video.getAttribute('data-user-unmuted') !== 'true') {
                    video.muted = true;
                }
                video.play().catch(e => console.warn('Play failed on user interaction:', e));
            }
        });
        
        // Remove both event listeners after first interaction
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
    };

    // Add the handler to both events
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('click', handleFirstInteraction);
}); 