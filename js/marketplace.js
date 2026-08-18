(() => {
  'use strict';
  const api = window.IoTHiveAPI;
  const auth = window.IoTHiveAuth;
  if (!api || !auth) return;

  const grid = document.getElementById('marketplace-grid');
  const searchInput = document.getElementById('marketplace-search');
  const sortSelect = document.getElementById('marketplace-sort');
  const resultsLabel = document.getElementById('results-count-label');
  const categoryPills = document.getElementById('category-pills');

  let activeCategory = 'all';
  let currentRole = 'both';
  let debounceTimer = null;

  // Read URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('category')) activeCategory = urlParams.get('category');
  if (urlParams.get('search') && searchInput) searchInput.value = urlParams.get('search');

  function renderPills(categories) {
    if (!categoryPills) return;
    let html = `<button class="filter-pill ${activeCategory === 'all' ? 'active' : ''}" data-slug="all">All Projects</button>`;
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

  async function loadCategories() {
    try {
      const data = await api.request('categories/');
      const categories = Array.isArray(data) ? data : (data.results || []);
      renderPills(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  function cardHtml(project) {
    const img = project.images?.[0]?.image ? api.resolveUrl(project.images[0].image) : '';
    const price = project.is_free ? 'Free' : `$${Number(project.price || 0).toFixed(2)}`;
    const creator = project.seller_name || project.seller_username || 'Maker';

    return `
      <div class="card-cyber project-node-card" onclick="location.href='/project/${project.id}/'" style="cursor: pointer; display: flex; flex-direction: column;">
        <div class="node-thumb-box" style="position: relative; height: 190px; background: #000; border-radius: 6px; overflow: hidden;">
          ${img
            ? `<img src="${img}" alt="${auth.escapeHtml(project.title)}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface-high); color: var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size: 40px; color: var(--primary);">memory</span>
                <span style="font-size: 0.8rem; margin-top: 6px;">Smart Hardware</span>
               </div>`
          }
          <div class="tag-mono" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); padding: 4px 8px; border-radius: 4px;">
            ${auth.escapeHtml(project.category_name || 'Hardware')}
          </div>
          ${project.featured ? `<div style="position: absolute; top: 10px; right: 10px; background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Featured</div>` : ''}
        </div>

        <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">By ${auth.escapeHtml(creator)}</div>
            <h3 style="font-size: 1.05rem; margin-bottom: 8px; line-height: 1.3;">${auth.escapeHtml(project.title)}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4; margin-bottom: 14px;">
              ${auth.escapeHtml(project.short_description || '')}
            </p>
          </div>

          <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: auto;">
            <span class="font-bold" style="color: var(--primary); font-size: 1.15rem;">${price}</span>
            <span class="btn btn-secondary btn-sm">View Details</span>
          </div>
        </div>
      </div>
    `;
  }

  async function loadMarketplaceProjects() {
    if (!grid) return;
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
        <span class="material-symbols-outlined spin" style="font-size: 32px; color: var(--primary);">sync</span>
        <p style="margin-top: 8px;">Loading projects...</p>
      </div>
    `;

    const q = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') {
      q.set('category', activeCategory);
    }
    const query = searchInput ? searchInput.value.trim() : '';
    if (query) {
      q.set('search', query);
    }
    const sort = sortSelect ? sortSelect.value : 'latest';
    if (sort === 'price-asc') q.set('ordering', 'price-asc');
    if (sort === 'price-desc') q.set('ordering', 'price-desc');
    if (sort === 'featured') q.set('featured', 'true');

    // Update browser URL
    const newUrl = `${window.location.pathname}${q.toString() ? `?${q.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);

    try {
      const data = await api.request(`projects/?${q.toString()}`);
      const projects = Array.isArray(data) ? data : (data.results || []);

      if (resultsLabel) {
        resultsLabel.textContent = `Showing ${projects.length} project${projects.length === 1 ? '' : 's'}`;
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
              ${query || activeCategory !== 'all' ? 'Try clearing your search or switching categories to explore more projects.' : 'There are currently no projects listed in this view.'}
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
      debounceTimer = setTimeout(loadMarketplaceProjects, 280);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', loadMarketplaceProjects);
  }

  window.filterMarketplace = loadMarketplaceProjects;
  window.setCategoryFilter = (slug, btn) => {
    activeCategory = slug;
    if (categoryPills) {
      categoryPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }
    loadMarketplaceProjects();
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await updateMarketplaceRoleUI();
    await loadCategories();
    await loadMarketplaceProjects();
  });
})();
