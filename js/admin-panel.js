/**
 * IoT HIVE - Administration Panel Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminTabs();
  loadAdminStats();
});

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
    document.getElementById('stat-total-revenue').textContent = `$${Number(stats.total_revenue).toFixed(2)}`;
    document.getElementById('stat-total-orders').textContent = stats.total_orders;
  } catch (err) {
    showToast('Admin authorization required.', 'error');
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
              <td><strong><a href="/project/?id=${p.id}" class="text-link">${p.title}</a></strong></td>
              <td>@${p.seller_username}</td>
              <td><span class="tag-mono">${p.category_name || 'General'}</span></td>
              <td class="font-mono font-bold">${p.is_free ? 'FREE' : '$' + Number(p.price).toFixed(2)}</td>
              <td>
                <span class="badge-status ${p.status === 'published' ? 'online' : 'standby'}">
                  ${p.status.toUpperCase()}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="toggleProjectFeatured(${p.id}, ${!p.featured})">
                  ${p.featured ? '&#9733; Featured' : '&#9734; Regular'}
                </button>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-sm" onclick="toggleProjectStatus(${p.id}, '${p.status === 'published' ? 'draft' : 'published'}')">
                    ${p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button class="btn btn-ghost btn-sm" style="color: #ff5357;" onclick="deleteProjectAsAdmin(${p.id})">
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
              <td><span class="tag-mono" style="text-transform: capitalize;">${u.role}</span></td>
              <td>
                ${(u.is_staff || u.is_superuser) 
                  ? '<span class="badge-status online">ADMIN / STAFF</span>' 
                  : '<span class="badge-status standby">STANDARD</span>'}
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-sm" onclick="toggleAdminStaff(${u.id}, ${!u.is_staff})">
                    ${u.is_staff ? 'Revoke Staff' : 'Make Staff'}
                  </button>
                  <button class="btn btn-ghost btn-sm" style="color: #ff5357;" onclick="deleteUserAsAdmin(${u.id})">
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
          </tr>
        </thead>
        <tbody>
          ${categories.map(c => `
            <tr>
              <td>
                <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(255, 0, 51, 0.12); border: 1px solid rgba(255, 0, 51, 0.3); display: flex; align-items: center; justify-content: center;">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--primary);">${c.icon || 'device_hub'}</span>
                </div>
              </td>
              <td><strong>${c.name}</strong></td>
              <td class="font-mono text-xs">${c.slug}</td>
              <td class="text-xs" style="max-width: 320px;">${c.description}</td>
              <td class="font-mono font-bold">${c.project_count || 0}</td>
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
              <td class="font-mono" style="color: var(--primary); font-weight: 700;">${o.transaction_id}</td>
              <td><strong><a href="/project/?id=${o.project}" class="text-link">${o.project_title}</a></strong></td>
              <td>@${o.buyer_name}</td>
              <td>@${o.seller_name}</td>
              <td class="font-mono font-bold" style="color: #00ff88;">$${Number(o.amount).toFixed(2)}</td>
              <td class="text-xs">${o.payment_method} (${o.card_last4 ? '???? ' + o.card_last4 : 'Card'})</td>
              <td><span class="badge-status online">${o.status.toUpperCase()}</span></td>
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

window.toggleProjectFeatured = async function(id, featured) {
  try {
    await API.admin.updateProject(id, { featured });
    showToast('Project updated.', 'success');
    loadAdminProjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.toggleProjectStatus = async function(id, status) {
  try {
    await API.admin.updateProject(id, { status });
    showToast(`Project status changed to ${status}.`, 'success');
    loadAdminProjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteProjectAsAdmin = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this project?')) return;
  try {
    await API.admin.deleteProject(id);
    showToast('Project deleted.', 'success');
    loadAdminProjects();
    loadAdminStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.toggleAdminStaff = async function(id, is_staff) {
  try {
    await API.admin.updateUser(id, { is_staff });
    showToast('User staff status updated.', 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteUserAsAdmin = async function(id) {
  if (!confirm('Are you sure you want to delete this user account?')) return;
  try {
    await API.admin.deleteUser(id);
    showToast('User deleted.', 'success');
    loadAdminUsers();
    loadAdminStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
