/**
 * IoT HIVE - Maker Bounty & Custom Hardware Commission Board Controller
 * Phase 3: Verified Bounties, Maker Proposals & Direct Bidding
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  const grid = document.getElementById('bounties-grid');
  const searchInput = document.getElementById('bounty-search');
  const sortSelect = document.getElementById('bounty-sort');
  const categoryPills = document.getElementById('bounty-category-pills');

  let activeCategory = 'all';
  let currentUser = null;
  let allBounties = [];
  let currentBounty = null;
  let debounceTimer = null;

  function formatLKR(amount) {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function renderBountyCard(bounty) {
    const isOwner = currentUser && bounty.client === currentUser.id;
    const clientName = bounty.client_name || bounty.client_username || 'Client';
    const statusClass = `bounty-status-${bounty.status}`;
    const statusLabel = bounty.status === 'open' ? 'Open for Bids' : (bounty.status === 'in_progress' ? 'Awarded / In Progress' : 'Completed');

    return `
      <div class="bounty-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <span class="tag-mono" style="background: rgba(0,229,255,0.08); color: var(--primary); border: 1px solid rgba(0,229,255,0.25);">
              ${auth.escapeHtml(bounty.category_name || 'Hardware')}
            </span>
            <span class="bounty-status-tag ${statusClass}">
              <span class="dot" style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
              ${statusLabel}
            </span>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
            Posted by <strong>${auth.escapeHtml(clientName)}</strong> &bull; ${bounty.created_formatted || 'Recently'}
          </div>

          <h3 style="font-size: 1.15rem; line-height: 1.35; margin: 0 0 10px; color: var(--text-primary);">
            ${auth.escapeHtml(bounty.title)}
          </h3>

          <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${auth.escapeHtml(bounty.description)}
          </p>

          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
            ${bounty.preferred_mcu ? `
              <span class="hardware-chip" style="font-size: 0.72rem;">
                <span class="material-symbols-outlined" style="font-size: 13px;">memory</span>
                ${auth.escapeHtml(bounty.preferred_mcu)}
              </span>
            ` : ''}
            ${bounty.connectivity ? `
              <span class="hardware-chip" style="font-size: 0.72rem; color: #00ff88; border-color: rgba(0,255,136,0.3); background: rgba(0,255,136,0.08);">
                <span class="material-symbols-outlined" style="font-size: 13px;">wifi</span>
                ${auth.escapeHtml(bounty.connectivity)}
              </span>
            ` : ''}
            <span class="hardware-chip" style="font-size: 0.72rem; color: var(--status-warning); border-color: rgba(255,183,0,0.3); background: rgba(255,183,0,0.08);">
              <span class="material-symbols-outlined" style="font-size: 13px;">schedule</span>
              ${bounty.deadline_days} Days
            </span>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-family: var(--font-mono);">BUDGET</div>
            <div class="bounty-budget-badge">${formatLKR(bounty.budget)}</div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button onclick="window.openBountyDetailModal(${bounty.id})" class="btn btn-secondary btn-sm">
              <span class="material-symbols-outlined" style="font-size: 16px;">description</span>
              Specs &amp; Bids (${bounty.proposals_count || 0})
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function loadBounties() {
    if (!grid) return;
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
        <span class="material-symbols-outlined spin" style="font-size: 32px; color: var(--primary);">sync</span>
        <p style="margin-top: 8px;">Loading hardware commission bounties...</p>
      </div>
    `;

    const params = {};
    if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.search = q;
    const sort = sortSelect ? sortSelect.value : 'latest';
    if (sort === 'budget-desc') params.ordering = 'budget-desc';
    if (sort === 'budget-asc') params.ordering = 'budget-asc';
    if (sort === 'deadline') params.ordering = 'deadline';

    try {
      const data = await api.bounties.list(params);
      allBounties = Array.isArray(data) ? data : (data.results || []);

      // Calculate KPI metrics
      const activeCount = allBounties.filter(b => b.status === 'open').length;
      let totalPool = 0;
      allBounties.forEach(b => totalPool += Number(b.budget || 0));

      const kpiActive = document.getElementById('kpi-active-bounties');
      if (kpiActive) kpiActive.textContent = activeCount;

      const kpiPool = document.getElementById('kpi-bounty-pool');
      if (kpiPool) kpiPool.textContent = formatLKR(totalPool);

      const kpiMakers = document.getElementById('kpi-makers-count');
      if (kpiMakers) kpiMakers.textContent = '48+';

      if (allBounties.length === 0) {
        grid.innerHTML = `
          <div class="card-cyber" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 40px; color: var(--text-muted); margin-bottom: 8px;">radar</span>
            <h3>No Bounties Found</h3>
            <p style="color: var(--text-muted); margin-bottom: 16px;">Be the first to post a custom hardware commission requirement!</p>
            <button onclick="window.openCreateBountyModal()" class="btn btn-primary">
              <span class="material-symbols-outlined">post_add</span> Post a Bounty
            </button>
          </div>
        `;
        return;
      }

      grid.innerHTML = allBounties.map(renderBountyCard).join('');
    } catch (err) {
      grid.innerHTML = `
        <div class="card-cyber" style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--status-warning);">
          Unable to load bounty board at this time.
        </div>
      `;
    }
  }

  async function loadCategories() {
    try {
      const data = await api.categories.list();
      const cats = Array.isArray(data) ? data : (data.results || []);

      if (categoryPills) {
        let html = `<button class="filter-pill ${activeCategory === 'all' ? 'active' : ''}" data-slug="all">All Bounties</button>`;
        cats.forEach(c => {
          html += `<button class="filter-pill ${activeCategory === c.slug ? 'active' : ''}" data-slug="${c.slug}">${auth.escapeHtml(c.name)}</button>`;
        });
        categoryPills.innerHTML = html;

        categoryPills.querySelectorAll('.filter-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            categoryPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.slug;
            loadBounties();
          });
        });
      }

      const catSelect = document.getElementById('bounty-category-select');
      if (catSelect) {
        catSelect.innerHTML = `<option value="">Select Category</option>` +
          cats.map(c => `<option value="${c.id}">${auth.escapeHtml(c.name)}</option>`).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Modal Openers & Handlers ---

  window.openCreateBountyModal = () => {
    if (!currentUser) {
      if (window.showToast) showToast('Please log in to post a custom hardware bounty.', 'info');
      setTimeout(() => window.location.href = '/login/?next=/bounties/', 800);
      return;
    }
    const modal = document.getElementById('create-bounty-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeCreateBountyModal = () => {
    const modal = document.getElementById('create-bounty-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleCreateBountySubmit = async (e) => {
    e.preventDefault();
    const form = document.getElementById('create-bounty-form');
    const btn = document.getElementById('create-bounty-submit-btn');
    const alert = document.getElementById('create-bounty-alert');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Publishing...';

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      await api.bounties.create(payload);

      window.closeCreateBountyModal();
      form.reset();
      if (window.showToast) showToast('Hardware bounty published to the community board!', 'success');
      await loadBounties();
    } catch (err) {
      if (alert) {
        alert.className = 'form-alert form-alert-error';
        alert.textContent = err.message || 'Failed to post bounty.';
        alert.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">publish</span> Publish Bounty';
    }
  };

  window.openBountyDetailModal = async (bountyId) => {
    const modal = document.getElementById('bounty-detail-modal');
    const container = document.getElementById('bounty-modal-content');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = `
      <div style="padding: 48px; text-align: center; color: var(--text-muted);">
        <span class="material-symbols-outlined spin" style="font-size: 32px; color: var(--primary);">sync</span>
        <p style="margin-top: 8px;">Loading bounty specifications and proposals...</p>
      </div>
    `;

    try {
      const bounty = await api.bounties.get(bountyId);
      currentBounty = bounty;
      const isOwner = currentUser && bounty.client === currentUser.id;
      const proposals = bounty.proposals || [];

      // Check if current maker already submitted a proposal
      const myProposal = currentUser ? proposals.find(p => p.maker === currentUser.id) : null;

      container.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
            <div class="badge-hud">
              <span class="dot"></span>
              <span class="label">BOUNTY SPECIFICATION</span>
            </div>
            <div class="bounty-budget-badge">${formatLKR(bounty.budget)}</div>
          </div>
          <h2 style="font-size: 1.5rem; margin: 0 0 6px; color: var(--text-primary);">${auth.escapeHtml(bounty.title)}</h2>
          <div style="font-size: 0.82rem; color: var(--text-muted); font-family: var(--font-mono);">
            Client: <strong>${auth.escapeHtml(bounty.client_name || bounty.client_username)}</strong> &bull; Deadline: ${bounty.deadline_days} Days
          </div>
        </div>

        <!-- Specifications HUD Strip -->
        <div class="hardware-spec-grid" style="margin-bottom: 20px;">
          <div class="hardware-spec-card">
            <div class="hardware-spec-label">
              <span class="material-symbols-outlined" style="font-size: 14px; color: var(--primary);">memory</span>
              MCU / Platform
            </div>
            <div class="hardware-spec-val">${auth.escapeHtml(bounty.preferred_mcu || 'Any MCU')}</div>
          </div>
          <div class="hardware-spec-card">
            <div class="hardware-spec-label">
              <span class="material-symbols-outlined" style="font-size: 14px; color: #00ff88;">wifi</span>
              Connectivity
            </div>
            <div class="hardware-spec-val">${auth.escapeHtml(bounty.connectivity || 'Custom')}</div>
          </div>
          <div class="hardware-spec-card">
            <div class="hardware-spec-label">
              <span class="material-symbols-outlined" style="font-size: 14px; color: var(--status-warning);">speed</span>
              Difficulty
            </div>
            <div class="hardware-spec-val">${(bounty.difficulty || 'intermediate').toUpperCase()}</div>
          </div>
        </div>

        <!-- Requirements Description -->
        <div class="card-cyber" style="padding: 20px; background: var(--bg-surface-low); margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px; font-size: 0.95rem; color: var(--primary); font-family: var(--font-mono); text-transform: uppercase;">
            Project Requirements &amp; Scope
          </h4>
          <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6; margin: 0 0 12px; white-space: pre-line;">
            ${auth.escapeHtml(bounty.description)}
          </p>
          <div style="font-size: 0.85rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 8px;">
            <strong>Deliverables:</strong> ${auth.escapeHtml(bounty.deliverables_needed || 'Full schematics and firmware.')}
          </div>
        </div>

        <!-- Proposals / Bids Section -->
        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 1.05rem; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span>Maker Proposals (${proposals.length})</span>
            ${!isOwner && !myProposal && currentUser ? `
              <span class="tag-mono" style="color: #00ff88;">Ready for your proposal</span>
            ` : ''}
          </h4>

          ${proposals.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-surface-low); border-radius: var(--radius-md);">
              No proposals submitted yet. Be the first maker to bid!
            </div>
          ` : proposals.map(p => {
            const isAccepted = p.status === 'accepted';
            return `
              <div class="card-cyber" style="padding: 16px 20px; margin-bottom: 10px; background: var(--bg-surface-low); border: 1px solid ${isAccepted ? '#00ff88' : 'var(--border-subtle)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary);">
                      ${(p.maker_name || p.maker_username).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style="font-size: 0.95rem;">${auth.escapeHtml(p.maker_name || p.maker_username)}</strong>
                      <span class="text-xs" style="color: var(--text-muted); font-family: var(--font-mono); margin-left: 6px;">${p.created_formatted}</span>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div class="font-mono font-bold" style="color: #00ff88; font-size: 1.05rem;">${formatLKR(p.bid_amount)}</div>
                    <div class="text-xs" style="color: var(--text-muted); font-family: var(--font-mono);">${p.delivery_days} Days Delivery</div>
                  </div>
                </div>

                <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.45; margin: 8px 0 10px;">
                  ${auth.escapeHtml(p.pitch)}
                </p>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                  <div>
                    ${isAccepted ? `
                      <span class="verified-buyer-badge">
                        <span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span> Proposal Awarded
                      </span>
                    ` : `<span class="tag-mono" style="font-size: 0.72rem;">Status: ${p.status.toUpperCase()}</span>`}
                  </div>

                  <div class="flex items-center gap-2">
                    ${currentUser && currentUser.id !== p.maker ? `
                      <button onclick="window.startChatWithUser(${p.maker}, '${auth.escapeHtml(p.maker_username)}', null, ${bounty.id})" class="btn btn-ghost btn-xs">
                        <span class="material-symbols-outlined" style="font-size: 13px;">forum</span> Chat
                      </button>
                    ` : ''}

                    ${isOwner && bounty.status === 'open' && !isAccepted ? `
                      <button onclick="window.handleAcceptProposal(${bounty.id}, ${p.id})" class="btn btn-primary btn-xs">
                        <span class="material-symbols-outlined" style="font-size: 13px;">check</span> Accept &amp; Award
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Proposal Submission Box for Makers -->
        ${!isOwner && bounty.status === 'open' ? (
          !currentUser ? `
            <div class="card-cyber" style="padding: 20px; text-align: center; background: var(--bg-surface-high);">
              <p style="color: var(--text-muted); margin-bottom: 12px;">Sign in with a Maker / Seller account to bid on this bounty.</p>
              <a href="/login/" class="btn btn-primary btn-sm">Sign In to Submit Proposal</a>
            </div>
          ` : (currentUser.role === 'buyer' ? `
            <div class="role-upgrade-banner">
              <div style="display: flex; gap: 12px; align-items: center;">
                <span class="material-symbols-outlined" style="font-size: 28px; color: #00ff88;">engineering</span>
                <div>
                  <h4 style="margin: 0 0 4px 0; color: #fff;">Want to build this project and earn?</h4>
                  <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                    You are currently registered as a <strong>Buyer</strong>. Switch your profile to <strong>Seller</strong> or <strong>Both</strong> to submit engineering proposals.
                  </p>
                </div>
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button type="button" onclick="window.quickUpgradeToSeller('both', ${bounty.id})" class="btn btn-primary btn-sm">
                  <span class="material-symbols-outlined">upgrade</span>
                  1-Click Upgrade to Maker
                </button>
                <a href="/profile/" class="btn btn-secondary btn-sm">Manage Profile</a>
              </div>
            </div>
          ` : `
            <div class="card-cyber" style="padding: 20px; background: var(--bg-surface-high); border: 1px solid var(--border-medium);">
              <h4 style="margin: 0 0 12px; font-size: 1rem; color: var(--primary);">
                ${myProposal ? 'Update Your Proposal / Bid' : 'Submit Your Maker Proposal'}
              </h4>
              <form onsubmit="window.handleProposalSubmit(event, ${bounty.id})">
                <div id="proposal-alert" style="display: none; margin-bottom: 12px;"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
                  <div class="input-group">
                    <label class="input-label">Your Bid Price (LKR) *</label>
                    <input type="number" step="100" min="100" id="proposal-bid-amount" class="input-cyber" value="${myProposal ? myProposal.bid_amount : bounty.budget}" required>
                  </div>
                  <div class="input-group">
                    <label class="input-label">Est. Delivery (Days) *</label>
                    <input type="number" min="1" max="90" id="proposal-delivery-days" class="input-cyber" value="${myProposal ? myProposal.delivery_days : bounty.deadline_days}" required>
                  </div>
                </div>

                <div class="input-group" style="margin-bottom: 16px;">
                  <label class="input-label">Your Pitch &amp; Technical Approach *</label>
                  <textarea id="proposal-pitch" class="input-cyber" rows="3" required placeholder="Explain your experience with this MCU/sensor, how you will tackle the hardware routing, firmware stack, and testing plan..." style="resize: vertical;">${myProposal ? myProposal.pitch : ''}</textarea>
                </div>

                <button type="submit" id="proposal-submit-btn" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center;">
                  <span class="material-symbols-outlined">send</span>
                  ${myProposal ? 'Update Proposal' : 'Submit Proposal to Client'}
                </button>
              </form>
            </div>
          `)
        ) : ''}

        ${isOwner ? `
          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button onclick="window.closeBountyDetailModal()" class="btn btn-secondary">Close</button>
          </div>
        ` : ''}
      `;
    } catch (e) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--status-warning);">
          Error loading bounty details.
        </div>
      `;
    }
  };

  window.quickUpgradeToSeller = async (newRole, bountyId) => {
    try {
      await api.auth.updateProfile({ role: newRole || 'both' });
      if (window.showToast) showToast('Role upgraded! You can now submit hardware proposals.', 'success');
      currentUser = await api.auth.me();
      if (window.loadAuthNav) loadAuthNav();
      if (bountyId) {
        window.openBountyDetailModal(bountyId);
      }
    } catch (err) {
      if (window.showToast) showToast(err.message || 'Failed to update role.', 'error');
    }
  };

  window.closeBountyDetailModal = () => {
    const modal = document.getElementById('bounty-detail-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleProposalSubmit = async (e, bountyId) => {
    e.preventDefault();
    if (!currentUser) {
      if (window.showToast) showToast('Please log in to submit a proposal.', 'info');
      return;
    }

    const pitch = document.getElementById('proposal-pitch').value.trim();
    const bidAmount = document.getElementById('proposal-bid-amount').value;
    const deliveryDays = document.getElementById('proposal-delivery-days').value;
    const btn = document.getElementById('proposal-submit-btn');
    const alert = document.getElementById('proposal-alert');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Submitting...';

    try {
      await api.bounties.submitProposal(bountyId, {
        pitch,
        bid_amount: bidAmount,
        delivery_days: deliveryDays,
      });

      if (window.showToast) showToast('Proposal submitted successfully!', 'success');
      await window.openBountyDetailModal(bountyId);
      await loadBounties();
    } catch (err) {
      if (alert) {
        alert.className = 'form-alert form-alert-error';
        alert.textContent = err.message || 'Failed to submit proposal.';
        alert.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">send</span> Submit Proposal to Client';
    }
  };

  window.handleAcceptProposal = async (bountyId, proposalId) => {
    if (!confirm('Are you sure you want to award this commission to this maker?')) return;

    try {
      await api.bounties.acceptProposal(bountyId, proposalId);
      if (window.showToast) showToast('Bounty awarded to maker successfully!', 'success');
      await window.openBountyDetailModal(bountyId);
      await loadBounties();
    } catch (err) {
      alert(err.message || 'Failed to accept proposal.');
    }
  };

  window.startChatWithUser = (userId, username, projectId = null, bountyId = null) => {
    if (window.CyberChat) {
      window.CyberChat.openChatWithUser(userId, username, projectId, null, bountyId);
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadBounties, 280);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', loadBounties);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      currentUser = await auth.getUser();
    } catch (e) {
      currentUser = null;
    }
    await loadCategories();
    await loadBounties();
  });
})();
