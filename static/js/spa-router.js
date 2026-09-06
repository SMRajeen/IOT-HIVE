/**
 * IoT HIVE - Instant Zero-Reload SPA Router & View Transition Controller
 * Features:
 *  - Intercepts all internal link clicks for 100% zero-reload page switches
 *  - Native View Transitions API support (cinematic crossfade without white flashes)
 *  - Smart Hover Prefetching (< 50ms instant page loads)
 *  - Dynamic page script extraction & re-execution
 *  - Top cyber loading bar indicator
 *  - Full browser history (Back / Forward popstate) support
 *  - Preserves persistent elements (Live CyberChat, Header, Theme settings)
 */

(() => {
  'use strict';

  // In-memory HTML cache: url -> { html: string, title: string, pageId: string, timestamp: number }
  const pageCache = new Map();
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  let isNavigating = false;
  let prefetchTimer = null;

  // -------------------------------------------------------------
  // Top Loading Bar Controller
  // -------------------------------------------------------------
  let progressBar = null;

  function getProgressBar() {
    if (!progressBar) {
      progressBar = document.getElementById('spa-loading-bar');
      if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'spa-loading-bar';
        document.body.appendChild(progressBar);
      }
    }
    return progressBar;
  }

  function startProgress() {
    const bar = getProgressBar();
    bar.classList.add('active');
    bar.style.width = '0%';
    bar.style.opacity = '1';
    requestAnimationFrame(() => {
      bar.style.width = '35%';
      setTimeout(() => {
        if (isNavigating) bar.style.width = '75%';
      }, 150);
    });
  }

  function finishProgress() {
    const bar = getProgressBar();
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.classList.remove('active');
        bar.style.width = '0%';
      }, 250);
    }, 150);
  }

  // -------------------------------------------------------------
  // Link Eligibility Checker
  // -------------------------------------------------------------
  function isEligibleLink(anchor) {
    if (!anchor || anchor.tagName !== 'A') return false;
    const href = anchor.getAttribute('href');
    if (!href) return false;

    // Ignore external, anchor links, javascript, mailto, tel, downloads
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return false;
    }
    if (anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank') {
      return false;
    }
    if (anchor.hasAttribute('data-no-spa') || anchor.closest('[data-no-spa]')) {
      return false;
    }

    try {
      const url = new URL(href, window.location.origin);
      // Only same-origin
      if (url.origin !== window.location.origin) return false;

      // Bypass Django admin URLs
      if (url.pathname.startsWith('/admin/') || url.pathname.startsWith('/django-admin/')) {
        return false;
      }
      // Bypass static files and media downloads
      if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/media/')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // Fetch & Cache Engine
  // -------------------------------------------------------------
  async function fetchPage(urlStr) {
    const cleanUrl = new URL(urlStr, window.location.origin).href;
    const urlObj = new URL(cleanUrl);
    const isDynamicAuthRoute = ['/dashboard', '/project-requests', '/requests', '/profile', '/favorites', '/create-project', '/admin-panel', '/login', '/register'].some(p => urlObj.pathname.startsWith(p));
    const cached = pageCache.get(cleanUrl);

    if (!isDynamicAuthRoute && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached;
    }

    const res = await fetch(cleanUrl, {
      headers: {
        'X-Requested-With': 'IoT-HIVE-SPA',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      },
      credentials: 'same-origin'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch page.`);
    }

    const htmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const mainEl = doc.querySelector('main.main-content') || doc.querySelector('main') || doc.querySelector('#main-content');
    if (!mainEl) {
      throw new Error('Page missing <main> container for SPA swap.');
    }

    // Extract page scripts from inside <main> and <body/footer>
    const scripts = [];
    doc.querySelectorAll('script').forEach(s => {
      const src = s.getAttribute('src');
      // Skip global base scripts that are already loaded in base.html
      if (src && (src.includes('api.js') || src.includes('auth.js') || src.includes('chat.js') || src.includes('spa-router.js') || src.includes('prism.min.js'))) {
        return;
      }
      scripts.push({
        src: src || null,
        code: s.textContent || '',
        type: s.getAttribute('type') || 'text/javascript'
      });
    });

    const pageData = {
      html: mainEl.innerHTML,
      title: doc.title || document.title,
      pageId: doc.body.getAttribute('data-page') || 'page',
      scripts,
      timestamp: Date.now(),
      finalUrl: res.url || cleanUrl
    };

    if (!isDynamicAuthRoute) {
      pageCache.set(cleanUrl, pageData);
    }
    return pageData;
  }

  // -------------------------------------------------------------
  // Prefetching on Hover
  // -------------------------------------------------------------
  function prefetchUrl(urlStr) {
    try {
      const url = new URL(urlStr, window.location.origin);
      if (url.href === window.location.href) return;
      fetchPage(url.href).catch(() => {});
    } catch {}
  }

  // -------------------------------------------------------------
  // Script Execution Engine
  // -------------------------------------------------------------
  async function executePageScripts(scripts) {
    if (!scripts || scripts.length === 0) return;

    for (const s of scripts) {
      if (s.src) {
        await new Promise((resolve) => {
          const scriptEl = document.createElement('script');
          if (s.type) scriptEl.type = s.type;
          scriptEl.src = s.src;
          scriptEl.async = false;
          scriptEl.onload = () => resolve();
          scriptEl.onerror = (err) => {
            console.warn('[SPA Router] Failed to load script:', s.src, err);
            resolve();
          };
          document.body.appendChild(scriptEl);
          // Clean up script tag after execution
          setTimeout(() => scriptEl.remove(), 1500);
        });
      } else {
        const scriptEl = document.createElement('script');
        if (s.type) scriptEl.type = s.type;
        scriptEl.textContent = s.code;
        document.body.appendChild(scriptEl);
        setTimeout(() => scriptEl.remove(), 1500);
      }
    }
  }

  // -------------------------------------------------------------
  // Core Navigation Controller
  // -------------------------------------------------------------
  async function navigate(urlStr, pushToHistory = true) {
    if (isNavigating) return;
    const targetUrl = new URL(urlStr, window.location.origin);

    // If same URL with same search and hash, just scroll
    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) {
      const el = document.querySelector(targetUrl.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    isNavigating = true;
    startProgress();

    try {
      const pageData = await fetchPage(targetUrl.href);

      // DOM Update Callback
      const updateDOM = async () => {
        // Update Title
        if (pageData.title) document.title = pageData.title;

        // Update body data-page attribute
        if (pageData.pageId) document.body.setAttribute('data-page', pageData.pageId);

        // Update Main Container Content
        const mainContainer = document.querySelector('main.main-content') || document.querySelector('main');
        if (mainContainer) {
          mainContainer.innerHTML = pageData.html;
        }

        // Close search modal and mobile drawer if open
        if (window.closeSearchModal) window.closeSearchModal();
        if (window.toggleMobileDrawer) window.toggleMobileDrawer(false);

        // Update Browser History
        if (pushToHistory) {
          window.history.pushState({ url: targetUrl.href }, pageData.title, targetUrl.href);
        }

        // Scroll to top or anchor
        if (targetUrl.hash) {
          const anchorEl = document.querySelector(targetUrl.hash);
          if (anchorEl) {
            anchorEl.scrollIntoView();
          } else {
            window.scrollTo(0, 0);
          }
        } else {
          window.scrollTo(0, 0);
        }

        // Update Active Nav Link highlights
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
          const href = link.getAttribute('href');
          if (href === '/') {
            link.classList.toggle('active', currentPath === '/');
          } else if (href && href !== '#') {
            link.classList.toggle('active', currentPath.startsWith(href));
          }
        });

        // Re-run code highlighting if available
        if (window.Prism && window.Prism.highlightAll) {
          window.Prism.highlightAll();
        }

        // Execute newly extracted scripts for the current page and await completion
        await executePageScripts(pageData.scripts);

        // Fire lifecycle events so page listeners re-trigger immediately
        document.dispatchEvent(new Event('DOMContentLoaded'));
        window.dispatchEvent(new CustomEvent('page:loaded', { detail: { url: targetUrl.href, pageId: pageData.pageId } }));
      };

      // Use Native View Transition if supported
      if (document.startViewTransition) {
        const transition = document.startViewTransition(async () => {
          await updateDOM();
        });
        await transition.finished;
      } else {
        await updateDOM();
      }

    } catch (err) {
      console.warn('[SPA Router] Client-side navigation fallback to standard load:', err);
      window.location.href = targetUrl.href;
    } finally {
      isNavigating = false;
      finishProgress();
    }
  }

  // -------------------------------------------------------------
  // Event Delegation Listeners
  // -------------------------------------------------------------
  function setupEventListeners() {
    // 1. Intercept Click Events
    document.addEventListener('click', (e) => {
      // Don't intercept if modifier keys are pressed (open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;

      const anchor = e.target.closest('a');
      if (!anchor || !isEligibleLink(anchor)) return;

      e.preventDefault();
      const href = anchor.getAttribute('href');
      navigate(href, true);
    });

    // 2. Hover / Touch Prefetching
    document.addEventListener('mouseover', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !isEligibleLink(anchor)) return;

      clearTimeout(prefetchTimer);
      prefetchTimer = setTimeout(() => {
        prefetchUrl(anchor.getAttribute('href'));
      }, 60);
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !isEligibleLink(anchor)) return;
      prefetchUrl(anchor.getAttribute('href'));
    }, { passive: true });

    // 3. Popstate (Back / Forward buttons)
    window.addEventListener('popstate', () => {
      navigate(window.location.href, false);
    });
  }

  // -------------------------------------------------------------
  // Public Global API
  // -------------------------------------------------------------
  window.IoTHiveRouter = {
    navigate: (url) => navigate(url, true),
    prefetch: prefetchUrl,
    clearCache: () => pageCache.clear()
  };

  window.navigate = window.IoTHiveRouter.navigate;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
})();
