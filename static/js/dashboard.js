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

  function getDashboardStructureHtml() {
    return `
      <!-- Real Statistics Cards (5 Cards) -->
      <div id="dashboard-kpi-grid" class="grid-cols-4" style="margin-bottom: var(--space-8); grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">My Projects</span>
            <span class="material-symbols-outlined" style="color: var(--primary);">memory</span>
          </div>
          <div class="kpi-value" id="kpi-my-projects">0</div>
          <div class="kpi-change neutral">Shared in repository</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Hardware Sales</span>
            <span class="material-symbols-outlined" style="color: var(--status-success);">payments</span>
          </div>
          <div class="kpi-value" id="kpi-total-sales" style="color: var(--primary); font-size: 1.6rem;">Rs. 0.00</div>
          <div class="kpi-change positive" id="kpi-sales-count">0 orders fulfilled</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Total Views</span>
            <span class="material-symbols-outlined" style="color: var(--primary-container);">visibility</span>
          </div>
          <div class="kpi-value" id="kpi-total-views">0</div>
          <div class="kpi-change positive">Across projects</div>
        </div>

        <div class="card-cyber kpi-card" style="padding: 22px;">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="stat-label">Inquiries &amp; Messages</span>
            <span class="material-symbols-outlined" style="color: var(--status-warning);">chat</span>
          </div>
          <div class="kpi-value" id="kpi-inquiries">0</div>
          <div class="kpi-change neutral">
            <a href="/project-requests/" style="color: var(--primary); text-decoration: underline;">View Inquiries &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Maker Pro SaaS Subscription & Take-Rate Tier Banner -->
      <div class="card-cyber" id="maker-pro-banner" style="padding: 22px 26px; margin-bottom: var(--space-8); background: linear-gradient(135deg, rgba(255, 170, 0, 0.08) 0%, rgba(0, 255, 136, 0.04) 100%); border: 1px solid rgba(255, 170, 0, 0.3); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 170, 0, 0.15); border: 1px solid #ffaa00; display: flex; align-items: center; justify-content: center; color: #ffaa00; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 28px;">workspace_premium</span>
            </div>
            <div style="min-width: 220px; flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px; flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">Maker Pro Subscription &bull; SaaS Recurring Revenue</h3>
                <span class="tag-mono" style="background: rgba(255,170,0,0.2); color: #ffaa00; border-color: rgba(255,170,0,0.4); font-size: 0.72rem;">0% COMMISSION TIER</span>
              </div>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">
                Current Plan: <strong id="current-maker-tier-badge" style="color: var(--text-primary);">Standard Maker (8% Escrow Fee)</strong>. Upgrade to <strong>Maker Pro (Rs. 1,490 / mo)</strong> for 0% commission, Gold Verified Badge &amp; SMS alerts.
              </p>
            </div>
          </div>
          <button type="button" onclick="window.openMakerProModal()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #ffaa00, #ff7700); border-color: #ffaa00; color: #000; font-weight: 700;">
            <span class="material-symbols-outlined" style="font-size: 18px;">star</span>
            View SaaS Pro Tiers
          </button>
        </div>
      </div>

      <!-- Hardware Orders & Shipping Fulfillment Section -->
      <div class="card-cyber" style="padding: 24px; margin-bottom: var(--space-8);">
        <div class="flex items-center justify-between" style="margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 id="dashboard-orders-title" style="font-size: 1.3rem; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined text-primary">local_shipping</span>
              Hardware Orders &amp; Fulfillment
            </h3>
            <p id="dashboard-orders-subtitle" style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">Manage customer shipments across Sri Lanka, update courier tracking numbers, and view purchases.</p>
          </div>

          <!-- Tab Switcher -->
          <div class="flex items-center gap-2 flex-wrap" id="dashboard-orders-tabs">
            <button type="button" id="tab-orders-sales-btn" class="btn btn-secondary btn-sm active" onclick="window.switchOrdersTab('sales')">
              <span class="material-symbols-outlined" style="font-size: 16px;">sell</span>
              Creator Sales (<span id="sales-count-badge">0</span>)
            </button>
            <button type="button" id="tab-orders-purchases-btn" class="btn btn-ghost btn-sm" onclick="window.switchOrdersTab('purchases')">
              <span class="material-symbols-outlined" style="font-size: 16px;">shopping_bag</span>
              My Purchases (<span id="purchases-count-badge">0</span>)
            </button>
          </div>
        </div>

        <div class="table-responsive-wrapper">
          <table class="table-cyber" style="width: 100%; min-width: 650px;">
            <thead>
              <tr id="orders-table-headers">
                <th>Order ID</th>
                <th>Project &amp; Tier</th>
                <th>Buyer / Address</th>
                <th>Amount (LKR)</th>
                <th>Delivery Status</th>
                <th>Tracking / Action</th>
              </tr>
            </thead>
            <tbody id="dashboard-orders-tbody">
              <tr>
                <td colspan="6" style="padding: 32px; text-align: center; color: var(--text-muted);">
                  <span class="material-symbols-outlined spin" style="font-size: 24px; color: var(--primary);">sync</span>
                  <p style="margin-top: 8px;">Loading hardware orders...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Projects Management Table -->
      <div id="dashboard-projects-section" class="card-cyber" style="padding: 24px; margin-bottom: var(--space-8);">
        <div class="flex items-center justify-between flex-wrap gap-2" style="margin-bottom: 20px;">
          <h3 style="font-size: 1.25rem; margin: 0;">My Published Projects</h3>
          <a href="/create-project/" class="btn btn-ghost btn-sm">+ Add Project</a>
        </div>

        <div class="table-responsive-wrapper">
          <table class="table-cyber" style="width: 100%; min-width: 550px;">
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
              <tr>
                <td colspan="5" style="padding: 32px; text-align: center; color: var(--text-muted);">
                  <span class="material-symbols-outlined spin" style="font-size: 24px; color: var(--primary);">sync</span>
                  <p style="margin-top: 8px;">Loading your projects...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
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
          <div class="kpi-change neutral"><a href="/project-requests/" style="color: var(--primary);">View Inquiries &rarr;</a></div>
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
            <a href="/project-requests/" style="color: var(--primary); text-decoration: underline;">View Inquiries &rarr;</a>
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
            <div class="role-upgrade-icon">
              <span class="material-symbols-outlined" style="font-size: 26px;">storefront</span>
            </div>
            <div>
              <h4 style="margin: 0 0 4px; font-size: 1.05rem;">Start selling your IoT &amp; Embedded creations</h4>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                Enable creator privileges to publish hardware blueprints, set Sri Lanka courier fees, and earn revenue with 0% platform commissions on Pro tiers.
              </p>
            </div>
          </div>
        </div>

        <h4 style="font-size: 1.1rem; margin-bottom: 14px;">Your Saved Bookmarks (${favorites.length})</h4>
        ${favorites.length === 0 ? `
          <div style="text-align: center; padding: 32px; color: var(--text-muted); background: var(--bg-surface-low); border-radius: 8px;">
            <span class="material-symbols-outlined" style="font-size: 32px; opacity: 0.5;">bookmark_border</span>
            <p style="margin: 8px 0 14px;">You haven't saved any hardware projects yet.</p>
            <a href="/marketplace/" class="btn btn-secondary btn-sm">Explore Marketplace</a>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
            ${favorites.map(fav => `
              <div class="card-cyber" style="padding: 14px; background: var(--bg-surface-low); cursor: pointer;" onclick="location.href='/project/${fav.project}/'">
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; color: var(--text-primary);">${fav.project_title || 'IoT Device'}</div>
                <div class="text-xs" style="color: var(--text-muted); margin-bottom: 8px;">Saved on ${new Date(fav.created_at).toLocaleDateString()}</div>
                <div class="flex items-center justify-between">
                  <span class="tag-mono" style="font-size: 0.72rem;">Rs. ${Number(fav.project_price || 0).toLocaleString()}</span>
                  <span style="font-size: 0.8rem; color: var(--primary);">View Project &rarr;</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
      return;
    }

    const tbody = document.getElementById('dashboard-projects-tbody');
    if (!tbody) return;

    if (!projects || projects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px;">folder_open</span>
            <p style="margin: 0 0 12px;">No projects published yet.</p>
            <a href="/create-project/" class="btn btn-primary btn-sm">+ Post Your First Project</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = projects.map(p => `
      <tr>
        <td>
          <a href="/project/${p.id}/" style="font-weight: 600; color: var(--text-primary); text-decoration: none;">
            ${p.title}
          </a>
        </td>
        <td>
          <span class="tag-mono">${p.category_name || p.category || 'General'}</span>
        </td>
        <td>
          <strong style="color: var(--primary); font-family: var(--font-mono);">${formatLKR(p.price)}</strong>
        </td>
        <td>
          <span class="badge ${p.status === 'published' ? 'badge-success' : 'badge-neutral'}">
            ${p.status || 'published'}
          </span>
        </td>
        <td>
          <div class="flex items-center gap-2">
            <a href="/project/${p.id}/" class="btn btn-ghost btn-sm" style="padding: 4px 8px;" title="View">
              <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
            </a>
            <a href="/create-project/?edit=${p.id}" class="btn btn-ghost btn-sm" style="padding: 4px 8px;" title="Edit">
              <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
            </a>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderOrdersTable(orders, tabType = 'sales') {
    const tbody = document.getElementById('dashboard-orders-tbody');
    const headers = document.getElementById('orders-table-headers');
    if (!tbody) return;

    if (headers) {
      if (tabType === 'sales') {
        headers.innerHTML = `
          <th style="white-space: nowrap;">Order ID</th>
          <th style="white-space: nowrap;">Project &amp; Tier</th>
          <th style="white-space: nowrap;">Buyer / Address</th>
          <th style="white-space: nowrap;">Amount (LKR)</th>
          <th style="white-space: nowrap;">Delivery Status</th>
          <th style="white-space: nowrap;">Courier / Action</th>
        `;
      } else {
        headers.innerHTML = `
          <th style="white-space: nowrap;">Order ID</th>
          <th style="white-space: nowrap;">Purchased Hardware</th>
          <th style="white-space: nowrap;">Seller / Maker</th>
          <th style="white-space: nowrap;">Amount Paid</th>
          <th style="white-space: nowrap;">Delivery Status</th>
          <th style="white-space: nowrap;">Live Courier Tracking</th>
        `;
      }
    }

    let filtered = [];
    if (tabType === 'sales') {
      filtered = orders.filter(o => currentUser && o.seller === currentUser.id);
    } else {
      filtered = orders.filter(o => currentUser && o.buyer === currentUser.id);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 40px; text-align: center; color: var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px;">
              ${tabType === 'sales' ? 'store' : 'shopping_basket'}
            </span>
            <p style="margin: 0 0 10px;">
              ${tabType === 'sales' ? 'No incoming customer orders yet.' : 'You haven\'t purchased any hardware kits yet.'}
            </p>
            ${tabType === 'purchases' ? '<a href="/marketplace/" class="btn btn-secondary btn-sm">Explore Hardware Marketplace</a>' : ''}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(order => {
      const isSales = tabType === 'sales';
      const statusBadge = getStatusBadge(order.status, order.fulfillment_type);
      const courierName = order.courier_name || 'PromptX Logistics';
      const trackingNo = order.tracking_number;

      return `
        <tr>
          <td style="white-space: nowrap;">
            <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan);">
              #ORD-${String(order.id).padStart(5, '0')}
            </span>
            <div class="text-xs" style="color: var(--text-muted); margin-top: 2px;">
              ${new Date(order.created_at).toLocaleDateString()}
            </div>
          </td>

          <td style="min-width: 180px;">
            <div style="font-weight: 600; color: var(--text-primary); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${order.project_title || 'Hardware Kit'}
            </div>
            <div class="flex items-center gap-1" style="margin-top: 3px;">
              <span class="tag-mono" style="font-size: 0.7rem; text-transform: uppercase; white-space: nowrap;">
                ${order.fulfillment_type === 'physical' ? 'Physical Device' : 'Digital Blueprint'}
              </span>
            </div>
          </td>

          <td>
            ${isSales ? `
              <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap;">${order.buyer_username || order.buyer_name || 'Customer'}</div>
              <div class="text-xs" style="color: var(--text-muted); max-width: 200px; line-height: 1.3;">
                ${order.shipping_address ? escapeHtml(order.shipping_address) : (order.shipping_city ? order.shipping_city + ', Sri Lanka' : 'Digital Delivery')}
              </div>
              ${order.shipping_phone ? `<div class="text-xs" style="color: var(--accent-cyan); font-family: var(--font-mono); white-space: nowrap;">${order.shipping_phone}</div>` : ''}
            ` : `
              <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap;">${order.seller_username || order.seller_name || 'Creator Maker'}</div>
              <div class="text-xs" style="color: var(--text-muted);">Verified Seller</div>
            `}
          </td>

          <td style="white-space: nowrap;">
            <div style="font-family: var(--font-mono); font-weight: 800; color: var(--status-success); font-size: 1rem; white-space: nowrap;">
              ${formatLKR(order.amount)}
            </div>
            <div class="text-xs" style="color: var(--text-muted); white-space: nowrap;">
              ${order.payment_method ? order.payment_method.toUpperCase() : 'PAYHERE GATEWAY'}
            </div>
          </td>

          <td style="white-space: nowrap;">
            ${statusBadge}
          </td>

          <td style="white-space: nowrap;">
            ${isSales ? `
              ${order.fulfillment_type === 'physical' ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.openShippingModal(${order.id})" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.8rem; white-space: nowrap;">
                  <span class="material-symbols-outlined" style="font-size: 15px;">local_shipping</span>
                  ${trackingNo ? 'Edit Tracking' : 'Dispatch Courier'}
                </button>
                ${trackingNo ? `<div class="text-xs" style="color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono); white-space: nowrap;">${trackingNo}</div>` : ''}
              ` : `
                <span class="tag-mono" style="color: var(--status-online); font-size: 0.75rem; white-space: nowrap;">Digital Instant Access</span>
              `}
            ` : `
              ${trackingNo ? `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span class="tag-mono" style="color: var(--accent-cyan); font-size: 0.75rem; white-space: nowrap;">${courierName}</span>
                  <span style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); font-weight: 600; white-space: nowrap;">${trackingNo}</span>
                  <a href="https://promptx.lk/track/${trackingNo}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--primary); text-decoration: underline; white-space: nowrap;">
                    Track Live &rarr;
                  </a>
                </div>
              ` : `
                <span class="text-xs" style="color: var(--text-muted); white-space: nowrap;">
                  ${order.status === 'paid' ? 'Processing Dispatch in Colombo' : 'Pending Shipment Details'}
                </span>
              `}
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  function getStatusBadge(status, fulfillmentType) {
    const s = (status || 'pending').toLowerCase();
    if (s === 'delivered') {
      return `<span class="badge badge-success" style="display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span> Delivered</span>`;
    }
    if (s === 'shipped') {
      return `<span class="badge" style="background: rgba(0, 229, 255, 0.15); color: var(--accent-cyan); border: 1px solid rgba(0, 229, 255, 0.4); display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 13px;">local_shipping</span> Shipped</span>`;
    }
    if (s === 'paid') {
      return `<span class="badge" style="background: rgba(0, 255, 136, 0.15); color: var(--status-online); border: 1px solid rgba(0, 255, 136, 0.4); display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 13px;">paid</span> Paid / Processing</span>`;
    }
    if (s === 'cancelled') {
      return `<span class="badge" style="background: rgba(255, 68, 68, 0.15); color: var(--status-error); border: 1px solid rgba(255, 68, 68, 0.4);">Cancelled</span>`;
    }
    return `<span class="badge badge-neutral">${s.toUpperCase()}</span>`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  window.switchOrdersTab = function(tab) {
    activeOrdersTab = tab;
    const salesBtn = document.getElementById('tab-orders-sales-btn');
    const purchasesBtn = document.getElementById('tab-orders-purchases-btn');

    if (salesBtn && purchasesBtn) {
      if (tab === 'sales') {
        salesBtn.className = 'btn btn-secondary btn-sm active';
        purchasesBtn.className = 'btn btn-ghost btn-sm';
      } else {
        salesBtn.className = 'btn btn-ghost btn-sm';
        purchasesBtn.className = 'btn btn-secondary btn-sm active';
      }
    }

    renderOrdersTable(allOrders, tab);
  };

  // -------------------------------------------------------------------
  // Shipping Modal Handler
  // -------------------------------------------------------------------
  window.openShippingModal = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('shipping-modal');
    const idInput = document.getElementById('modal-shipping-order-id');
    const summaryLabel = document.getElementById('modal-order-summary-label');
    const courierSelect = document.getElementById('modal-courier-name');
    const trackingInput = document.getElementById('modal-tracking-number');
    const statusSelect = document.getElementById('modal-order-status');
    const alertBox = document.getElementById('shipping-modal-alert');

    if (idInput) idInput.value = order.id;
    if (summaryLabel) {
      summaryLabel.innerHTML = `Order #ORD-${String(order.id).padStart(5, '0')} &bull; ${escapeHtml(order.project_title || 'Kit')} &bull; Deliver to: ${escapeHtml(order.buyer_name || 'Buyer')} (${escapeHtml(order.shipping_city || 'Sri Lanka')})`;
    }
    if (courierSelect) courierSelect.value = order.courier_name || 'PromptX Courier Sri Lanka';
    if (trackingInput) trackingInput.value = order.tracking_number || '';
    if (statusSelect) statusSelect.value = order.status || 'shipped';
    if (alertBox) { alertBox.style.display = 'none'; alertBox.textContent = ''; }

    if (modal) modal.style.display = 'flex';
  };

  window.closeShippingModal = function() {
    const modal = document.getElementById('shipping-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleSaveShipping = async function(e) {
    e.preventDefault();
    const orderId = document.getElementById('modal-shipping-order-id')?.value;
    const courierName = document.getElementById('modal-courier-name')?.value;
    const trackingNumber = document.getElementById('modal-tracking-number')?.value;
    const status = document.getElementById('modal-order-status')?.value;
    const submitBtn = document.getElementById('modal-shipping-submit-btn');
    const alertBox = document.getElementById('shipping-modal-alert');

    if (!orderId || !trackingNumber) {
      if (alertBox) {
        alertBox.className = 'form-alert form-alert-error';
        alertBox.textContent = 'Please enter a valid tracking number.';
        alertBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> Updating...';
    }

    try {
      const response = await api.request(`orders/${orderId}/update-fulfillment/`, {
        method: 'POST',
        body: {
          courier_name: courierName,
          tracking_number: trackingNumber,
          status: status
        }
      });

      const idx = allOrders.findIndex(o => o.id === Number(orderId));
      if (idx !== -1 && response.order) {
        allOrders[idx] = response.order;
      } else if (idx !== -1) {
        allOrders[idx].courier_name = courierName;
        allOrders[idx].tracking_number = trackingNumber;
        allOrders[idx].status = status;
      }

      window.closeShippingModal();
      window.switchOrdersTab(activeOrdersTab);
      if (window.showToast) {
        window.showToast(`Order #ORD-${String(orderId).padStart(5, '0')} updated with ${courierName} tracking!`, 'success');
      }
    } catch (err) {
      if (alertBox) {
        alertBox.className = 'form-alert form-alert-error';
        alertBox.textContent = err.message || 'Failed to update courier tracking.';
        alertBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Shipment';
      }
    }
  };

  // -------------------------------------------------------------------
  // Maker Pro SaaS Tier Modal Handlers
  // -------------------------------------------------------------------
  window.openMakerProModal = function() {
    const modal = document.getElementById('maker-pro-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeMakerProModal = function() {
    const modal = document.getElementById('maker-pro-modal');
    if (modal) modal.style.display = 'none';
  };

  window.activateMakerProDemo = async function() {
    const btn = document.getElementById('btn-activate-maker-pro');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> Activating Maker Pro...';
    }

    setTimeout(() => {
      window.closeMakerProModal();
      const badge = document.getElementById('current-maker-tier-badge');
      if (badge) {
        badge.innerHTML = '<span style="color: #ffaa00; font-weight: 800;">Maker Pro Tier (0% Commission Active)</span>';
      }
      if (window.showToast) {
        window.showToast('Congratulations! Maker Pro SaaS Membership Activated (0% Take Rate & Gold Verified).', 'success');
      }
    }, 900);
  };

  window.quickUpgradeToSeller = async function(newRole = 'both') {
    try {
      await api.auth.updateProfile({ role: newRole });
      if (window.showToast) showToast('Role upgraded! You can now publish projects and receive hardware sales.', 'success');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      if (window.showToast) showToast(err.message || 'Failed to update role.', 'error');
    }
  };

  async function loadDashboard() {
    const mainContainer = document.getElementById('dashboard-main-container');
    const topActions = document.getElementById('dashboard-top-actions');
    if (!mainContainer) return;

    try {
      currentUser = auth ? await auth.getUser(true) : (api?.auth ? await api.auth.me() : null);
      
      if (!currentUser || !currentUser.username) {
        if (topActions) topActions.style.display = 'none';
        mainContainer.innerHTML = `
          <div class="card-cyber" style="padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
            <div style="width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.25); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 28px; color: var(--accent-cyan);">lock</span>
            </div>
            <h3 style="font-size: 1.3rem; margin-bottom: 8px; font-weight: 700;">Authentication Required</h3>
            <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 24px; font-size: 0.95rem; line-height: 1.5;">
              Please sign in or create an account to view and respond to project inquiries, hardware orders, and customer messages.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <a href="/login/?next=/dashboard/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">login</span>
                Sign In
              </a>
              <a href="/register/?next=/dashboard/" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">person_add</span>
                Create Account
              </a>
            </div>
          </div>
        `;
        return;
      }

      if (topActions) topActions.style.display = 'flex';
      mainContainer.innerHTML = getDashboardStructureHtml();

      const role = (currentUser.role || 'both').toLowerCase();
      const greeting = document.getElementById('dashboard-greeting');
      const hudLabel = document.getElementById('dashboard-hud-label');
      const subtitle = document.getElementById('dashboard-subtitle');
      const ordersTitle = document.getElementById('dashboard-orders-title');
      const ordersSubtitle = document.getElementById('dashboard-orders-subtitle');
      const makerProBanner = document.getElementById('maker-pro-banner');

      const isAdmin = currentUser.is_staff || currentUser.is_superuser || currentUser.role === 'admin';

      if (isAdmin) {
        activeOrdersTab = 'sales';
        if (greeting) greeting.textContent = `Administrator Dashboard • ${currentUser.first_name || currentUser.username}`;
        if (hudLabel) hudLabel.textContent = 'ADMIN & CREATOR HUB • SRI LANKA';
        if (subtitle) subtitle.textContent = 'Manage hardware blueprints, review system operations, track shipments, and view order receipts.';
        if (makerProBanner) makerProBanner.style.display = 'none';
        if (topActions) {
          topActions.innerHTML = `
            <a href="/admin-panel/" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; color: var(--status-online); border-color: rgba(0, 168, 107, 0.35);">
              <span class="material-symbols-outlined" style="font-size: 18px;">admin_panel_settings</span>
              Admin Panel
            </a>
            <a href="/create-project/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
              Post Project
            </a>
          `;
        }
      } else if (role === 'buyer') {
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
        // Both (Buyer & Seller)
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

  function initDashboard() {
    if (document.getElementById('dashboard-main-container')) {
      loadDashboard();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

  window.addEventListener('page:loaded', () => {
    if (document.getElementById('dashboard-main-container')) {
      initDashboard();
    }
  });
})();
