/**
 * IoT HIVE - Project Inquiries & Communications Controller
 * Split Sent / Received Inquiries, Threaded Inline Replies & Messenger Sync
 */

let activeInquiryTab = 'received';
let currentUser = null;
let inquiriesCache = {
  sent: [],
  received: []
};

function formatLKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

window.switchInquiryTab = function(tab) {
  if (!currentUser) return;
  activeInquiryTab = tab;
  const recBtn = document.getElementById('tab-received-btn');
  const sentBtn = document.getElementById('tab-sent-btn');

  if (recBtn && sentBtn) {
    if (tab === 'received') {
      recBtn.className = 'btn btn-primary btn-sm';
      sentBtn.className = 'btn btn-secondary btn-sm';
    } else {
      recBtn.className = 'btn btn-secondary btn-sm';
      sentBtn.className = 'btn btn-primary btn-sm';
    }
  }
  renderInquiriesList();
};

async function loadRequests() {
  const listContainer = document.getElementById('requests-list-container');
  const tabsWrapper = document.getElementById('inquiries-tabs-wrapper');
  if (!listContainer) return;

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  try {
    currentUser = auth ? await auth.getUser(true) : (api?.auth ? await api.auth.me() : null);
    if (!currentUser || !currentUser.username) {
      if (tabsWrapper) tabsWrapper.style.display = 'none';
      listContainer.innerHTML = `
        <div class="card-cyber" style="padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
          <div style="width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.25); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 28px; color: var(--accent-cyan);">lock</span>
          </div>
          <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Authentication Required</h3>
          <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 24px; font-size: 0.95rem; line-height: 1.5;">
            Please sign in or create an account to view and respond to project inquiries, hardware orders, and customer messages.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <a href="/login/?next=/project-requests/" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">login</span>
              Sign In
            </a>
            <a href="/register/?next=/project-requests/" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">person_add</span>
              Create Account
            </a>
          </div>
        </div>
      `;
      return;
    }

    if (tabsWrapper) tabsWrapper.style.display = 'flex';

    const [sentData, receivedData] = await Promise.all([
      api.requests.sent().catch(() => []),
      api.requests.received().catch(() => [])
    ]);

    const sentList = Array.isArray(sentData) ? sentData : (sentData?.results || []);
    const receivedList = Array.isArray(receivedData) ? receivedData : (receivedData?.results || []);

    const recBadge = document.getElementById('badge-received-count');
    const sentBadge = document.getElementById('badge-sent-count');
    if (recBadge) recBadge.textContent = receivedList.length;
    if (sentBadge) sentBadge.textContent = sentList.length;

    inquiriesCache = {
      sent: sentList,
      received: receivedList
    };

    renderInquiriesList();
  } catch (err) {
    console.error('[IoT Hive] Error loading inquiries:', err);
    if (tabsWrapper) tabsWrapper.style.display = 'none';
    listContainer.innerHTML = '<div class="card-cyber" style="padding: 32px; text-align: center; color: var(--text-muted);">Error loading inquiries. Please refresh.</div>';
  }
}

function renderInquiriesList() {
  const listContainer = document.getElementById('requests-list-container');
  if (!listContainer || !currentUser) return;

  const currentList = (inquiriesCache && inquiriesCache[activeInquiryTab]) ? inquiriesCache[activeInquiryTab] : [];

  if (!currentList || currentList.length === 0) {
    const isReceived = activeInquiryTab === 'received';
    listContainer.innerHTML = `
      <div class="card-cyber" style="padding: 48px 24px; text-align: center; background: var(--bg-surface-container);">
        <div style="width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center;">
          <span class="material-symbols-outlined" style="font-size: 28px; color: var(--text-muted);">${isReceived ? 'move_to_inbox' : 'outbox'}</span>
        </div>
        <h3 style="margin-bottom: 6px; font-size: 1.25rem;">No ${isReceived ? 'Received' : 'Sent'} Inquiries Yet</h3>
        <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 18px; font-size: 0.9rem;">
          ${isReceived ? 'When makers or buyers send questions about your hardware builds, they will appear here.' : 'When you message creators about their hardware designs, your inquiries will appear here.'}
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="/marketplace/" class="btn btn-primary btn-sm">Explore Marketplace</a>
          <a href="/bounties/" class="btn btn-secondary btn-sm">Hardware Bounties</a>
        </div>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = currentList.map(req => {
    const isReceived = activeInquiryTab === 'received';
    const otherPartyName = isReceived ? (req.buyer_name || 'Buyer') : (req.seller_name || 'Maker');
    const dateStr = new Date(req.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const price = Number(req.project_price || 0);

    const statusBadge = req.status === 'completed' 
      ? `<span class="badge-status online"><span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span> COMPLETED</span>`
      : (req.status === 'accepted'
        ? `<span class="badge-status online">ACCEPTED</span>`
        : `<span class="badge-status standby">${(req.status || 'PENDING').toUpperCase()}</span>`);

    return `
      <div class="card-cyber" style="padding: 22px 24px; margin-bottom: 16px; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl);">
        
        <!-- Header -->
        <div class="flex items-center justify-between" style="margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div class="flex items-center gap-2">
            <span class="tag-mono" style="background: rgba(0, 229, 255, 0.1); color: var(--accent-cyan); font-size: 0.72rem;">
              ${isReceived ? 'INCOMING INQUIRY' : 'SENT INQUIRY'} #${req.id}
            </span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">&bull; ${dateStr}</span>
          </div>
          ${statusBadge}
        </div>

        <!-- Project & User -->
        <div class="flex items-center justify-between" style="margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.15rem; margin: 0 0 2px;">
              <a href="/project/${req.project}/" style="color: var(--text-primary); text-decoration: none;">
                ${req.project_title || 'Smart Hardware Project'}
              </a>
            </h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ${isReceived ? `Interested Buyer: <strong style="color: var(--text-secondary);">${otherPartyName}</strong>` : `Project Creator: <strong style="color: var(--text-secondary);">@${otherPartyName}</strong>`}
            </div>
          </div>

          ${price > 0 ? `<span class="font-mono font-bold" style="color: var(--accent-cyan); font-size: 1.05rem;">${formatLKR(price)}</span>` : '<span class="tag-mono">Free / Open-Source</span>'}
        </div>

        <!-- Inquiry Bubble (WhatsApp style) -->
        <div style="background: var(--bg-surface-low); padding: 14px 18px; border-radius: 10px; border-left: 3px solid var(--accent-cyan); font-size: 0.92rem; line-height: 1.5; margin-bottom: 16px; color: var(--text-secondary);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono);">
            ${isReceived ? req.buyer_name || 'Buyer' : 'You'}:
          </div>
          ${req.requirements || req.message || 'No inquiry details provided.'}
        </div>

        <!-- Inline Thread Reply Input -->
        <div id="reply-box-${req.id}" style="margin-bottom: 16px; background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
          <div style="display: flex; gap: 8px;">
            <input type="text" id="reply-input-${req.id}" class="input-cyber" placeholder="Type a response to ${otherPartyName}..." style="flex: 1; padding: 8px 12px; font-size: 0.88rem;">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.handleSendReply(${req.id})" style="flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">send</span>
              Reply
            </button>
          </div>
        </div>

        <!-- Actions Footer -->
        <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 12px; flex-wrap: wrap; gap: 10px;">
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.openMessengerForInquiry('${isReceived ? req.buyer : (req.project_seller || req.seller || '')}', '${encodeURIComponent(otherPartyName)}', ${req.project}, '${encodeURIComponent(req.project_title || '')}')">
              <span class="material-symbols-outlined" style="font-size: 15px;">forum</span>
              Open in Live Chat
            </button>
          </div>

          <div class="flex items-center gap-2">
            ${isReceived ? `
              <button class="btn btn-ghost btn-sm" onclick="updateRequestStatus(${req.id}, 'accepted')">Accept</button>
              <button class="btn btn-ghost btn-sm" onclick="updateRequestStatus(${req.id}, 'completed')">Mark Done</button>
              <button class="btn btn-ghost btn-sm" style="color: #ff5357;" onclick="updateRequestStatus(${req.id}, 'rejected')">Decline</button>
            ` : ''}
          </div>
        </div>

      </div>
    `;
  }).join('');
}

window.handleSendReply = async function(reqId) {
  const input = document.getElementById(`reply-input-${reqId}`);
  if (!input) return;
  const replyText = input.value.trim();
  if (!replyText) return;

  const api = window.IoTHiveAPI || window.API;
  try {
    input.disabled = true;
    await api.requests.reply(reqId, replyText);
    input.value = '';
    input.disabled = false;
    if (window.showToast) showToast('Reply sent and recipient notified via email!', 'success');
  } catch (err) {
    input.disabled = false;
    if (window.showToast) showToast(err.message || 'Failed to send reply.', 'error');
  }
};

window.openMessengerForInquiry = function(partnerId, encodedName, projectId, encodedTitle) {
  const name = decodeURIComponent(encodedName || 'Maker');
  const title = decodeURIComponent(encodedTitle || 'Hardware Project');
  if (window.CyberChat) {
    window.CyberChat.openChatWithUser(partnerId, name, projectId, title);
  } else {
    window.location.href = `/project/${projectId}/`;
  }
};

window.updateRequestStatus = async function(reqId, newStatus) {
  const api = window.IoTHiveAPI || window.API;
  try {
    await api.requests.updateStatus(reqId, newStatus);
    if (window.showToast) showToast(`Inquiry marked as ${newStatus}`, 'success');
    loadRequests();
  } catch (err) {
    if (window.showToast) showToast(err.message || 'Failed to update status', 'error');
  }
};

function initProjectRequests() {
  const container = document.getElementById('requests-list-container');
  if (!container) return;
  loadRequests();
  if (window._inquiriesPollInterval) {
    clearInterval(window._inquiriesPollInterval);
  }
  window._inquiriesPollInterval = setInterval(() => {
    if (document.getElementById('requests-list-container')) {
      loadRequests();
    } else {
      clearInterval(window._inquiriesPollInterval);
    }
  }, 12000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjectRequests);
} else {
  initProjectRequests();
}

window.addEventListener('page:loaded', () => {
  if (document.getElementById('requests-list-container')) {
    initProjectRequests();
  }
});
