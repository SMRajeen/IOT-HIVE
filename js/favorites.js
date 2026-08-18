(() => {
  'use strict';
  const api = window.IoTHiveAPI;
  const auth = window.IoTHiveAuth;
  if (!api || !auth) return;

  async function loadFavorites() {
    const user = await auth.requireAuth();
    if (!user) return;

    const grid = document.getElementById('favorites-grid');
    const countEl = document.getElementById('favorites-count-label');
    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
        <span class="material-symbols-outlined spin" style="font-size: 32px; color: var(--primary);">sync</span>
        <p style="margin-top: 8px;">Loading your saved projects...</p>
      </div>
    `;

    try {
      const data = await api.request('favorites/');
      const favs = Array.isArray(data) ? data : (data.results || []);

      if (countEl) {
        countEl.textContent = `You have ${favs.length} saved project${favs.length === 1 ? '' : 's'}`;
      }

      if (!favs.length) {
        grid.innerHTML = `
          <div class="card-cyber" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
            <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-muted);">bookmark_border</span>
            </div>
            <h3 style="margin-bottom: 8px;">No Saved Projects</h3>
            <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto 20px; font-size: 0.95rem;">
              When you find projects you like in the marketplace, save them here for quick access later.
            </p>
            <a href="/marketplace/" class="btn btn-primary">
              <span class="material-symbols-outlined">explore</span>
              Explore Marketplace
            </a>
          </div>
        `;
        return;
      }

      grid.innerHTML = favs.map(fav => {
        const project = fav.project_details || {};
        const img = project.images?.[0]?.image ? api.resolveUrl(project.images[0].image) : '';
        const price = project.is_free ? 'Free' : `$${Number(project.price || 0).toFixed(2)}`;

        return `
          <div class="card-cyber" style="display: flex; flex-direction: column;">
            <div style="position: relative; height: 180px; background: #000; border-radius: 6px; overflow: hidden; cursor: pointer;" onclick="location.href='/project/${project.id || fav.project}/'">
              ${img
                ? `<img src="${img}" alt="${auth.escapeHtml(project.title || 'Project')}" style="width: 100%; height: 100%; object-fit: cover;">`
                : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-surface-high); color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:40px; color:var(--primary);">memory</span></div>`
              }
              <div class="tag-mono" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); padding: 4px 8px; border-radius: 4px;">
                ${auth.escapeHtml(project.category_name || 'Hardware')}
              </div>
            </div>

            <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h3 style="font-size: 1.05rem; margin-bottom: 6px; line-height: 1.3;">
                  <a href="/project/${project.id || fav.project}/" style="color: var(--text-primary); text-decoration: none;">
                    ${auth.escapeHtml(project.title || 'Untitled Project')}
                  </a>
                </h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4; margin-bottom: 12px;">
                  ${auth.escapeHtml(project.short_description || '')}
                </p>
              </div>

              <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: auto;">
                <span class="font-bold font-mono text-primary">${price}</span>
                <div class="flex items-center gap-2">
                  <a href="/project/${project.id || fav.project}/" class="btn btn-secondary btn-sm">View</a>
                  <button class="btn btn-ghost btn-sm" onclick="window.removeFavorite(${fav.id})" title="Remove from favorites" style="color: var(--status-warning);">
                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      grid.innerHTML = `<div class="card-cyber" style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--status-warning);">Unable to load favorites.</div>`;
    }
  }

  window.removeFavorite = async (favId) => {
    try {
      await api.request(`favorites/${favId}/`, { method: 'DELETE' });
      auth.showToast('Removed from saved projects', 'info');
      loadFavorites();
    } catch (error) {
      auth.showToast(error.message, 'error');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
  });
})();
