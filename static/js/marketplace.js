/**
 * IoT HIVE - Marketplace Controller
 * Phase 1: Hardware Filtering by Category, Microcontroller & Difficulty
 * Phase 2 & 3: LKR Formatting & Star Rating Badges
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  const grid = document.getElementById('marketplace-grid');
  const searchInput = document.getElementById('marketplace-search');
  const sortSelect = document.getElementById('marketplace-sort');
  const difficultySelect = document.getElementById('marketplace-difficulty');
  const resultsLabel = document.getElementById('results-count-label');
  const categoryPills = document.getElementById('category-pills');
  const mcuPills = document.getElementById('mcu-pills');

  let activeCategory = 'all';
  let activeMCU = 'all';
  let debounceTimer = null;

  // Read URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('category')) activeCategory = urlParams.get('category');
  if (urlParams.get('mcu')) activeMCU = urlParams.get('mcu');
  if (urlParams.get('search') && searchInput) searchInput.value = urlParams.get('search');

  function formatLKR(amount) {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function renderCategoryPills(categories) {
    if (!categoryPills) return;
    let html = `<button class="filter-pill ${activeCategory === 'all' ? 'active' : ''}" data-slug="all">All Categories</button>`;
    categories.forEach(cat => {
      html += `<button class="filter-pill ${activeCategory === cat.slug ? 'active' : ''}" data-slug="${cat.slug}">${auth.escapeHtml(cat.name)}</button>`;
    });
    categoryPills.innerHTML = html;

    categoryPills.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.slug;
        loadMarketplaceProjects();
      });
    });
  }

  function initMCUPills() {
    if (!mcuPills) return;
    mcuPills.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        mcuPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMCU = btn.dataset.mcu;
        loadMarketplaceProjects();
      });
    });
  }

  async function loadCategories() {
    try {
      const data = await api.categories.list();
      const categories = Array.isArray(data) ? data : (data.results || []);
      renderCategoryPills(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  function cardHtml(project) {
    const img = project.images?.[0]?.image ? api.resolveUrl(project.images[0].image) : '';
    const price = project.is_free ? 'Free / Open' : formatLKR(project.price);
    const creator = project.seller_name || project.seller_username || 'Maker';
    const mcu = project.microcontroller || 'MCU';
    const difficulty = project.difficulty || 'intermediate';
    const bomCount = (project.bom_items || []).length;
    const reviewCount = project.review_count || 0;
    const avgRating = project.average_rating ? Number(project.average_rating).toFixed(1) : null;

    return `
      <div class="card-cyber project-node-card" onclick="location.href='/project/${project.id}/'" style="cursor: pointer; display: flex; flex-direction: column; height: 100%; transition: transform 0.2s, border-color 0.2s;">
        <div class="node-thumb-box" style="position: relative; height: 190px; background: var(--bg-surface-lowest); border-radius: 6px; overflow: hidden; box-shadow: var(--shadow-neu-inset-sm); flex-shrink: 0;">
          ${img
            ? `<img src="${img}" alt="${auth.escapeHtml(project.title)}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface-high); color: var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size: 44px; color: var(--primary);">memory</span>
                <span style="font-size: 0.8rem; margin-top: 6px; font-family: var(--font-mono);">SMART HARDWARE</span>
               </div>`
          }
          ${project.featured ? `
            <div style="position: absolute; top: 10px; right: 10px; background: var(--primary); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono); box-shadow: 0 0 12px var(--primary-glow); z-index: 2;">
              FEATURED
            </div>
          ` : ''}
        </div>

        <div style="padding: 18px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="flex: 1; display: flex; flex-direction: column;">
            
            <!-- Row 1: Category & Difficulty Level - Perfectly Aligned Side-by-Side -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
              <span class="tag-mono" style="background: var(--bg-surface-high); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">
                ${auth.escapeHtml(project.category_name || 'Hardware')}
              </span>
              <span class="hardware-chip difficulty-${difficulty}" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; margin: 0; flex-shrink: 0; font-weight: 600;">
                ${difficulty.toUpperCase()}
              </span>
            </div>

            <!-- Row 2: Microcontroller & BOM Parts Count -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 10px; min-height: 24px;">
              ${project.microcontroller ? `
                <span class="hardware-chip" style="font-size: 0.72rem; max-width: ${bomCount > 0 ? '70%' : '100%'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <span class="material-symbols-outlined" style="font-size: 12px;">developer_board</span>
                  ${auth.escapeHtml(mcu)}
                </span>
              ` : '<div></div>'}
              ${bomCount > 0 ? `
                <span class="tag-mono text-xs" style="color: var(--text-muted); font-size: 0.72rem; flex-shrink: 0;">${bomCount} Parts</span>
              ` : ''}
            </div>

            <!-- Row 3: Creator & Real Rating (No Default 5 Star) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; min-height: 20px;">
              <div style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">By ${auth.escapeHtml(creator)}</div>
              ${reviewCount > 0 && avgRating ? `
                <div style="display: flex; align-items: center; gap: 3px; font-size: 0.78rem; font-family: var(--font-mono); color: #ffb700; flex-shrink: 0;">
                  <span class="material-symbols-outlined" style="font-size: 13px;">star</span>
                  <strong>${avgRating}</strong>
                  <span style="color: var(--text-muted);">(${reviewCount})</span>
                </div>
              ` : `
                <span style="color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-mono);">No reviews</span>
              `}
            </div>

            <!-- Row 4: Title -->
            <h3 style="font-size: 1.08rem; margin-bottom: 8px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.8rem;">${auth.escapeHtml(project.title)}</h3>
            
            <!-- Row 5: Short Description -->
            <p style="color: var(--text-muted); font-size: 0.86rem; line-height: 1.45; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.5rem;">
              ${auth.escapeHtml(project.short_description || '')}
            </p>
          </div>

          <!-- Row 6: Price & CTA -->
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: auto; gap: 10px;">
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-family: var(--font-mono); margin-bottom: 2px;">PRICE</div>
              <span class="font-bold font-mono" style="color: var(--primary); font-size: 1.12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${price}</span>
            </div>
            <span class="btn btn-secondary btn-sm" style="flex-shrink: 0; white-space: nowrap; padding: 6px 12px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span>
              View Specs
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSkeletonCards() {
    if (!grid) return;
    grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="card-cyber" style="height: 350px; display: flex; flex-direction: column; background: var(--bg-surface-low); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; opacity: 0.7;">
        <div style="height: 190px; background: var(--bg-surface-high); border-bottom: 1px solid var(--border-subtle);"></div>
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 10px; flex: 1;">
          <div style="height: 14px; width: 40%; background: var(--bg-surface-high); border-radius: 4px;"></div>
          <div style="height: 20px; width: 85%; background: var(--bg-surface-high); border-radius: 4px;"></div>
          <div style="height: 14px; width: 95%; background: var(--bg-surface-high); border-radius: 4px; margin-top: auto;"></div>
        </div>
      </div>
    `).join('');
  }

  async function loadMarketplaceProjects() {
    if (!grid) return;
    
    // Only show skeleton if grid is currently empty or has only placeholder
    if (!grid.children.length || grid.querySelector('.card-cyber[style*="opacity: 0.7"]') || grid.querySelector('.material-symbols-outlined.spin')) {
      renderSkeletonCards();
    }

    const q = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') {
      q.set('category', activeCategory);
    }
    if (activeMCU && activeMCU !== 'all') {
      q.set('mcu', activeMCU);
    }
    const diff = difficultySelect ? difficultySelect.value : 'all';
    if (diff && diff !== 'all') {
      q.set('difficulty', diff);
    }
    const query = searchInput ? searchInput.value.trim() : '';
    if (query) {
      q.set('search', query);
    }
    const sort = sortSelect ? sortSelect.value : 'latest';
    if (sort === 'price-asc') q.set('ordering', 'price-asc');
    if (sort === 'price-desc') q.set('ordering', 'price-desc');
    if (sort === 'popular') q.set('ordering', 'popular');
    if (sort === 'featured') q.set('featured', 'true');

    // Update browser URL query
    const newUrl = `${window.location.pathname}${q.toString() ? `?${q.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);

    try {
      const data = await api.projects.list(Object.fromEntries(q.entries()));
      const projects = Array.isArray(data) ? data : (data.results || []);

      if (resultsLabel) {
        resultsLabel.textContent = `Showing ${projects.length} hardware project${projects.length === 1 ? '' : 's'}`;
      }

      if (!projects.length) {
        let emptyActionHtml = '';
        if (currentRole === 'buyer') {
          emptyActionHtml = `
            <a href="/bounties/" class="btn btn-primary">
              <span class="material-symbols-outlined">post_add</span>
              Post a Custom Hardware Bounty
            </a>
          `;
        } else {
          emptyActionHtml = `
            <a href="/create-project/" class="btn btn-primary">
              <span class="material-symbols-outlined">add</span>
              Share a Project
            </a>
          `;
        }

        grid.innerHTML = `
          <div class="card-cyber" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
            <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-muted);">search_off</span>
            </div>
            <h3 style="margin-bottom: 8px;">No Matching Projects Found</h3>
            <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 20px; font-size: 0.95rem;">
              ${query || activeCategory !== 'all' || activeMCU !== 'all' ? 'Try adjusting your microcontroller filters or category selections to explore more projects.' : 'There are currently no projects listed in this view.'}
            </p>
            ${emptyActionHtml}
          </div>
        `;
        return;
      }

      grid.innerHTML = projects.map(cardHtml).join('');
    } catch (error) {
      grid.innerHTML = `
        <div class="card-cyber" style="grid-column: 1 / -1; padding: 32px; text-align: center;">
          <p style="color: var(--status-warning);">Unable to load marketplace projects at the moment.</p>
        </div>
      `;
    }
  }

  let currentRole = 'both';

  async function updateMarketplaceRoleUI() {
    const topAction = document.getElementById('marketplace-top-action');
    if (!topAction) return;

    try {
      const user = await auth.getUser();
      if (!user) return;
      currentRole = (user.role || 'both').toLowerCase();

      if (currentRole === 'buyer') {
        topAction.innerHTML = `
          <a href="/bounties/" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 18px;">post_add</span>
            Post a Bounty / Request
          </a>
        `;
      } else {
        topAction.innerHTML = `
          <a href="/create-project/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
            Share a Project
          </a>
        `;
      }
    } catch (e) {}
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadMarketplaceProjects, 250);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', loadMarketplaceProjects);
  }

  if (difficultySelect) {
    difficultySelect.addEventListener('change', loadMarketplaceProjects);
  }

  function initMarketplace() {
    if (document.getElementById('marketplace-grid')) {
      initMCUPills();
      updateMarketplaceRoleUI();
      loadCategories();
      loadMarketplaceProjects();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarketplace);
  } else {
    initMarketplace();
  }

  window.addEventListener('page:loaded', () => {
    if (document.getElementById('marketplace-grid')) {
      initMarketplace();
    }
  });
})();

