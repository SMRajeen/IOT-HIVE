/**
 * IoT HIVE - Home Page Dynamic Loader with Role-Based Hero Actions
 */

function formatLKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadHomeRoleActions();
  loadHomeCategories();
  loadHomeFeatured();
});

async function loadHomeRoleActions() {
  const heroActions = document.getElementById('home-hero-actions');
  const roleHint = document.getElementById('home-role-hint');
  const ctaTitle = document.getElementById('home-cta-title');
  const ctaDesc = document.getElementById('home-cta-desc');
  const ctaActions = document.getElementById('home-cta-actions');

  try {
    const user = await API.auth.me();
    if (!user || !user.username) return; // Guest mode defaults in HTML

    const role = (user.role || 'both').toLowerCase();

    if (role === 'seller') {
      if (heroActions) {
        heroActions.innerHTML = `
          <a href="/marketplace/" class="btn btn-primary btn-lg">
            <span class="material-symbols-outlined">explore</span>
            Explore Projects
          </a>
          <a href="/create-project/" class="btn btn-secondary btn-lg">
            <span class="material-symbols-outlined">add_circle</span>
            Post Project
          </a>
          <a href="/bounties/" class="btn btn-ghost btn-lg">
            <span class="material-symbols-outlined">radar</span>
            Bounties
          </a>
        `;
      }
      if (roleHint) {
        roleHint.style.display = 'block';
        roleHint.innerHTML = `
          <span style="font-size: 0.82rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;">
            <span class="badge-role badge-role-seller">Seller Mode</span>
            <span>&bull; Ready to monetize circuits &amp; firmware.</span>
            <a href="/profile/" class="text-link" style="color: #00ff88; margin-left: 4px;">Change in Profile &rarr;</a>
          </span>
        `;
      }
      if (ctaTitle) ctaTitle.textContent = 'Ready to Monetize Your Hardware Creations?';
      if (ctaDesc) ctaDesc.textContent = 'Upload your circuit diagrams, bill of materials, and firmware to start earning from digital blueprints and shipped hardware kits.';
      if (ctaActions) {
        ctaActions.innerHTML = `
          <a href="/create-project/" class="btn btn-primary btn-lg">
            <span class="material-symbols-outlined">rocket_launch</span>
            Publish New Project
          </a>
          <a href="/dashboard/" class="btn btn-secondary btn-lg">Open Creator Dashboard</a>
        `;
      }

    } else if (role === 'buyer') {
      if (heroActions) {
        heroActions.innerHTML = `
          <a href="/marketplace/" class="btn btn-primary btn-lg">
            <span class="material-symbols-outlined">explore</span>
            Explore Projects
          </a>
          <a href="/create-project/" class="btn btn-secondary btn-lg">
            <span class="material-symbols-outlined">add_circle</span>
            Post Project
          </a>
          <a href="/bounties/" class="btn btn-ghost btn-lg">
            <span class="material-symbols-outlined">post_add</span>
            Bounties
          </a>
        `;
      }
      if (roleHint) {
        roleHint.style.display = 'block';
        roleHint.innerHTML = `
          <span style="font-size: 0.82rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;">
            <span class="badge-role badge-role-buyer">Buyer Mode</span>
            <span>&bull; Discovering blueprints &amp; custom builds.</span>
            <a href="/profile/" class="text-link" style="color: #00b4d8; margin-left: 4px;">Switch to Seller or Both &rarr;</a>
          </span>
        `;
      }
      if (ctaTitle) ctaTitle.textContent = 'Looking for Custom Hardware or Blueprints?';
      if (ctaDesc) ctaDesc.textContent = 'Discover top-rated IoT projects, order assembled units, or post a custom bounty for our verified makers to build for you.';
      if (ctaActions) {
        ctaActions.innerHTML = `
          <a href="/marketplace/" class="btn btn-primary btn-lg">Browse Projects</a>
          <a href="/bounties/" class="btn btn-secondary btn-lg">Post a Bounty</a>
        `;
      }

    } else {
      // Both (Buyer & Seller) or Admin
      if (heroActions) {
        heroActions.innerHTML = `
          <a href="/marketplace/" class="btn btn-primary btn-lg">
            <span class="material-symbols-outlined">explore</span>
            Explore Projects
          </a>
          <a href="/create-project/" class="btn btn-secondary btn-lg">
            <span class="material-symbols-outlined">add_circle</span>
            Post Project
          </a>
          <a href="/bounties/" class="btn btn-ghost btn-lg">
            <span class="material-symbols-outlined">post_add</span>
            Bounties
          </a>
        `;
      }
      if (roleHint) {
        roleHint.style.display = 'block';
        roleHint.innerHTML = `
          <span style="font-size: 0.82rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px;">
            <span class="badge-role badge-role-both">Buyer &amp; Seller</span>
            <span>&bull; Full maker studio and buyer privileges enabled.</span>
          </span>
        `;
      }
      if (ctaTitle) ctaTitle.textContent = 'Ready to Start Your Next Project?';
      if (ctaDesc) ctaDesc.textContent = 'Join our maker community today. Share your electronics builds or discover projects to create at home.';
      if (ctaActions) {
        ctaActions.innerHTML = `
          <a href="/marketplace/" class="btn btn-primary btn-lg">Explore Marketplace</a>
          <a href="/create-project/" class="btn btn-secondary btn-lg">Share a Project</a>
        `;
      }
    }

  } catch (err) {
    // Guest mode: defaults in HTML remain active
  }
}

async function loadHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  try {
    const categories = await API.categories.list();

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="card-cyber" style="grid-column: 1 / -1; padding: 32px; text-align: center;">
          <span class="material-symbols-outlined" style="font-size: 36px; color: var(--text-muted); margin-bottom: 8px;">category</span>
          <p style="color: var(--text-muted);">Categories are being prepared.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => `
      <a href="/marketplace/?category=${encodeURIComponent(cat.slug)}" class="category-sector-card">
        <div>
          <div class="category-icon-box">
            <span class="material-symbols-outlined">${cat.icon || 'device_hub'}</span>
          </div>
          <h3>${cat.name}</h3>
          <p>${cat.description || 'Explore projects and open hardware in this category.'}</p>
        </div>
        <div class="category-card-footer">
          <span class="category-count-badge">${cat.project_count || 0} PROJECTS</span>
          <span class="category-browse-btn">Browse &rarr;</span>
        </div>
      </a>
    `).join('');
  } catch (error) {
    console.error('Error loading home categories:', error);
  }
}

async function loadHomeFeatured() {
  const container = document.getElementById('home-featured-grid');
  if (!container) return;

  try {
    let projects = await API.projects.list({ featured: 'true' });
    if (!projects || projects.length === 0) {
      projects = await API.projects.list();
    }

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div class="card-cyber" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
          <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 32px; color: var(--primary);">rocket_launch</span>
          </div>
          <h3 style="margin-bottom: 8px;">Be the First Creator to Share a Project!</h3>
          <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 20px; font-size: 0.95rem;">
            No projects have been published yet. Share your smart gadget, DIY circuit, or robotics build with the community.
          </p>
          <a href="/create-project/" class="btn btn-primary">
            <span class="material-symbols-outlined">add</span>
            Publish Your First Project
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = projects.slice(0, 6).map(p => {
      const img = p.images && p.images.length > 0 ? (API.resolveUrl ? API.resolveUrl(p.images[0].image) : p.images[0].image) : '';
      const price = p.is_free ? 'Free / Open' : formatLKR(p.price);
      const creator = p.seller_name || p.seller_username || 'Maker';
      const avgRating = p.average_rating ? Number(p.average_rating).toFixed(1) : null;
      const reviewsCount = p.review_count || 0;

      return `
        <div class="card-cyber project-node-card" onclick="location.href='/project/${p.id}/'" style="cursor: pointer; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-surface-container);">
          <div style="position: relative; height: 200px; background: var(--bg-surface-high); overflow: hidden;">
            ${img
              ? `<img src="${img}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">`
              : `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted);">
                  <span class="material-symbols-outlined" style="font-size: 44px; color: var(--primary);">memory</span>
                  <span style="font-size: 0.8rem; margin-top: 6px;">Smart Hardware</span>
                 </div>`
            }
            <div class="tag-mono" style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); padding: 4px 10px; border-radius: 4px;">
              ${p.category_name || 'Hardware'}
            </div>
            ${p.featured ? `<div style="position: absolute; top: 12px; right: 12px; background: var(--primary); color: #000; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono);">FEATURED</div>` : ''}
          </div>

          <div style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">By ${creator}</span>
              ${avgRating ? `
                <div style="display: flex; align-items: center; gap: 3px; font-size: 0.78rem; font-family: var(--font-mono); color: #ffb700;">
                  <span class="material-symbols-outlined" style="font-size: 14px;">star</span>
                  <strong>${avgRating}</strong>
                  ${reviewsCount > 0 ? `<span style="color: var(--text-muted);">(${reviewsCount})</span>` : ''}
                </div>
              ` : ''}
            </div>

            <h3 style="font-size: 1.15rem; margin: 0 0 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; height: 42px; overflow: hidden; margin: 0 0 16px 0;">
              ${p.short_description || ''}
            </p>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: auto;">
              <span class="font-mono font-bold" style="color: var(--primary); font-size: 1.15rem;">${price}</span>
              <span class="btn btn-secondary btn-sm">View Specs &rarr;</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading home featured projects:', error);
  }
}

