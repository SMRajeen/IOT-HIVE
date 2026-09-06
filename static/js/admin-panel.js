function initAdminPanel() {
  if (!window.location.pathname.startsWith('/admin-panel')) return;
  initAdminTabs();
  loadAdminStats();
}

document.addEventListener('DOMContentLoaded', initAdminPanel);
window.addEventListener('page:loaded', initAdminPanel);

function formatLKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(`tab-${target}`);
      if (targetContent) targetContent.style.display = 'block';

      if (target === 'projects') loadAdminProjects();
      if (target === 'users') loadAdminUsers();
      if (target === 'categories') loadAdminCategories();
      if (target === 'orders') loadAdminOrders();
      if (target === 'exports') loadAdminExports();
    });
  });
}

async function loadAdminStats() {
  const statUsers = document.getElementById('stat-total-users');
  if (!statUsers || !window.location.pathname.startsWith('/admin-panel')) return;

  try {
    const stats = await API.admin.stats();
    if (!document.getElementById('stat-total-users')) return;
    document.getElementById('stat-total-users').textContent = stats.total_users;
    document.getElementById('stat-total-projects').textContent = stats.total_projects;
    document.getElementById('stat-total-inquiries').textContent = stats.total_inquiries;
    document.getElementById('stat-total-revenue').textContent = formatLKR(stats.total_revenue);
    document.getElementById('stat-total-orders').textContent = stats.total_orders;
  } catch (err) {
    if (window.location.pathname.startsWith('/admin-panel')) {
      if (window.showToast) showToast('Admin authorization required.', 'error');
      window.location.href = '/login/?next=/admin-panel/';
    }
  }
}

async function loadAdminProjects() {
  const container = document.getElementById('admin-projects-table-container');
  if (!container || !window.location.pathname.startsWith('/admin-panel')) return;

  try {
    const projects = await API.admin.projects();
    if (!projects.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No projects created yet.</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="table-cyber">
          <thead>
            <tr>
              <th style="white-space: nowrap;">ID</th>
              <th style="white-space: nowrap;">Title</th>
              <th style="white-space: nowrap;">Creator</th>
              <th style="white-space: nowrap;">Category</th>
              <th style="white-space: nowrap;">Price</th>
              <th style="white-space: nowrap;">Status</th>
              <th style="white-space: nowrap;">Featured</th>
              <th style="white-space: nowrap;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map(p => `
              <tr>
                <td class="font-mono" style="white-space: nowrap;">#${p.id}</td>
                <td style="min-width: 180px;"><strong><a href="/project/${p.id}/" class="text-link">${Auth.escapeHtml(p.title)}</a></strong></td>
                <td style="white-space: nowrap;">@${Auth.escapeHtml(p.seller_username || 'creator')}</td>
                <td style="white-space: nowrap;"><span class="tag-mono">${Auth.escapeHtml(p.category_name || 'General')}</span></td>
                <td class="font-mono font-bold" style="white-space: nowrap; color: var(--status-online);">${p.is_free ? 'FREE' : formatLKR(p.price)}</td>
                <td style="white-space: nowrap;">
                  <span class="badge-status ${p.status === 'published' ? 'online' : 'standby'}">
                    ${(p.status || 'published').toUpperCase()}
                  </span>
                </td>
                <td style="white-space: nowrap;">
                  <button class="btn btn-ghost btn-xs" style="white-space: nowrap;" onclick="toggleProjectFeatured(${p.id}, ${!p.featured})">
                    ${p.featured ? '<span style="color: #ffb700;">★ Featured</span>' : '☆ Standard'}
                  </button>
                </td>
                <td style="white-space: nowrap;">
                  <div class="flex items-center gap-2" style="white-space: nowrap;">
                    <button class="btn btn-ghost btn-xs" style="white-space: nowrap;" onclick="toggleProjectStatus(${p.id}, '${p.status === 'published' ? 'draft' : 'published'}')">
                      ${p.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button class="btn btn-ghost btn-xs" style="color: #ff5357; white-space: nowrap;" onclick="deleteProjectAsAdmin(${p.id})">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-table-container');
  if (!container || !window.location.pathname.startsWith('/admin-panel')) return;

  try {
    const data = await API.admin.users();
    const users = Array.isArray(data) ? data : (data.results || []);
    if (!users.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No users registered yet.</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="table-cyber">
          <thead>
            <tr>
              <th style="white-space: nowrap;">ID</th>
              <th style="white-space: nowrap;">User</th>
              <th style="white-space: nowrap;">Email</th>
              <th style="white-space: nowrap;">Role</th>
              <th style="white-space: nowrap;">Phone</th>
              <th style="white-space: nowrap;">Admin Status</th>
              <th style="white-space: nowrap;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td class="font-mono" style="white-space: nowrap;">#${u.id}</td>
                <td style="white-space: nowrap;">
                  <div class="flex items-center gap-2" style="white-space: nowrap;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--bg-surface-high); border: 1px solid var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <span class="material-symbols-outlined" style="font-size: 14px; color: var(--primary);">person</span>
                    </div>
                    <strong>@${Auth.escapeHtml(u.username)}</strong>
                    ${u.first_name ? `<span class="text-xs text-muted">(${Auth.escapeHtml(u.first_name)} ${Auth.escapeHtml(u.last_name || '')})</span>` : ''}
                  </div>
                </td>
                <td class="font-mono text-xs" style="white-space: nowrap;">${Auth.escapeHtml(u.email || 'None')}</td>
                <td style="white-space: nowrap;"><span class="tag-mono" style="text-transform: capitalize;">${Auth.escapeHtml(u.role || 'both')}</span></td>
                <td class="font-mono text-xs" style="white-space: nowrap;">${Auth.escapeHtml(u.phone_number || '-')}</td>
                <td style="white-space: nowrap;">
                  ${(u.is_staff || u.is_superuser) 
                    ? '<span class="badge-status online" style="color: var(--status-online); white-space: nowrap;">ADMIN / STAFF</span>' 
                    : '<span class="badge-status standby" style="white-space: nowrap;">STANDARD</span>'}
                </td>
                <td style="white-space: nowrap;">
                  <div class="flex items-center gap-2" style="white-space: nowrap;">
                    <button class="btn btn-ghost btn-xs" style="white-space: nowrap;" onclick="toggleAdminStaff(${u.id}, ${!u.is_staff})">
                      ${u.is_staff ? 'Revoke Staff' : 'Make Staff'}
                    </button>
                    <button class="btn btn-ghost btn-xs" style="color: #ff5357; white-space: nowrap;" onclick="deleteUserAsAdmin(${u.id})">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminCategories() {
  const container = document.getElementById('admin-categories-table-container');
  if (!container || !window.location.pathname.startsWith('/admin-panel')) return;

  try {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;"><span class="material-symbols-outlined spin" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">sync</span>Loading categories...</p>';
    const data = await API.categories.list();
    const categories = Array.isArray(data) ? data : (data.results || []);

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--primary); margin-bottom: 8px; display: block;">category</span>
          <p style="margin: 0 0 8px 0; font-size: 1.05rem; color: var(--text-primary); font-weight: 600;">No categories in database yet.</p>
          <p style="margin: 0 0 16px 0; font-size: 0.88rem;">Click below or use 'Create New Category' to initialize the platform hardware taxonomy.</p>
          <button type="button" onclick="window.seedDefaultCategories()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span>
            Seed Standard Hardware Categories
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="table-cyber">
          <thead>
            <tr>
              <th style="white-space: nowrap;">Icon</th>
              <th style="white-space: nowrap;">Name</th>
              <th style="white-space: nowrap;">Slug</th>
              <th>Description</th>
              <th style="white-space: nowrap;">Projects</th>
              <th style="white-space: nowrap;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map(c => `
              <tr>
                <td style="white-space: nowrap;">
                  <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(0, 255, 136, 0.12); border: 1px solid rgba(0, 255, 136, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: var(--status-online);">${c.icon || 'memory'}</span>
                  </div>
                </td>
                <td style="white-space: nowrap;"><strong>${Auth.escapeHtml(c.name)}</strong></td>
                <td style="white-space: nowrap;"><span class="tag-mono" style="font-size: 0.72rem;">${Auth.escapeHtml(c.slug)}</span></td>
                <td class="text-xs" style="min-width: 200px; max-width: 320px; line-height: 1.4; color: var(--text-secondary);">${Auth.escapeHtml(c.description || '-')}</td>
                <td class="font-mono font-bold" style="white-space: nowrap; color: var(--primary);">${c.project_count !== undefined ? c.project_count : 0}</td>
                <td style="white-space: nowrap;">
                  <button class="btn btn-ghost btn-xs" style="color: #ff5357; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" onclick="deleteCategoryAsAdmin('${c.slug}')">
                    <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-table-container');
  if (!container || !window.location.pathname.startsWith('/admin-panel')) return;

  try {
    const orders = await API.admin.orders();
    if (!orders.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No payment orders recorded yet.</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="table-cyber">
          <thead>
            <tr>
              <th style="white-space: nowrap;">Transaction ID</th>
              <th style="white-space: nowrap;">Project</th>
              <th style="white-space: nowrap;">Buyer</th>
              <th style="white-space: nowrap;">Seller</th>
              <th style="white-space: nowrap;">Amount</th>
              <th style="white-space: nowrap;">Status</th>
              <th style="white-space: nowrap;">Courier / Tracking</th>
              <th style="white-space: nowrap;">Date</th>
              <th style="white-space: nowrap;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              const buyerUsername = o.buyer_username || o.buyer_name || (o.buyer ? `User #${o.buyer}` : 'Guest');
              const sellerUsername = o.seller_username || o.seller_name || (o.seller ? `User #${o.seller}` : 'Creator');
              return `
              <tr>
                <td style="white-space: nowrap;"><span class="font-mono" style="color: var(--primary); font-weight: 700;">${Auth.escapeHtml(o.transaction_id || `#${o.id}`)}</span></td>
                <td style="min-width: 180px;"><strong><a href="/project/${o.project}/" class="text-link">${Auth.escapeHtml(o.project_title || 'IoT Project')}</a></strong></td>
                <td style="white-space: nowrap;">@${Auth.escapeHtml(buyerUsername)}</td>
                <td style="white-space: nowrap;">@${Auth.escapeHtml(sellerUsername)}</td>
                <td class="font-mono font-bold" style="white-space: nowrap; color: var(--status-online);">${formatLKR(o.amount)}</td>
                <td style="white-space: nowrap;">
                  <span class="badge-status ${o.status === 'delivered' || o.status === 'paid' ? 'online' : (o.status === 'shipped' ? 'standby' : 'offline')}">
                    ${(o.status || 'paid').toUpperCase()}
                  </span>
                </td>
                <td class="text-xs" style="white-space: nowrap;">
                  ${o.tracking_courier ? `<strong>${Auth.escapeHtml(o.tracking_courier)}:</strong> ` : ''}
                  <span class="font-mono">${Auth.escapeHtml(o.tracking_number || (o.tier_type === 'digital' ? 'Digital Download' : 'Unassigned'))}</span>
                </td>
                <td class="text-xs text-muted" style="white-space: nowrap;">${new Date(o.created_at).toLocaleDateString()}</td>
                <td style="white-space: nowrap;">
                  <button class="btn btn-ghost btn-xs" style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" onclick="openUpdateOrderModal(${o.id}, '${o.status || 'paid'}', '${Auth.escapeHtml(o.tracking_courier || '')}', '${Auth.escapeHtml(o.tracking_number || '')}', '${Auth.escapeHtml(o.notes || '')}')">
                    <span class="material-symbols-outlined" style="font-size: 14px;">edit</span>
                    Update
                  </button>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

// --- Modals & Handlers: User Creation ---

window.openCreateUserModal = function() {
  const m = document.getElementById('create-user-modal');
  if (m) m.style.display = 'flex';
  const alert = document.getElementById('create-user-alert');
  if (alert) alert.style.display = 'none';
};

window.closeCreateUserModal = function() {
  const m = document.getElementById('create-user-modal');
  if (m) m.style.display = 'none';
  const form = document.getElementById('admin-create-user-form');
  if (form) form.reset();
};

window.handleCreateUserSubmit = async function(e) {
  e.preventDefault();
  const alert = document.getElementById('create-user-alert');
  const btn = document.getElementById('create-user-submit-btn');

  const userData = {
    username: document.getElementById('new-user-username').value.trim(),
    email: document.getElementById('new-user-email').value.trim(),
    password: document.getElementById('new-user-password').value,
    first_name: document.getElementById('new-user-first-name').value.trim(),
    last_name: document.getElementById('new-user-last-name').value.trim(),
    role: document.getElementById('new-user-role').value,
    phone_number: document.getElementById('new-user-phone').value.trim(),
    is_staff: document.getElementById('new-user-is-staff').checked,
    is_superuser: document.getElementById('new-user-is-staff').checked,
  };

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Creating User...';

  try {
    const res = await API.admin.createUser(userData);
    if (window.showToast) showToast(res.message || 'User created successfully!', 'success');
    window.closeCreateUserModal();
    loadAdminUsers();
    loadAdminStats();
  } catch (err) {
    alert.className = 'form-alert form-alert-error';
    alert.textContent = err.message || 'Failed to create user.';
    alert.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">person_add</span> Create User';
  }
};

// --- Modals & Handlers: Category Creation ---

window.openCreateCategoryModal = function() {
  const m = document.getElementById('create-category-modal');
  if (m) m.style.display = 'flex';
  const alert = document.getElementById('create-category-alert');
  if (alert) alert.style.display = 'none';
};

window.closeCreateCategoryModal = function() {
  const m = document.getElementById('create-category-modal');
  if (m) m.style.display = 'none';
  const form = document.getElementById('admin-create-category-form');
  if (form) form.reset();
};

window.handleCreateCategorySubmit = async function(e) {
  e.preventDefault();
  const alert = document.getElementById('create-category-alert');
  const btn = document.getElementById('create-cat-submit-btn');

  const catData = {
    name: document.getElementById('new-cat-name').value.trim(),
    slug: document.getElementById('new-cat-slug').value.trim(),
    icon: document.getElementById('new-cat-icon').value.trim() || 'memory',
    description: document.getElementById('new-cat-desc').value.trim(),
  };

  if (!catData.slug) delete catData.slug;

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Saving Category...';

  try {
    await API.categories.create(catData);
    if (window.showToast) showToast('Category created successfully!', 'success');
    window.closeCreateCategoryModal();
    loadAdminCategories();
    loadAdminStats();
  } catch (err) {
    alert.className = 'form-alert form-alert-error';
    alert.textContent = err.message || 'Failed to create category.';
    alert.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Category';
  }
};

window.deleteCategoryAsAdmin = async function(slug) {
  if (!confirm(`Are you sure you want to delete category '${slug}'?`)) return;
  try {
    await API.categories.delete(slug);
    if (window.showToast) showToast('Category deleted successfully.', 'success');
    loadAdminCategories();
    loadAdminStats();
  } catch (err) {
    if (window.showToast) showToast(err.message || 'Failed to delete category.', 'error');
  }
};

// --- Project & User Action Handlers ---

window.toggleProjectFeatured = async function(id, featured) {
  try {
    await API.admin.updateProject(id, { featured });
    if (window.showToast) showToast('Project updated.', 'success');
    loadAdminProjects();
  } catch (err) {
    if (window.showToast) showToast(err.message, 'error');
  }
};

window.toggleProjectStatus = async function(id, status) {
  try {
    await API.admin.updateProject(id, { status });
    if (window.showToast) showToast(`Project status changed to ${status}.`, 'success');
    loadAdminProjects();
  } catch (err) {
    if (window.showToast) showToast(err.message, 'error');
  }
};

window.deleteProjectAsAdmin = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this project?')) return;
  try {
    await API.admin.deleteProject(id);
    if (window.showToast) showToast('Project deleted.', 'success');
    loadAdminProjects();
    loadAdminStats();
  } catch (err) {
    if (window.showToast) showToast(err.message, 'error');
  }
};

window.toggleAdminStaff = async function(id, is_staff) {
  try {
    await API.admin.updateUser(id, { is_staff });
    if (window.showToast) showToast('User staff status updated.', 'success');
    loadAdminUsers();
  } catch (err) {
    if (window.showToast) showToast(err.message, 'error');
  }
};

window.deleteUserAsAdmin = async function(id) {
  if (!confirm('Are you sure you want to delete this user account?')) return;
  try {
    await API.admin.deleteUser(id);
    if (window.showToast) showToast('User deleted.', 'success');
    loadAdminUsers();
    loadAdminStats();
  } catch (err) {
    if (window.showToast) showToast(err.message, 'error');
  }
};

window.seedDefaultCategories = async function() {
  const defaults = [
    { name: 'Smart Home', slug: 'smart-home', icon: 'home_iot_device', description: 'Automated ambient lighting, smart relays, energy monitors, and voice-assisted home controllers.' },
    { name: 'Robotics & Autonomous', slug: 'robotics', icon: 'smart_toy', description: 'Autonomous mobile rovers, robotic arms, computer vision payloads, and smart kinematics machines.' },
    { name: 'DIY Electronics', slug: 'electronics', icon: 'memory', description: 'Custom breakout PCBs, microcontroller development modules, sensor shields, and open hardware.' },
    { name: 'Agriculture & Garden', slug: 'agriculture', icon: 'agriculture', description: 'Long-range field telemetry, multispectral moisture sensors, and automated smart farming nodes.' },
    { name: 'Health & Fitness', slug: 'healthcare', icon: 'monitor_heart', description: 'Wearable health monitors, personal wellness gadgets, bio-signal loggers, and smart fitness trackers.' },
    { name: 'Gadgets & Tools', slug: 'gadgets', icon: 'build', description: 'Everyday pocket tools, digital desk displays, custom macro controllers, and wireless gizmos.' },
    { name: 'Connectivity & LoRaWAN', slug: 'connectivity', icon: 'router', description: 'Long-range packet forwarders, multi-hop mesh relays, and zero-downtime gateway appliances.' },
    { name: 'Edge AI & Compute', slug: 'edge-compute', icon: 'developer_board', description: 'Low-latency edge artificial intelligence, embedded inference engines, and industrial DIN gateways.' }
  ];

  if (window.showToast) showToast('Initializing platform categories...', 'info');

  try {
    for (const cat of defaults) {
      try {
        await API.categories.create(cat);
      } catch (e) {
        // Continue if category already exists
      }
    }
    if (window.showToast) showToast('All standard categories have been created!', 'success');
    loadAdminCategories();
    loadAdminStats();
  } catch (err) {
    if (window.showToast) showToast(err.message || 'Failed to seed categories.', 'error');
  }
};

// --- Modals & Handlers: Order Fulfillment ---

window.openUpdateOrderModal = function(orderId, currentStatus, courier, tracking, notes) {
  const modal = document.getElementById('update-order-modal');
  if (!modal) return;

  document.getElementById('edit-order-id').value = orderId;
  document.getElementById('edit-order-status').value = currentStatus || 'paid';
  document.getElementById('edit-order-courier').value = courier || '';
  document.getElementById('edit-order-tracking').value = tracking || '';
  document.getElementById('edit-order-notes').value = notes || '';

  const alert = document.getElementById('update-order-alert');
  if (alert) alert.style.display = 'none';

  modal.style.display = 'flex';
};

window.closeUpdateOrderModal = function() {
  const modal = document.getElementById('update-order-modal');
  if (modal) modal.style.display = 'none';
};

window.handleUpdateOrderSubmit = async function(e) {
  e.preventDefault();
  const alert = document.getElementById('update-order-alert');
  const btn = document.getElementById('update-order-submit-btn');
  const orderId = document.getElementById('edit-order-id').value;

  const payload = {
    status: document.getElementById('edit-order-status').value,
    tracking_courier: document.getElementById('edit-order-courier').value,
    tracking_number: document.getElementById('edit-order-tracking').value.trim(),
    notes: document.getElementById('edit-order-notes').value.trim(),
  };

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Updating...';

  try {
    const res = await API.admin.updateOrder(orderId, payload);
    if (window.showToast) showToast(res.message || 'Order fulfillment updated!', 'success');
    window.closeUpdateOrderModal();
    loadAdminOrders();
    loadAdminStats();
  } catch (err) {
    alert.className = 'form-alert form-alert-error';
    alert.textContent = err.message || 'Failed to update order fulfillment.';
    alert.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Fulfillment';
  }
};

// ============================================================
// ENTERPRISE EXCEL & DATA REPORT GENERATION
// ============================================================

function generateCSV(headers, rows) {
  const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for seamless Microsoft Excel compatibility
  const csvContent = [
    headers.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      return `"${String(cell).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n');
  return BOM + csvContent;
}

function triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getExportDateStamp() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

const DATASET_CATALOG = [
  {
    id: 'projects',
    title: 'Hardware Projects Database',
    icon: 'memory',
    iconColor: 'var(--primary)',
    description: 'Complete catalog of all IoT, Robotics, and Embedded hardware projects.',
    columns: ['ID', 'Title', 'Creator', 'Category', 'Price (LKR)', 'Free Status', 'Status', 'Featured', 'Difficulty', 'Views', 'Downloads', 'Created Date'],
    fetcher: async () => {
      const data = await API.admin.projects();
      const list = Array.isArray(data) ? data : (data.results || []);
      const headers = ['Project ID', 'Project Title', 'Creator Username', 'Category', 'Price (LKR)', 'Is Free', 'Publication Status', 'Featured Flag', 'Difficulty', 'Views', 'Downloads', 'Created At'];
      const rows = list.map(p => [
        p.id,
        p.title,
        p.seller_username ? `@${p.seller_username}` : '',
        p.category_name || p.category || 'General',
        p.price || 0,
        p.is_free ? 'YES' : 'NO',
        p.status || 'published',
        p.featured ? 'YES' : 'NO',
        p.difficulty || 'Medium',
        p.views || 0,
        p.downloads || 0,
        p.created_at ? new Date(p.created_at).toLocaleString() : ''
      ]);
      return { headers, rows, count: list.length, filename: `IOT-HIVE-Projects-${getExportDateStamp()}.csv` };
    }
  },
  {
    id: 'orders',
    title: 'Orders & Gateway Transactions',
    icon: 'payments',
    iconColor: 'var(--status-online)',
    description: 'Financial ledger of all PayHere gateway transactions, order statuses, and courier tracking.',
    columns: ['Order ID', 'Transaction ID', 'Project ID', 'Project Title', 'Buyer', 'Seller', 'Amount (LKR)', 'Status', 'Gateway', 'Fulfillment', 'Courier', 'Tracking', 'Date'],
    fetcher: async () => {
      const data = await API.admin.orders();
      const list = Array.isArray(data) ? data : (data.results || []);
      const headers = ['Order ID', 'Transaction ID', 'Project ID', 'Project Title', 'Buyer Username', 'Seller Username', 'Amount (LKR)', 'Currency', 'Payment Status', 'Payment Method', 'Fulfillment Type', 'Courier Service', 'Tracking Number', 'Notes', 'Transaction Date'];
      const rows = list.map(o => [
        o.id,
        o.transaction_id || `#${o.id}`,
        o.project || '',
        o.project_title || 'Hardware Kit',
        o.buyer_username || o.buyer_name || (o.buyer ? `User #${o.buyer}` : 'Guest'),
        o.seller_username || o.seller_name || (o.seller ? `User #${o.seller}` : 'Creator'),
        o.amount || 0,
        o.currency || 'LKR',
        (o.status || 'paid').toUpperCase(),
        o.payment_method || 'PAYHERE',
        o.tier_type || o.fulfillment_type || 'physical',
        o.tracking_courier || '',
        o.tracking_number || '',
        o.notes || '',
        o.created_at ? new Date(o.created_at).toLocaleString() : ''
      ]);
      return { headers, rows, count: list.length, filename: `IOT-HIVE-Orders-Transactions-${getExportDateStamp()}.csv` };
    }
  },
  {
    id: 'users',
    title: 'Registered Users & Makers',
    icon: 'group',
    iconColor: 'var(--accent-cyan)',
    description: 'Directory of all makers, buyers, administrators, staff credentials, and phone numbers.',
    columns: ['User ID', 'Username', 'Email', 'First Name', 'Last Name', 'Platform Role', 'Phone Number', 'Is Staff', 'Is Superuser', 'Date Joined'],
    fetcher: async () => {
      const data = await API.admin.users();
      const list = Array.isArray(data) ? data : (data.results || []);
      const headers = ['User ID', 'Username', 'Email', 'First Name', 'Last Name', 'Platform Role', 'Phone Number', 'Is Staff', 'Is Superuser', 'Date Joined'];
      const rows = list.map(u => [
        u.id,
        u.username,
        u.email || '',
        u.first_name || '',
        u.last_name || '',
        u.role || 'both',
        u.phone_number || '',
        u.is_staff ? 'YES' : 'NO',
        u.is_superuser ? 'YES' : 'NO',
        u.date_joined ? new Date(u.date_joined).toLocaleString() : ''
      ]);
      return { headers, rows, count: list.length, filename: `IOT-HIVE-Users-Directory-${getExportDateStamp()}.csv` };
    }
  },
  {
    id: 'inquiries',
    title: 'Custom Inquiries & Requests',
    icon: 'chat',
    iconColor: 'var(--status-warning)',
    description: 'Client custom hardware inquiries, maker project proposals, and commissioned builds.',
    columns: ['Inquiry ID', 'Project Title', 'Client', 'Maker', 'Budget (LKR)', 'Status', 'Target Deadline', 'Created Date'],
    fetcher: async () => {
      let list = [];
      try {
        const data = await API.requests.list();
        list = Array.isArray(data) ? data : (data.results || []);
      } catch (e) {
        list = [];
      }
      const headers = ['Inquiry ID', 'Project Title', 'Client Username', 'Maker Username', 'Budget (LKR)', 'Inquiry Status', 'Target Deadline', 'Created Date'];
      const rows = list.map(i => [
        i.id,
        i.project_title || i.title || 'Custom IoT Build',
        i.client_username || i.client_name || `User #${i.client || ''}`,
        i.maker_username || i.maker_name || `Maker #${i.maker || ''}`,
        i.budget || 0,
        (i.status || 'pending').toUpperCase(),
        i.deadline ? new Date(i.deadline).toLocaleDateString() : 'Flexible',
        i.created_at ? new Date(i.created_at).toLocaleString() : ''
      ]);
      return { headers, rows, count: list.length, filename: `IOT-HIVE-Inquiries-Requests-${getExportDateStamp()}.csv` };
    }
  },
  {
    id: 'categories',
    title: 'Hardware Categories & Taxonomy',
    icon: 'category',
    iconColor: 'var(--status-online)',
    description: 'Platform hierarchy of hardware sectors, components, and project allocation.',
    columns: ['Category ID', 'Category Name', 'Slug', 'Project Count', 'Icon Name', 'Description'],
    fetcher: async () => {
      const data = await API.categories.list();
      const list = Array.isArray(data) ? data : (data.results || []);
      const headers = ['Category ID', 'Category Name', 'Slug', 'Project Count', 'Icon Name', 'Description'];
      const rows = list.map(c => [
        c.id,
        c.name,
        c.slug,
        c.project_count !== undefined ? c.project_count : 0,
        c.icon || 'memory',
        c.description || ''
      ]);
      return { headers, rows, count: list.length, filename: `IOT-HIVE-Categories-Taxonomy-${getExportDateStamp()}.csv` };
    }
  },
  {
    id: 'metrics',
    title: 'Platform Overview & KPI Summary',
    icon: 'analytics',
    iconColor: 'var(--primary)',
    description: 'Executive summary of gross merchandise value, user growth, and transaction velocity.',
    columns: ['Metric Name', 'Value', 'Unit / Currency', 'Description', 'Report Timestamp'],
    fetcher: async () => {
      const stats = await API.admin.stats();
      const headers = ['Metric Name', 'Value', 'Unit / Currency', 'Description', 'Generated Timestamp'];
      const nowStr = new Date().toLocaleString();
      const rows = [
        ['Total Registered Users', stats.total_users || 0, 'Accounts', 'All active makers, buyers, and administrators', nowStr],
        ['Total Published Projects', stats.total_projects || 0, 'Hardware Blueprints', 'Verified hardware projects across categories', nowStr],
        ['Total Project Inquiries', stats.total_inquiries || 0, 'Inquiries', 'Client-to-maker hardware customization requests', nowStr],
        ['Total Gross Revenue', stats.total_revenue || 0, 'LKR (Sri Lankan Rupees)', 'Aggregate completed platform GMV volume', nowStr],
        ['Total Completed Orders', stats.total_orders || 0, 'Transactions', 'Completed hardware and digital purchases', nowStr]
      ];
      return { headers, rows, count: rows.length, filename: `IOT-HIVE-Platform-Summary-${getExportDateStamp()}.csv` };
    }
  }
];

async function loadAdminExports() {
  const tbody = document.getElementById('admin-export-table-tbody');
  if (!tbody || !window.location.pathname.startsWith('/admin-panel')) return;

  tbody.innerHTML = DATASET_CATALOG.map(ds => `
    <tr>
      <td style="white-space: nowrap; vertical-align: middle; text-align: left;">
        <div class="flex items-center gap-3">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(0, 240, 255, 0.08); border: 1px solid var(--border-medium); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span class="material-symbols-outlined" style="font-size: 20px; color: ${ds.iconColor};">${ds.icon}</span>
          </div>
          <div>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem; line-height: 1.2;">${ds.title}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 3px;">DATASET_ID: ${ds.id.toUpperCase()}</div>
          </div>
        </div>
      </td>
      <td style="vertical-align: middle; text-align: left;">
        <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; max-width: 520px;">
          ${ds.description}
        </div>
      </td>
      <td style="white-space: nowrap; vertical-align: middle; text-align: left;">
        <span class="tag-mono" style="color: var(--status-online); font-weight: 600; font-size: 0.72rem;">
          EXCEL (.CSV UTF-8)
        </span>
      </td>
      <td style="white-space: nowrap; vertical-align: middle; text-align: left;">
        <span class="badge-status online" id="export-status-${ds.id}">
          READY FOR EXPORT
        </span>
      </td>
      <td style="white-space: nowrap; vertical-align: middle; text-align: left;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-export-${ds.id}" onclick="window.exportAdminDataset('${ds.id}')" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
          Download Excel
        </button>
      </td>
    </tr>
  `).join('');
}

window.exportAdminDataset = async function(datasetType) {
  if (datasetType === 'master') {
    return window.exportMasterExcel();
  }

  const ds = DATASET_CATALOG.find(d => d.id === datasetType);
  if (!ds) {
    if (window.showToast) showToast('Unknown dataset requested.', 'error');
    return;
  }

  const btn = document.getElementById(`btn-export-${ds.id}`);
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> Generating...';
  }

  try {
    if (window.showToast) showToast(`Preparing ${ds.title} Excel export...`, 'info');
    const { headers, rows, filename } = await ds.fetcher();
    const csvData = generateCSV(headers, rows);
    triggerDownload(csvData, filename);
    if (window.showToast) showToast(`Downloaded ${filename} successfully!`, 'success');
  } catch (err) {
    console.error('Export error:', err);
    if (window.showToast) showToast(`Export failed: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
};

window.exportMasterExcel = async function() {
  if (window.showToast) showToast('Compiling Master Platform Excel Report...', 'info');

  try {
    const BOM = '\uFEFF';
    let combinedSections = [];
    const dateStamp = getExportDateStamp();

    for (const ds of DATASET_CATALOG) {
      try {
        const { headers, rows } = await ds.fetcher();
        const sectionHeader = `=== ${ds.title.toUpperCase()} (Total Records: ${rows.length}) ===`;
        const sectionCsv = [
          `"${sectionHeader}"`,
          headers.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
          ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');

        combinedSections.push(sectionCsv);
      } catch (e) {
        console.warn(`Failed to export sub-dataset ${ds.id}:`, e);
      }
    }

    const fullMasterCsv = BOM + combinedSections.join('\r\n\r\n');
    triggerDownload(fullMasterCsv, `IOT-HIVE-Master-System-Report-${dateStamp}.csv`);
    if (window.showToast) showToast('Master Excel report downloaded successfully!', 'success');
  } catch (err) {
    console.error('Master export error:', err);
    if (window.showToast) showToast(`Master export failed: ${err.message}`, 'error');
  }
};


