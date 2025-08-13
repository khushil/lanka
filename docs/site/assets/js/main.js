// LANKA Platform - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = navToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translateY(8px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // Smooth Scroll for Navigation Links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offset = 80; // Height of fixed navbar
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    if (navMenu && navMenu.classList.contains('active')) {
                        navMenu.classList.remove('active');
                    }
                }
            }
        });
    });

    // Active Navigation Highlighting
    const sections = document.querySelectorAll('section[id]');
    
    function highlightNav() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);

    // Intersection Observer for Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        observer.observe(card);
    });

    // Observe doc cards
    document.querySelectorAll('.doc-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        observer.observe(card);
    });

    // Observe steps
    document.querySelectorAll('.step').forEach(step => {
        step.style.opacity = '0';
        step.style.transform = 'translateX(-20px)';
        observer.observe(step);
    });

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0) translateX(0);
            }
        }
        
        .nav-link.active {
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);

    // Copy Code Functionality
    document.querySelectorAll('pre code').forEach(block => {
        // Create copy button
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.8rem;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        // Position parent relatively
        const pre = block.parentElement;
        pre.style.position = 'relative';
        pre.appendChild(button);
        
        // Show button on hover
        pre.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
        });
        
        pre.addEventListener('mouseleave', () => {
            button.style.opacity = '0';
        });
        
        // Copy functionality
        button.addEventListener('click', async () => {
            const text = block.textContent;
            try {
                await navigator.clipboard.writeText(text);
                button.textContent = 'Copied!';
                button.style.background = 'var(--success)';
                
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.style.background = 'var(--primary-color)';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                button.textContent = 'Error';
                button.style.background = 'var(--error)';
            }
        });
    });

    // Typing Animation for Hero Title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        const textWithoutHTML = heroTitle.textContent;
        let currentIndex = 0;
        
        // Clear and rebuild with typing effect
        heroTitle.innerHTML = '';
        
        function typeWriter() {
            if (currentIndex < textWithoutHTML.length) {
                const char = textWithoutHTML.charAt(currentIndex);
                
                // Check if we're at the start of "Intelligence"
                if (textWithoutHTML.substring(currentIndex, currentIndex + 12) === 'Intelligence') {
                    heroTitle.innerHTML += '<span class="gradient-text">Intelligence</span>';
                    currentIndex += 12;
                } else {
                    heroTitle.innerHTML += char;
                    currentIndex++;
                }
                
                setTimeout(typeWriter, 50);
            }
        }
        
        // Start typing after a short delay
        setTimeout(typeWriter, 500);
    }

    // Stats Counter Animation
    const stats = document.querySelectorAll('.stat-value');
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = stat.textContent;
                
                if (target.includes('%')) {
                    const value = parseInt(target);
                    animateCounter(stat, 0, value, '%', 2000);
                } else if (target === 'Zero') {
                    // Keep as is
                } else {
                    const value = parseInt(target);
                    animateCounter(stat, 0, value, '', 2000);
                }
                
                statsObserver.unobserve(stat);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });

    function animateCounter(element, start, end, suffix, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current + suffix;
            
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    // Parallax Effect for Hero Section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = hero.querySelector('::before');
            const speed = 0.5;
            
            hero.style.backgroundPositionY = scrolled * speed + 'px';
        });
    }

    // Add Easter Egg
    let konamiCode = [];
    const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);
        
        if (konamiCode.join(',') === konamiPattern.join(',')) {
            document.body.style.animation = 'rainbow 3s linear infinite';
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes rainbow {
                    0% { filter: hue-rotate(0deg); }
                    100% { filter: hue-rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            
            setTimeout(() => {
                document.body.style.animation = '';
            }, 5000);
        }
    });
});

// Performance Monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            // Log performance metrics (could send to analytics)
            console.log(`${entry.name}: ${entry.duration}ms`);
        }
    });
    
    perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
}

// Service Worker Registration (for offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    });
}