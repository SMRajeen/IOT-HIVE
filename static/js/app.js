/**
 * IoT HIVE - Core JavaScript Application Engine
 * Global State, Cart Drawer, Command Palette, Bookmarking & Notification System
 */

(function() {
  'use strict';

  // State Management with LocalStorage persistence
  const AppState = {
    cart: JSON.parse(localStorage.getItem('iothive_cart') || '[]'),
    favorites: JSON.parse(localStorage.getItem('iothive_favorites') || '["Quantum-X Environmental Array v2", "Autonomous Surveillance Rover"]'),
    
    saveCart() {
      localStorage.setItem('iothive_cart', JSON.stringify(this.cart));
      updateCartUI();
    },
    
    saveFavorites() {
      localStorage.setItem('iothive_favorites', JSON.stringify(this.favorites));
      updateFavoritesUI();
    },
    
    addToCart(item) {
      const existing = this.cart.find(i => i.id === item.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        this.cart.push({ ...item, quantity: 1 });
      }
      this.saveCart();
      showToast(`Added "${item.title}" to Deployment Cart`, 'success');
      openCartDrawer();
    },

    removeFromCart(id) {
      this.cart = this.cart.filter(i => i.id !== id);
      this.saveCart();
      showToast('Item removed from cart', 'info');
    },

    clearCart() {
      this.cart = [];
      this.saveCart();
      showToast('Deployment Cart cleared', 'info');
    },

    toggleFavorite(title) {
      const index = this.favorites.indexOf(title);
      if (index > -1) {
        this.favorites.splice(index, 1);
        showToast(`Removed "${title}" from Bookmarks`, 'info');
      } else {
        this.favorites.push(title);
        showToast(`Saved "${title}" to Bookmarked Nodes`, 'success');
      }
      this.saveFavorites();
    },

    isFavorite(title) {
      return this.favorites.includes(title);
    }
  };

  // Expose AppState globally
  window.AppState = AppState;

  // --------------------------------------------------------------------------
  // Toast Notification System
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="color: var(--primary-container)">${icon}</span>
      <span style="font-family: var(--font-mono); font-size: 0.82rem;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('exit');
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
  window.showToast = showToast;

  // --------------------------------------------------------------------------
  // Cart Drawer UI & Calculations
  // --------------------------------------------------------------------------
  function updateCartUI() {
    const badge = document.querySelectorAll('.cart-badge-count');
    const totalItems = AppState.cart.reduce((sum, i) => sum + (i.quantity || 1), 0);
    
    badge.forEach(el => {
      el.textContent = totalItems;
      el.style.display = totalItems > 0 ? 'flex' : 'none';
    });

    const itemsContainer = document.getElementById('cart-drawer-items');
    const totalElement = document.getElementById('cart-drawer-subtotal');

    if (itemsContainer) {
      if (AppState.cart.length === 0) {
        itemsContainer.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--border-bright); margin-bottom: 12px;">shopping_bag</span>
            <p style="font-family: var(--font-headline); font-size: 1rem; color: var(--text-secondary); margin-bottom: 6px;">Cart is Empty</p>
            <p style="font-size: 0.85rem;">Browse the Hardware Exchange to deploy components.</p>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = AppState.cart.map(item => `
          <div class="cart-item-row" style="display: flex; gap: 12px; align-items: center; padding: 12px; background: var(--bg-surface-container); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 8px;">
            <img src="${item.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuATxvP9UfYgnYXE1gUiDPylXqmp7jf_0Tz-RK-7sfbNkHWisA2H8b2SJncwmh25ZrMKzncAVO_anlwl22LmhXFiofQQLitTWaTlL2KRbwDC4w7fuF8e4SSsxlqAHnxppwxJQPBPT6oNYJMNvgBLLzF3OP2rMDhli70fQZj7j0voK07pnlnCcGPi8oXsxQgSNc9DytkRhTT_sGBDfTbjIOLMQ3lk6HKuYxh3cNwZBQZNlGVfp278cMel'}" style="width: 52px; height: 52px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-subtle);" alt="${item.title}">
            <div style="flex: 1; min-width: 0;">
              <h5 style="font-family: var(--font-headline); font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${item.title}</h5>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--primary-container);">${item.price} HVT x ${item.quantity || 1}</span>
            </div>
            <button onclick="AppState.removeFromCart('${item.id}')" class="btn-icon" style="width: 32px; height: 32px;" title="Remove">
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--text-dim);">close</span>
            </button>
          </div>
        `).join('');
      }
    }

    if (totalElement) {
      const subtotal = AppState.cart.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || 1)), 0);
      totalElement.textContent = `${subtotal.toLocaleString()} HVT`;
    }
  }

  function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      updateCartUI();
    }
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;

  // --------------------------------------------------------------------------
  // Bookmarks / Favorites Synchronization
  // --------------------------------------------------------------------------
  function updateFavoritesUI() {
    const favButtons = document.querySelectorAll('[data-favorite-title]');
    favButtons.forEach(btn => {
      const title = btn.getAttribute('data-favorite-title');
      const isFav = AppState.isFavorite(title);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = isFav ? "'FILL' 1" : "'FILL' 0";
        icon.style.color = isFav ? 'var(--primary-container)' : 'inherit';
      }
    });
  }

  // --------------------------------------------------------------------------
  // Command Palette / Search Modal
  // --------------------------------------------------------------------------
  function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
      modal.classList.add('open');
      const input = modal.querySelector('input');
      if (input) setTimeout(() => input.focus(), 100);
    }
  }

  function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) modal.classList.remove('open');
  }

  window.openSearchModal = openSearchModal;
  window.closeSearchModal = closeSearchModal;

  // --------------------------------------------------------------------------
  // Mobile Menu Toggle
  // --------------------------------------------------------------------------
  function toggleMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    if (drawer) {
      drawer.classList.toggle('open');
    }
  }
  window.toggleMobileMenu = toggleMobileMenu;

  // --------------------------------------------------------------------------
  // Global Keyboard Shortcuts
  // --------------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K for Search Palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.getElementById('search-modal');
      if (modal && modal.classList.contains('open')) {
        closeSearchModal();
      } else {
        openSearchModal();
      }
    }
    // ESC to close any modal or drawer
    if (e.key === 'Escape') {
      closeSearchModal();
      closeCartDrawer();
      const openModals = document.querySelectorAll('.modal-backdrop.open');
      openModals.forEach(m => m.classList.remove('open'));
    }
  });

  // --------------------------------------------------------------------------
  // App Initialization
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    updateFavoritesUI();

    // Inject Search Modal & Cart Drawer if not in HTML
    if (!document.getElementById('cart-drawer')) {
      const drawerHtml = `
        <div id="cart-overlay" class="cart-drawer-overlay" onclick="closeCartDrawer()"></div>
        <div id="cart-drawer" class="cart-drawer">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined text-primary" style="color: var(--primary-container)">shopping_bag</span>
              <h3 style="font-size: 1.1rem;">Deployment Cart</h3>
            </div>
            <button onclick="closeCartDrawer()" class="btn-icon">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div id="cart-drawer-items" class="modal-body" style="flex: 1; overflow-y: auto;"></div>
          <div class="modal-footer" style="flex-direction: column; align-items: stretch; gap: 12px; background: var(--bg-surface-lowest);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono);">
              <span style="color: var(--text-muted); font-size: 0.85rem;">TOTAL ASSETS</span>
              <span id="cart-drawer-subtotal" style="color: var(--text-primary); font-size: 1.15rem; font-weight: 700;">0 HVT</span>
            </div>
            <button onclick="showToast('Deployment sequence initialized! Routing to gateway...', 'success'); closeCartDrawer();" class="btn btn-primary" style="width: 100%;">
              <span class="material-symbols-outlined">rocket_launch</span>
              Checkout & Provision
            </button>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', drawerHtml);
    }

    if (!document.getElementById('search-modal')) {
      const searchModalHtml = `
        <div id="search-modal" class="modal-backdrop" onclick="if(event.target === this) closeSearchModal()">
          <div class="modal-box" style="max-width: 580px;">
            <div style="padding: 16px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 12px;">
              <span class="material-symbols-outlined" style="color: var(--text-muted)">search</span>
              <input type="text" id="global-search-input" placeholder="Search nodes, protocols, architectures, or docs..." style="width: 100%; font-size: 1rem; color: var(--text-primary);" oninput="handleGlobalSearch(this.value)">
              <button onclick="closeSearchModal()" class="btn-icon" style="width: 32px; height: 32px;">
                <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
              </button>
            </div>
            <div id="search-results-list" style="padding: 12px; max-height: 360px; overflow-y: auto;">
              <div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem; font-family: var(--font-mono);">SUGGESTED QUERIES</div>
              <a href="marketplace.html?category=Sensors" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); text-decoration: none; color: var(--text-secondary); transition: background 0.15s;">
                <span class="material-symbols-outlined" style="color: var(--primary-container)">memory</span>
                <div>
                  <div style="font-weight: 600; color: var(--text-primary);">Quantum-X Environmental Array v2</div>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Atmospheric sensor with AI edge coprocessor</span>
                </div>
              </a>
              <a href="project-details.html" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); text-decoration: none; color: var(--text-secondary); transition: background 0.15s;">
                <span class="material-symbols-outlined" style="color: var(--primary-container)">smart_toy</span>
                <div>
                  <div style="font-weight: 600; color: var(--text-primary);">Autonomous Surveillance Rover</div>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Robotics platform with Jetson Nano & 4K LiDAR</span>
                </div>
              </a>
              <a href="marketplace.html?category=Edge" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); text-decoration: none; color: var(--text-secondary); transition: background 0.15s;">
                <span class="material-symbols-outlined" style="color: var(--primary-container)">router</span>
                <div>
                  <div style="font-weight: 600; color: var(--text-primary);">Nexus Protocol Router AX-7</div>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">High-throughput multi-protocol LoRaWAN gateway</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', searchModalHtml);
    }
  });

  window.handleGlobalSearch = function(query) {
    const results = document.getElementById('search-results-list');
    if (!results) return;
    if (!query.trim()) {
      results.innerHTML = `
        <div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem; font-family: var(--font-mono);">SUGGESTED QUERIES</div>
        <a href="marketplace.html" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md);">
          <span class="material-symbols-outlined" style="color: var(--primary-container)">memory</span>
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">Browse Hardware Exchange</div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">View all 2,400+ vetted enterprise nodes</span>
          </div>
        </a>
      `;
      return;
    }
    // Simple filter simulation
    results.innerHTML = `
      <div style="padding: 8px 12px; color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-mono);">SEARCH RESULTS FOR "${query.toUpperCase()}"</div>
      <a href="marketplace.html?search=${encodeURIComponent(query)}" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); background: rgba(255,83,87,0.06);">
        <span class="material-symbols-outlined" style="color: var(--primary-container)">travel_explore</span>
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">Search Marketplace for "${query}"</div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Execute comprehensive query across all categories</span>
        </div>
      </a>
    `;
  };

})();
