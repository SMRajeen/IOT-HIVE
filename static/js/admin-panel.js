/**
 * IoT HIVE - Administration Panel Controller
 * Features: User Creation, Role Management, Category CRUD, Project Moderation, and Revenue Tracking
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminTabs();
  loadAdminStats();
});

function formatLKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
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
    });
  });
}

async function loadAdminStats() {
  try {
    const stats = await API.admin.stats();
    document.getElementById('stat-total-users').textContent = stats.total_users;
    document.getElementById('stat-total-projects').textContent = stats.total_projects;
    document.getElementById('stat-total-inquiries').textContent = stats.total_inquiries;
    document.getElementById('stat-total-revenue').textContent = formatLKR(stats.total_revenue);
    document.getElementById('stat-total-orders').textContent = stats.total_orders;
  } catch (err) {
    if (window.showToast) showToast('Admin authorization required.', 'error');
    window.location.href = '/login/?next=/admin-panel/';
  }
}

async function loadAdminProjects() {
  const container = document.getElementById('admin-projects-table-container');
  if (!container) return;

  try {
    const projects = await API.admin.projects();
    if (!projects.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No projects created yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table-cyber">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Creator</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${projects.map(p => `
            <tr>
              <td class="font-mono">#${p.id}</td>
              <td><strong><a href="/project/${p.id}/" class="text-link">${p.title}</a></strong></td>
              <td>@${p.seller_username}</td>
              <td><span class="tag-mono">${p.category_name || 'General'}</span></td>
              <td class="font-mono font-bold">${p.is_free ? 'FREE' : formatLKR(p.price)}</td>
              <td>
                <span class="badge-status ${p.status === 'published' ? 'online' : 'standby'}">
                  ${p.status.toUpperCase()}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-xs" onclick="toggleProjectFeatured(${p.id}, ${!p.featured})">
                  ${p.featured ? '<span style="color: #ffb700;">★ Featured</span>' : '☆ Standard'}
                </button>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-xs" onclick="toggleProjectStatus(${p.id}, '${p.status === 'published' ? 'draft' : 'published'}')">
                    ${p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button class="btn btn-ghost btn-xs" style="color: #ff5357;" onclick="deleteProjectAsAdmin(${p.id})">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-table-container');
  if (!container) return;

  try {
    const users = await API.admin.users();
    container.innerHTML = `
      <table class="table-cyber">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Admin Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td class="font-mono">#${u.id}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--bg-surface-high); border: 1px solid var(--primary); display: flex; align-items: center; justify-content: center;">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--primary);">person</span>
                  </div>
                  <strong>@${u.username}</strong>
                  ${u.first_name ? `<span class="text-xs text-muted">(${u.first_name} ${u.last_name || ''})</span>` : ''}
                </div>
              </td>
              <td class="font-mono text-xs">${u.email || 'None'}</td>
              <td><span class="tag-mono" style="text-transform: capitalize;">${u.role || 'both'}</span></td>
              <td class="font-mono text-xs">${u.phone_number || '-'}</td>
              <td>
                ${(u.is_staff || u.is_superuser) 
                  ? '<span class="badge-status online" style="color: #00ff88;">ADMIN / STAFF</span>' 
                  : '<span class="badge-status standby">STANDARD</span>'}
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-xs" onclick="toggleAdminStaff(${u.id}, ${!u.is_staff})">
                    ${u.is_staff ? 'Revoke Staff' : 'Make Staff'}
                  </button>
                  <button class="btn btn-ghost btn-xs" style="color: #ff5357;" onclick="deleteUserAsAdmin(${u.id})">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminCategories() {
  const container = document.getElementById('admin-categories-table-container');
  if (!container) return;

  try {
    const categories = await API.categories.list();
    container.innerHTML = `
      <table class="table-cyber">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Slug</th>
            <th>Description</th>
            <th>Projects</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${categories.map(c => `
            <tr>
              <td>
                <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(0, 255, 136, 0.12); border: 1px solid rgba(0, 255, 136, 0.3); display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: #00ff88;">${c.icon || 'memory'}</span>
                </div>
              </td>
              <td><strong>${c.name}</strong></td>
              <td class="font-mono text-xs">${c.slug}</td>
              <td class="text-xs" style="max-width: 320px;">${c.description}</td>
              <td class="font-mono font-bold">${c.project_count || 0}</td>
              <td>
                <button class="btn btn-ghost btn-xs" style="color: #ff5357;" onclick="deleteCategoryAsAdmin('${c.slug}')">
                  <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                  Delete
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: #ff5357; text-align: center; padding: 20px;">${err.message}</p>`;
  }
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-table-container');
  if (!container) return;

  try {
    const orders = await API.admin.orders();
    if (!orders.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No payment orders recorded yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table-cyber">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Project</th>
            <th>Buyer</th>
            <th>Seller</th>
            <th>Amount</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td class="font-mono" style="color: var(--primary); font-weight: 700;">${o.transaction_id || `#${o.id}`}</td>
              <td><strong><a href="/project/${o.project}/" class="text-link">${o.project_title}</a></strong></td>
              <td>@${o.buyer_name}</td>
              <td>@${o.seller_name}</td>
              <td class="font-mono font-bold" style="color: #00ff88;">${formatLKR(o.amount)}</td>
              <td class="text-xs">${o.payment_method || 'Card'} (${o.card_last4 ? '•••• ' + o.card_last4 : 'Direct'})</td>
              <td><span class="badge-status online">${(o.status || 'paid').toUpperCase()}</span></td>
              <td class="text-xs text-muted">${new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
