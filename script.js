// Rolan Ice Cream App - JavaScript for PWA and Mobile Functionality

// DOM Elements
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const cartNotification = document.getElementById('cartNotification');
const cartMessage = document.getElementById('cartMessage');
const closeNotification = document.getElementById('closeNotification');
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const dismissInstall = document.getElementById('dismissInstall');
const addToCartButtons = document.querySelectorAll('.add-to-cart');
const navLinks = document.querySelectorAll('.nav-link');

// App State
let cart = [];
let deferredPrompt;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeCart();
    initializePWA();
    initializeScrollEffects();
});

// Navigation Functions
function initializeNavigation() {
    // Mobile menu toggle
    navToggle.addEventListener('click', function() {
        toggleMobileMenu();
    });

    // Close menu when clicking on links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeMobileMenu();
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav')) {
            closeMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    navToggle.classList.remove('active');
    navMenu.classList.remove('active');
}

// Smooth scroll to sections
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = section.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
    closeMobileMenu();
}

// Cart Functions
function initializeCart() {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('rolanCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }

    // Add event listeners to cart buttons
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const menuItem = this.closest('.menu-item');
            const itemName = menuItem.querySelector('h4').textContent;
            const itemPrice = menuItem.querySelector('.price').textContent;
            const itemImage = menuItem.querySelector('.item-image').textContent;
            
            addToCart({
                name: itemName,
                price: itemPrice,
                image: itemImage,
                id: Date.now() + Math.random()
            });
        });
    });

    // Close notification
    closeNotification.addEventListener('click', function() {
        hideCartNotification();
    });
}

function addToCart(item) {
    cart.push(item);
    saveCart();
    showCartNotification(`تم إضافة ${item.name} للسلة!`);
    
    // Add haptic feedback on mobile
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

function saveCart() {
    localStorage.setItem('rolanCart', JSON.stringify(cart));
}

function showCartNotification(message) {
    cartMessage.textContent = message;
    cartNotification.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        hideCartNotification();
    }, 3000);
}

function hideCartNotification() {
    cartNotification.classList.remove('show');
}

// PWA Functions
function initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
        hideInstallBanner();
        showCartNotification('تم تثبيت التطبيق بنجاح! 🎉');
    });

    // Install banner events
    installBtn.addEventListener('click', handleInstallClick);
    dismissInstall.addEventListener('click', hideInstallBanner);
}

function showInstallBanner() {
    // Only show if not already installed and user hasn't dismissed recently
    const dismissed = localStorage.getItem('installBannerDismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (!dismissed && !isStandalone) {
        installBanner.style.display = 'block';
    }
}

function hideInstallBanner() {
    installBanner.style.display = 'none';
    localStorage.setItem('installBannerDismissed', Date.now());
}

async function handleInstallClick() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        deferredPrompt = null;
        hideInstallBanner();
    }
}

// Scroll Effects
function initializeScrollEffects() {
    // Active navigation highlighting
    window.addEventListener('scroll', updateActiveNavigation);
    
    // Parallax and reveal animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe sections for animations
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

function updateActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            if (navLink) {
                navLink.classList.add('active');
            }
        }
    });
}

// Utility Functions
function formatPrice(price) {
    return price.replace(/\d+/, (match) => {
        return new Intl.NumberFormat('ar-SA').format(match);
    });
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'رولان آيس كريم',
            text: 'أفضل الآيس كريم والمشروبات',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showCartNotification('تم نسخ الرابط للحافظة!');
        });
    }
}

// Touch and Gesture Handling
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Swipe detection (minimum 50px movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
            // Swipe left (in RTL, this is swipe right in UI)
            if (navMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        } else {
            // Swipe right (in RTL, this is swipe left in UI)
            // Could trigger menu open from edge
        }
    }

    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });

// Performance Monitoring
function reportWebVitals() {
    // Web Vitals reporting (if library is loaded)
    if (typeof webVitals !== 'undefined') {
        webVitals.getCLS(console.log);
        webVitals.getFID(console.log);
        webVitals.getLCP(console.log);
    }
}

// Error Handling
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    // Could send error reports to analytics service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Could send error reports to analytics service
});

// Online/Offline Handling
window.addEventListener('online', () => {
    showCartNotification('تم استعادة الاتصال بالإنترنت! 🌐');
});

window.addEventListener('offline', () => {
    showCartNotification('أنت الآن في وضع عدم الاتصال 📱');
});

// Keyboard Navigation Support
document.addEventListener('keydown', (e) => {
    // Escape key closes mobile menu
    if (e.key === 'Escape') {
        closeMobileMenu();
        hideCartNotification();
    }
    
    // Enter or space on focused buttons
    if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused && focused.classList.contains('btn')) {
            e.preventDefault();
            focused.click();
        }
    }
});

// Accessibility enhancements
function enhanceAccessibility() {
    // Add proper ARIA labels
    navToggle.setAttribute('aria-label', 'تبديل القائمة');
    navToggle.setAttribute('aria-expanded', 'false');
    
    // Update aria-expanded when menu toggles
    const originalToggle = toggleMobileMenu;
    window.toggleMobileMenu = function() {
        originalToggle();
        const isExpanded = navMenu.classList.contains('active');
        navToggle.setAttribute('aria-expanded', isExpanded.toString());
    };
}

// Initialize accessibility enhancements
enhanceAccessibility();

// Export functions for global use
window.scrollToSection = scrollToSection;
window.shareApp = shareApp;

// Performance optimization - lazy loading images if needed
function initializeLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
        // Native lazy loading is supported
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    } else {
        // Fallback for browsers without native lazy loading
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyLoading);
} else {
    initializeLazyLoading();
}