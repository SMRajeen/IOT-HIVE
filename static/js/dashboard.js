/**
 * IoT HIVE - Creator Dashboard & Sri Lanka Order Logistics
 * Phase 2: Multi-Tier Sales Tracking & Courier Dispatch
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  let currentUser = null;
  let allOrders = [];
  let activeOrdersTab = 'sales';

  function formatLKR(amount) {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function renderKPIs(projects, inquiries, favorites, orders) {
    const role = (currentUser?.role || 'both').toLowerCase();
    const kpiGrid = document.getElementById('dashboard-kpi-grid');
    if (!kpiGrid) return;

    const myPurchases = orders.filter(o => currentUser && o.buyer === currentUser.id);
    const totalSpent = myPurchases
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const salesOrders = orders.filter(o => currentUser && o.seller === currentUser.id);
    const totalRevenue = salesOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const totalViews = projects.reduce((sum, p) => sum + (p.views || 0), 0);

    const salesBadge = document.getElementById('sales-count-badge');
    const purchaseBadge = document.getElementById('purchases-count-badge');
    if (salesBadge) salesBadge.textContent = salesOrders.length;
    if (purchaseBadge) purchaseBadge.textContent = myPurchases.length;

    if (role === 'buyer') {
      kpiGrid.innerHTML = `
        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Orders Placed</span>
            <span class="material-symbols-outlined" style="color: var(--primary);">shopping_bag</span>
          </div>
          <div class="kpi-value">${myPurchases.length}</div>
          <div class="kpi-change neutral">Hardware &amp; Blueprints</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Total Spent</span>
            <span class="material-symbols-outlined" style="color: var(--status-success);">payments</span>
          </div>
          <div class="kpi-value" style="color: var(--status-success); font-size: 1.6rem;">${formatLKR(totalSpent)}</div>
          <div class="kpi-change positive">${myPurchases.length} fulfilled &bull; Sri Lanka</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Saved Projects</span>
            <span class="material-symbols-outlined" style="color: var(--primary-container);">bookmark</span>
          </div>
          <div class="kpi-value">${favorites.length}</div>
          <div class="kpi-change positive"><a href="/favorites/" style="color: var(--primary);">View Bookmarks &rarr;</a></div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Inquiries &amp; Chats</span>
            <span class="material-symbols-outlined" style="color: var(--status-warning);">chat</span>
          </div>
          <div class="kpi-value">${inquiries.length}</div>
          <div class="kpi-change neutral"><a href="/requests/" style="color: var(--primary);">View Inquiries &rarr;</a></div>
        </div>
      `;
    } else {
      // Seller or Both
      kpiGrid.innerHTML = `
        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">My Projects</span>
            <span class="material-symbols-outlined" style="color: var(--primary);">memory</span>
          </div>
          <div class="kpi-value" id="kpi-my-projects">${projects.length}</div>
          <div class="kpi-change neutral">Shared in repository</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Hardware Sales</span>
            <span class="material-symbols-outlined" style="color: var(--status-success);">payments</span>
          </div>
          <div class="kpi-value" id="kpi-total-sales" style="color: var(--status-success); font-size: 1.6rem;">${formatLKR(totalRevenue)}</div>
          <div class="kpi-change positive" id="kpi-sales-count">${salesOrders.length} orders fulfilled</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Total Views</span>
            <span class="material-symbols-outlined" style="color: var(--primary-container);">visibility</span>
          </div>
          <div class="kpi-value" id="kpi-total-views">${totalViews.toLocaleString()}</div>
          <div class="kpi-change positive">Across projects</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Inquiries &amp; Messages</span>
            <span class="material-symbols-outlined" style="color: var(--status-warning);">chat</span>
          </div>
          <div class="kpi-value" id="kpi-inquiries">${inquiries.length}</div>
          <div class="kpi-change neutral">
            <a href="/requests/" style="color: var(--primary); text-decoration: underline;">View Inquiries &rarr;</a>
          </div>
        </div>
      `;
    }
  }

  function renderProjectsTable(projects, favorites = []) {
    const section = document.getElementById('dashboard-projects-section');
    if (!section) return;

    const role = (currentUser?.role || 'both').toLowerCase();

    if (role === 'buyer') {
      section.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 1.25rem; margin: 0 0 4px;">Maker Studio &bull; Creator Publishing</h3>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">You are currently signed in as a Buyer.</p>
          </div>
          <button type="button" onclick="window.quickUpgradeToSeller('both')" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined">upgrade</span>
            Upgrade to Seller &amp; Maker
          </button>
        </div>

        <div class="role-upgrade-banner" style="margin-bottom: 24px;">
          <div style="display: flex; gap: 14px; align-items: center;">
            <span class="material-symbols-outlined" style="font-size: 32px; color: #00ff88;">hardware</span>
            <div>
              <h4 style="margin: 0 0 4px; color: #fff;">Have circuit designs, Arduino code, or DIY kits to sell?</h4>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">
                Switch your account mode to <strong>Seller</strong> or <strong>Both</strong> to list your projects on the IoT HIVE marketplace, accept courier orders, and monetize blueprints.
              </p>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h4 style="font-size: 1.05rem; margin: 0; color: var(--primary);">Your Saved Bookmarks (${favorites.length})</h4>
          <a href="/favorites/" class="btn btn-ghost btn-sm">View All Saved &rarr;</a>
        </div>

        ${favorites.length === 0 ? `
          <div style="padding: 28px; text-align: center; color: var(--text-muted); background: var(--bg-surface-low); border-radius: var(--radius-md);">
            <span class="material-symbols-outlined" style="font-size: 28px; margin-bottom: 6px;">bookmark_border</span>
            <p style="margin: 0;">No saved projects yet. Explore the marketplace to bookmark circuits!</p>
            <a href="/marketplace/" class="btn btn-secondary btn-sm" style="margin-top: 12px;">Explore Marketplace</a>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;">
            ${favorites.slice(0, 4).map(fav => `
              <div class="card-cyber" style="padding: 14px; background: var(--bg-surface-low); cursor: pointer;" onclick="location.href='/project/${fav.project}/'">
                <div style="font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${auth.escapeHtml(fav.project_title || 'Hardware Build')}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Saved project</div>
              </div>
            `).join('')}
          </div>
        `}
      `;
      return;
    }

    // Seller or Both
    section.innerHTML = `
      <div class="flex items-center justify-between" style="margin-bottom: 20px;">
        <h3 style="font-size: 1.25rem; margin: 0;">My Published Projects</h3>
        <a href="/create-project/" class="btn btn-ghost btn-sm">+ Add Project</a>
      </div>

      <div style="overflow-x: auto;">
        <table class="table-cyber">
          <thead>
            <tr>
              <th>Project Title</th>
              <th>Category</th>
              <th>Base Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="dashboard-projects-tbody">
            ${!projects.length ? `
              <tr>
                <td colspan="5" style="padding: 32px; text-align: center; color: var(--text-muted);">
                  <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">memory</span>
                  <p>You have not published any hardware projects yet.</p>
                  <a href="/create-project/" class="btn btn-primary btn-sm" style="margin-top: 12px;">Create Your First Project</a>
                </td>
              </tr>
            ` : projects.map(p => {
              const price = p.is_free ? 'Free' : formatLKR(p.price);
              return `
                <tr>
                  <td>
                    <a href="/project/${p.id}/" style="font-weight: 600; color: var(--text-primary);">
                      ${auth.escapeHtml(p.title)}
                    </a>
                    <div class="text-xs" style="color: var(--text-muted); font-family: var(--font-mono);">${p.views || 0} views</div>
                  </td>
                  <td>
                    <span class="tag-mono">${auth.escapeHtml(p.category_name || 'Hardware')}</span>
                  </td>
                  <td class="font-mono" style="color: var(--primary); font-weight: 700;">${price}</td>
                  <td>
                    <span class="badge-status status-${p.status === 'published' ? 'online' : 'away'}">${p.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <a href="/project/${p.id}/" class="btn btn-ghost btn-sm" title="View Project">
                        <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                      </a>
                      <a href="/create-project/?edit=${p.id}" class="btn btn-ghost btn-sm" title="Edit Project">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary);">edit</span>
                      </a>
                      <button onclick="window.deleteDashboardProject(${p.id})" class="btn btn-ghost btn-sm" style="color: var(--status-warning);" title="Delete">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('dashboard-orders-tbody');
    if (!tbody) return;

    const isSales = activeOrdersTab === 'sales';
    const displayedOrders = allOrders.filter(o => {
      if (!currentUser) return false;
      return isSales ? o.seller === currentUser.id : o.buyer === currentUser.id;
    });

    if (!displayedOrders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 32px; text-align: center; color: var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">local_shipping</span>
            <p>${isSales ? 'No sales orders received yet. Share your hardware project in the marketplace!' : 'You have not placed any hardware orders yet.'}</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = displayedOrders.map(order => {
      const isPhysical = order.tier_type === 'kit' || order.tier_type === 'assembled' || order.shipping_address;
      const statusBadge = order.status === 'delivered' ? 'online' : (order.status === 'shipped' ? 'active' : (order.status === 'paid' ? 'online' : 'away'));

      return `
        <tr>
          <td>
            <strong class="font-mono text-xs" style="color: var(--primary);">${auth.escapeHtml(order.transaction_id || `#${order.id}`)}</strong>
            <div class="text-xs" style="color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</div>
          </td>
          <td>
            <a href="/project/${order.project}/" style="font-weight: 600; color: var(--text-primary);">
              ${auth.escapeHtml(order.project_title || 'Hardware Build')}
            </a>
            <div class="text-xs" style="color: var(--text-muted);">
              Tier: <strong>${(order.tier_type || 'digital').toUpperCase()}</strong> &bull; ${auth.escapeHtml(order.tier_name || 'Standard')}
            </div>
          </td>
          <td>
            <div>${auth.escapeHtml(order.buyer_name || order.buyer_username || 'Customer')}</div>
            <div class="text-xs" style="color: var(--text-muted);">${auth.escapeHtml(order.shipping_city || '')} ${auth.escapeHtml(order.shipping_phone || '')}</div>
          </td>
          <td class="font-mono" style="font-weight: 700; color: var(--primary);">
            ${formatLKR(order.amount)}
          </td>
          <td>
            <span class="badge-status status-${statusBadge}">
              ${(order.status || 'paid').toUpperCase()}
            </span>
          </td>
          <td>
            ${isSales && isPhysical ? `
              <button onclick="window.openShippingModal(${order.id})" class="btn btn-secondary btn-xs" style="display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 14px;">local_shipping</span>
                ${order.tracking_number ? 'Update Dispatch' : 'Dispatch'}
              </button>
            ` : (order.tracking_number ? `
              <div class="text-xs font-mono" style="color: #00ff88;">
                ${auth.escapeHtml(order.tracking_courier || 'Courier')}:<br>${auth.escapeHtml(order.tracking_number)}
              </div>
            ` : '<span class="text-xs text-muted">Digital Access</span>')}
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Window Handlers ---

  window.switchOrdersTab = (tab) => {
    activeOrdersTab = tab;
    const salesBtn = document.getElementById('tab-orders-sales-btn');
    const purchasesBtn = document.getElementById('tab-orders-purchases-btn');

    if (salesBtn && purchasesBtn) {
      if (tab === 'sales') {
        salesBtn.className = 'btn btn-secondary btn-sm active';
        purchasesBtn.className = 'btn btn-ghost btn-sm';
      } else {
        purchasesBtn.className = 'btn btn-secondary btn-sm active';
        salesBtn.className = 'btn btn-ghost btn-sm';
      }
    }

    renderOrdersTable();
  };

  window.openShippingModal = (orderId) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modal-shipping-order-id').value = order.id;
    document.getElementById('modal-order-summary-label').textContent = `Order #${order.id} &bull; ${order.project_title} (${(order.tier_type || '').toUpperCase()})`;
    if (order.tracking_courier) document.getElementById('modal-courier-name').value = order.tracking_courier;
    if (order.tracking_number) document.getElementById('modal-tracking-number').value = order.tracking_number;
    if (order.status) document.getElementById('modal-order-status').value = order.status;

    const modal = document.getElementById('shipping-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeShippingModal = () => {
    const modal = document.getElementById('shipping-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleSaveShipping = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('modal-shipping-submit-btn');
    const orderId = document.getElementById('modal-shipping-order-id').value;
    const courier = document.getElementById('modal-courier-name').value;
    const tracking = document.getElementById('modal-tracking-number').value.trim();
    const status = document.getElementById('modal-order-status').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Updating...';

    try {
      await api.orders.updateShipping(orderId, {
        tracking_courier: courier,
        tracking_number: tracking,
        status: status
      });

      // Update in memory
      const target = allOrders.find(o => o.id == orderId);
      if (target) {
        target.tracking_courier = courier;
        target.tracking_number = tracking;
        target.status = status;
      }

      window.closeShippingModal();
      renderOrdersTable();
      if (window.showToast) showToast('Shipment tracking updated successfully!', 'success');
    } catch (err) {
      const alert = document.getElementById('shipping-modal-alert');
      alert.className = 'form-alert form-alert-error';
      alert.textContent = err.message || 'Failed to update shipping info.';
      alert.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Shipment';
    }
  };

  window.deleteDashboardProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.projects.delete(id);
      if (window.showToast) showToast('Project deleted.', 'info');
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      if (window.showToast) showToast(e.message || 'Delete failed', 'error');
    }
  };

  window.openMakerProModal = () => {
    const m = document.getElementById('maker-pro-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeMakerProModal = () => {
    const m = document.getElementById('maker-pro-modal');
    if (m) m.style.display = 'none';
  };

  window.activateMakerProDemo = () => {
    const btn = document.getElementById('btn-activate-maker-pro');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Activating Pro Membership...';
      setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Active: Maker Pro';
        btn.style.background = 'rgba(0, 255, 136, 0.2)';
        btn.style.color = '#00ff88';
        btn.style.borderColor = '#00ff88';
        const badge = document.getElementById('current-maker-tier-badge');
        if (badge) {
          badge.innerHTML = '<span style="color: #ffaa00;">★ Maker Pro Active (0% Commission &bull; Gold Verified)</span>';
        }
        if (window.showToast) showToast('Maker Pro activated! 0% commission & Gold Verified badge enabled.', 'success');
        setTimeout(() => window.closeMakerProModal(), 1200);
      }, 900);
    }
  };

  window.quickUpgradeToSeller = async (newRole) => {
    try {
      await api.auth.updateProfile({ role: newRole || 'both' });
      if (window.showToast) showToast('Account role upgraded! Welcome to Creator Studio.', 'success');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      if (window.showToast) showToast(err.message || 'Failed to update role.', 'error');
    }
  };

  async function loadDashboard() {
    try {
      currentUser = await auth.getUser();
      if (!currentUser) {
        window.location.href = '/login/?next=/dashboard/';
        return;
      }

      const role = (currentUser.role || 'both').toLowerCase();
      const greeting = document.getElementById('dashboard-greeting');
      const hudLabel = document.getElementById('dashboard-hud-label');
      const subtitle = document.getElementById('dashboard-subtitle');
      const topActions = document.getElementById('dashboard-top-actions');
      const ordersTitle = document.getElementById('dashboard-orders-title');
      const ordersSubtitle = document.getElementById('dashboard-orders-subtitle');
      const makerProBanner = document.getElementById('maker-pro-banner');

      if (role === 'buyer') {
        activeOrdersTab = 'purchases';
        if (greeting) greeting.textContent = `Welcome to Buyer Hub, ${currentUser.first_name || currentUser.username}!`;
        if (hudLabel) hudLabel.textContent = 'BUYER HUB • SRI LANKA';
        if (subtitle) subtitle.textContent = 'Track your placed hardware orders, courier deliveries, and manage custom bounty requests.';
        if (ordersTitle) ordersTitle.innerHTML = '<span class="material-symbols-outlined text-primary">local_shipping</span> My Hardware Orders &amp; Tracking';
        if (ordersSubtitle) ordersSubtitle.textContent = 'Track your package shipments, courier tracking numbers, and view digital blueprint download access.';
        if (makerProBanner) makerProBanner.style.display = 'none';
        if (topActions) {
          topActions.innerHTML = `
            <a href="/bounties/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">post_add</span>
              Post a Bounty
            </a>
            <a href="/marketplace/" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">explore</span>
              Explore Marketplace
            </a>
          `;
        }
      } else if (role === 'seller') {
        activeOrdersTab = 'sales';
        if (greeting) greeting.textContent = `Creator Studio • ${currentUser.first_name || currentUser.username}`;
        if (hudLabel) hudLabel.textContent = 'CREATOR STUDIO • SRI LANKA';
        if (subtitle) subtitle.textContent = 'Manage hardware blueprints, track views, process Sri Lanka shipments, and view order receipts.';
        if (makerProBanner) makerProBanner.style.display = 'block';
        if (topActions) {
          topActions.innerHTML = `
            <a href="/create-project/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
              Post New Project
            </a>
          `;
        }
      } else {
        // Both or Admin
        if (greeting) greeting.textContent = `Welcome, ${currentUser.first_name || currentUser.username}!`;
        if (hudLabel) hudLabel.textContent = 'CREATOR & BUYER HUB • SRI LANKA';
        if (subtitle) subtitle.textContent = 'Manage your published hardware, track sales revenue, process shipments, and view purchased devices.';
        if (makerProBanner) makerProBanner.style.display = 'block';
        if (topActions) {
          topActions.innerHTML = `
            <a href="/create-project/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
              Post Project
            </a>
            <a href="/marketplace/" class="btn btn-secondary btn-sm">Marketplace</a>
          `;
        }
      }

    } catch (e) {
      window.location.href = '/login/?next=/dashboard/';
      return;
    }

    try {
      const [projectsData, inquiriesData, favsData, ordersData] = await Promise.all([
        api.projects.myProjects().catch(() => []),
        api.requests.list().catch(() => []),
        api.favorites.list().catch(() => []),
        api.orders.list().catch(() => [])
      ]);

      const projects = Array.isArray(projectsData) ? projectsData : (projectsData.results || []);
      const inquiries = Array.isArray(inquiriesData) ? inquiriesData : (inquiriesData.results || []);
      const favorites = Array.isArray(favsData) ? favsData : (favsData.results || []);
      allOrders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);

      renderKPIs(projects, inquiries, favorites, allOrders);
      renderProjectsTable(projects, favorites);
      window.switchOrdersTab(activeOrdersTab);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', loadDashboard);
})();
