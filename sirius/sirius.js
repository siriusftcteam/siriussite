const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('nav a');
const scrollTopBtn = document.querySelector('.scroll-top');

const OBSERVER_CONFIG = { threshold: 0.45, rootMargin: '0px 0px -50px 0px' };
const REVEAL_CONFIG = { threshold: 0.2, rootMargin: '0px 0px -30px 0px' };

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const closeMobileMenu = () => {};

if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.remove('active'));
      const activeLink = document.querySelector(`nav a[href="#${entry.target.id}"]`);
      if (activeLink) activeLink.classList.add('active');
    });
  }, OBSERVER_CONFIG);

  sections.forEach(section => section.id && navObserver.observe(section));
}

function setupScrollTopButton() {
  if (!scrollTopBtn) return;
  const toggle = () => scrollTopBtn.classList.toggle('visible', window.scrollY > 500);

  scrollTopBtn.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileMenu();
  });

  window.addEventListener('scroll', debounce(toggle, 100));
  toggle();
}

const lazyImages = document.querySelectorAll('img[loading="lazy"]');
if (lazyImages.length && 'IntersectionObserver' in window) {
  const lazyObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('loaded');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px 50px 0px' });

  lazyImages.forEach(img => lazyObserver.observe(img));
}

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('reveal'));
  }, REVEAL_CONFIG);

  sections.forEach(section => revealObserver.observe(section));
} else {
  sections.forEach(s => s.classList.add('reveal'));
}

function setupImageErrorHandling() {
  document.addEventListener('error', e => {
    const target = e.target;
    if (target && target.tagName === 'IMG') {
      if (typeof target.closest === 'function' && target.closest('#lightbox-overlay')) {
        return;
      }
      target.classList.add('img-error');
    }
  }, true);
}

function setupGallery() {
  const gallery = document.querySelector('.gallery-scroll');
  if (!gallery) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let isDragging = false;

  gallery.addEventListener('mousedown', e => {
    isDown = true;
    isDragging = false;
    startX = e.clientX - gallery.getBoundingClientRect().left;
    scrollLeft = gallery.scrollLeft;
  });

  window.addEventListener('mouseup', () => isDown = false);
  gallery.addEventListener('mouseleave', () => isDown = false);

  gallery.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    isDragging = true;
    const x = e.clientX - gallery.getBoundingClientRect().left;
    gallery.scrollLeft = scrollLeft - (x - startX) * 1.2;
  });

  gallery.addEventListener('touchstart', e => {
    const t = e.touches[0];
    isDown = true;
    isDragging = false;
    startX = t.clientX - gallery.getBoundingClientRect().left;
    scrollLeft = gallery.scrollLeft;
  }, { passive: true });

  gallery.addEventListener('touchmove', e => {
    if (!isDown) return;
    const t = e.touches[0];
    if (!t) return;
    isDragging = true;
    const x = t.clientX - gallery.getBoundingClientRect().left;
    gallery.scrollLeft = scrollLeft - (x - startX) * 1.2;
  }, { passive: true });

  gallery.addEventListener('touchend', () => { isDown = false; });

  gallery.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      gallery.scrollLeft += e.deltaY * 5;
    }
  }, { passive: false });

  // Создаем лайтбокс если его еще нет
  if (!document.getElementById('lightbox-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.innerHTML = `
      <div id="lb-content" role="dialog" aria-modal="true" aria-label="Image view">
        <button id="lb-close" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img id="lb-img" src="" alt="">
      </div>`;
    document.body.appendChild(overlay);

    const lbImg = overlay.querySelector('#lb-img');
    const lbClose = overlay.querySelector('#lb-close');

    const closeLightbox = () => {
      overlay.classList.remove('active');
      overlay.classList.remove('loading');
      lbImg.src = '';
      lbImg.alt = '';
      lbImg.classList.remove('loaded', 'img-error');
      // Сбрасываем флаг перетаскивания
      isDragging = false;
    };

    lbClose.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', e => e.target === overlay && closeLightbox());
    
    // Закрытие по Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeLightbox();
      }
    });

    gallery.addEventListener('click', e => {
      if (isDragging) return;
      const img = e.target.closest('img');
      if (!img) return;

      // Сбрасываем классы и показываем загрузку
      overlay.classList.remove('active');
      overlay.classList.add('loading');
      lbImg.classList.remove('loaded', 'img-error');
      lbImg.src = '';
      lbImg.alt = '';

      // Обработчики загрузки изображения
      const onLoad = () => {
        lbImg.removeEventListener('load', onLoad);
        lbImg.removeEventListener('error', onError);
        lbImg.classList.add('loaded');
        overlay.classList.remove('loading');
        overlay.classList.add('active');
      };
      
      const onError = () => {
        lbImg.removeEventListener('load', onLoad);
        lbImg.removeEventListener('error', onError);
        lbImg.classList.add('img-error');
        overlay.classList.remove('loading');
        overlay.classList.add('active');
        lbImg.alt = 'Image failed to load';
      };

      lbImg.addEventListener('load', onLoad);
      lbImg.addEventListener('error', onError);

      // Загружаем изображение
      lbImg.src = img.src;
      lbImg.alt = img.alt || 'Gallery image';
    });
  }
}

// Плавная прокрутка для якорных ссылок
const anchorLinks = document.querySelectorAll('nav a[href^="#"]');
anchorLinks.forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const target = document.getElementById(href.slice(1));
    if (target) {
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 20);
      window.scrollTo({ top, behavior: 'smooth' });
    }
    closeMobileMenu();
  });
});

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  setupScrollTopButton();
  setupImageErrorHandling();
  setupGallery();

  // Обновление года в футере
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  console.log('Sirius FTC website initialized');
});