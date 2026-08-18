function formatLKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadRequests();
});

async function loadRequests() {
  const listContainer = document.getElementById('requests-list-container');
  if (!listContainer) return;

  try {
    const user = await API.auth.me();
    const requests = await API.requests.list();
    const role = (user?.role || 'both').toLowerCase();

    if (!requests || requests.length === 0) {
      let emptyBtns = '';
      if (role === 'buyer') {
        emptyBtns = `
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="/marketplace/" class="btn btn-primary">Explore Marketplace</a>
            <a href="/bounties/" class="btn btn-secondary">Post a Hardware Bounty</a>
          </div>
        `;
      } else if (role === 'seller') {
        emptyBtns = `
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="/create-project/" class="btn btn-primary">Post New Project</a>
            <a href="/bounties/" class="btn btn-secondary">Browse Bounties to Bid</a>
          </div>
        `;
      } else {
        emptyBtns = `
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="/marketplace/" class="btn btn-primary">Explore Marketplace</a>
            <a href="/create-project/" class="btn btn-secondary">Share a Project</a>
          </div>
        `;
      }

      listContainer.innerHTML = `
        <div class="card-cyber" style="padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
          <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-muted);">chat_bubble_outline</span>
          </div>
          <h3 style="margin-bottom: 8px;">No Inquiries or Orders Yet</h3>
          <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 20px; font-size: 0.95rem;">
            When buyers inquire about your hardware or when you message makers, the conversations and order options will appear here.
          </p>
          ${emptyBtns}
        </div>
      `;
      return;
    }

    listContainer.innerHTML = requests.map(req => {
      const isSeller = req.seller_name === user.username;
      const dateStr = new Date(req.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const price = Number(req.project_price || 0);

      const statusBadge = req.status === 'completed' 
        ? `<span class="badge-status online"><span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> PAID / COMPLETED</span>`
        : (req.status === 'accepted'
          ? `<span class="badge-status online">ACCEPTED</span>`
          : `<span class="badge-status standby">${req.status.toUpperCase()}</span>`);

      const canPay = !isSeller && req.status !== 'completed' && price > 0;

      return `
        <div class="card-cyber" style="padding: 24px; margin-bottom: 16px; background: var(--bg-surface-container);">
          <div class="flex items-center justify-between" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div class="flex items-center gap-2">
              <span class="tag-mono">${isSeller ? 'Incoming Inquiry' : 'Your Request'}</span>
              <span style="font-size: 0.85rem; color: var(--text-muted);">&bull; ${dateStr}</span>
            </div>
            ${statusBadge}
          </div>

          <div class="flex items-center justify-between" style="margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
            <h3 style="font-size: 1.2rem; margin: 0;">
              <a href="/project/${req.project}/" style="color: var(--text-primary); text-decoration: none;">
                ${req.project_title || 'Smart Hardware Project'}
              </a>
            </h3>
            ${price > 0 ? `<span class="font-mono font-bold" style="color: var(--primary); font-size: 1.1rem;">${formatLKR(price)}</span>` : '<span class="tag-mono">Free Project</span>'}
          </div>

          <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
            ${isSeller ? `From Buyer: <strong style="color: var(--text-secondary);">${req.buyer_name}</strong>` : `Maker: <strong style="color: var(--text-secondary);">@${req.seller_name || 'Maker'}</strong>`}
          </div>

          <div style="background: var(--bg-surface-low); padding: 14px 18px; border-radius: 8px; border-left: 3px solid var(--primary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 16px; color: var(--text-secondary);">
            ${req.message || 'No message content provided.'}
          </div>

          <!-- Actions Footer -->
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 14px; flex-wrap: wrap; gap: 12px;">
            <div>
              ${isSeller ? `
                <div class="flex items-center gap-2">
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Status Action:</span>
                  <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus(${req.id}, 'accepted')">Accept Request</button>
                  <button class="btn btn-ghost btn-sm" onclick="updateRequestStatus(${req.id}, 'completed')">Mark Completed</button>
                  <button class="btn btn-ghost btn-sm" style="color: #ff5357;" onclick="updateRequestStatus(${req.id}, 'rejected')">Decline</button>
                </div>
              ` : `
                <span class="text-xs" style="color: var(--text-muted);">Direct Maker Communications &bull; Secure Protection</span>
              `}
            </div>

            <div>
              ${canPay ? `
                <button class="btn btn-primary btn-sm" onclick="payForRequest(${req.id}, ${req.project}, '${encodeURIComponent(req.project_title || 'Project')}', ${price}, '${req.seller_name || 'Maker'}')">
                  <span class="material-symbols-outlined" style="font-size: 16px;">payments</span>
                  Pay ${formatLKR(price)} with Gateway
                </button>
              ` : ''}
              ${req.status === 'completed' ? `
                <span class="text-xs font-mono" style="color: var(--status-online);">✓ Order Settled &amp; Verified</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listContainer.innerHTML = '<div class="card-cyber" style="padding: 32px; text-align: center; color: var(--text-muted);">Please sign in to view inquiries.</div>';
  }
}

window.payForRequest = function(requestId, projectId, encodedTitle, price, makerName) {
  const title = decodeURIComponent(encodedTitle);
  Payment.open({
    projectId,
    projectTitle: title,
    projectPrice: price,
    requestId,
    makerName,
    onComplete: () => {
      loadRequests();
    }
  });
};

window.updateRequestStatus = async function(reqId, newStatus) {
  try {
    await API.requests.updateStatus(reqId, newStatus);
    showToast(`Request updated to ${newStatus}`, 'success');
    loadRequests();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
