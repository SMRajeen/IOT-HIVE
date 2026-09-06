/**
 * IoT HIVE - Real-Time Maker-to-Buyer Live Chat & Messaging Controller
 * Phase 3: Instant Chat Hub, Optimistic Message Dispatch & Active Thread Polling
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  let currentUser = null;
  let isChatOpen = false;
  let activePartner = null; // { id, name, avatar }
  let activeContext = { projectId: null, projectTitle: '', bountyId: null };
  let pollingInterval = null;
  let unreadCheckInterval = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initChatWidget() {
    // Inject floating button & panel if not present
    if (document.getElementById('cyber-chat-root')) return;

    const root = document.createElement('div');
    root.id = 'cyber-chat-root';
    root.innerHTML = `
      <!-- Floating Chat Trigger Button -->
      <button id="cyber-chat-launcher" class="cyber-chat-trigger" onclick="window.CyberChat.toggleChat()" title="Hardware Maker Live Chat">
        <span class="material-symbols-outlined" style="font-size: 28px;">chat</span>
        <span id="cyber-chat-unread-badge" class="cyber-chat-unread-dot" style="display: none;">0</span>
      </button>

      <!-- Sliding Cyber Messenger Window -->
      <div id="cyber-chat-panel" class="cyber-chat-window" style="display: none;">
        
        <!-- Header Bar -->
        <div class="chat-header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="chat-back-btn" onclick="window.CyberChat.showThreadList()" class="btn-icon" style="display: none; width: 28px; height: 28px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            </button>
            <div id="chat-header-info">
              <strong style="font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary);">forum</span>
                Maker Live Messenger
              </strong>
              <div class="text-xs" style="color: var(--text-muted); font-family: var(--font-mono);">IoT HIVE &bull; Direct Hardware Chat</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 4px;">
            <button onclick="window.CyberChat.toggleChat()" class="btn-icon" style="width: 28px; height: 28px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
            </button>
          </div>
        </div>

        <!-- Thread List View -->
        <div id="chat-thread-list-container" class="chat-thread-list-view">
          <div style="padding: 32px 16px; text-align: center; color: var(--text-muted);">
            <span class="material-symbols-outlined spin" style="font-size: 24px; color: var(--primary);">sync</span>
            <p style="margin-top: 6px; font-size: 0.85rem;">Loading conversations...</p>
          </div>
        </div>

        <!-- Active Conversation View -->
        <div id="chat-conversation-container" style="display: none; flex: 1; flex-direction: column; overflow: hidden;">
          
          <!-- Context Tag (if referencing a project or bounty) -->
          <div id="chat-context-banner" style="display: none; padding: 6px 14px; background: rgba(0,229,255,0.08); border-bottom: 1px solid rgba(0,229,255,0.15); font-size: 0.75rem; font-family: var(--font-mono); color: var(--primary); display: flex; align-items: center; justify-content: space-between;">
            <span id="chat-context-label">Hardware Project Context</span>
          </div>

          <!-- Message Timeline -->
          <div id="chat-messages-box" class="chat-messages-timeline">
            <!-- Messages rendered here -->
          </div>

          <!-- Input Bar -->
          <form id="chat-input-form" onsubmit="window.CyberChat.handleSendMessage(event)" class="chat-input-container">
            <input type="text" id="chat-message-input" class="chat-input-box" placeholder="Type a message or hardware question..." autocomplete="off">
            <button type="submit" id="chat-send-btn" class="btn btn-primary btn-sm" style="border-radius: 50%; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 18px;">send</span>
            </button>
          </form>

        </div>

      </div>
    `;

    document.body.appendChild(root);
  }

  async function checkUnreadCount() {
    if (!currentUser) return;
    try {
      const data = await api.chat.unreadCount();
      const count = data.unread_count || 0;
      const text = count > 99 ? '99+' : String(count);

      const badge = document.getElementById('cyber-chat-unread-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = text;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      document.querySelectorAll('.header-chat-unread-badge').forEach(b => {
        if (count > 0) {
          b.textContent = text;
          b.style.display = 'flex';
        } else {
          b.style.display = 'none';
        }
      });
    } catch (e) {
      // quiet fail
    }
  }

  async function loadConversations() {
    const container = document.getElementById('chat-thread-list-container');
    if (!container) return;

    if (!currentUser) {
      container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size: 36px; color: var(--primary); margin-bottom: 8px;">lock</span>
          <h4 style="margin: 4px 0; color: var(--text-primary);">Log in to Chat</h4>
          <p style="font-size: 0.85rem; margin-bottom: 14px;">Sign in to send direct messages to makers and clients.</p>
          <a href="/login/" class="btn btn-primary btn-sm">Sign In</a>
        </div>
      `;
      return;
    }

    try {
      const threads = await api.chat.conversations();

      if (threads.length === 0) {
        container.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--text-muted); margin-bottom: 8px;">forum</span>
            <h4 style="margin: 4px 0; color: var(--text-primary);">No Conversations Yet</h4>
            <p style="font-size: 0.85rem; line-height: 1.4;">Click "Live Chat with Maker" on any hardware project or bounty to start a conversation!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = threads.map(t => `
        <div class="chat-thread-item" onclick="window.CyberChat.selectConversation(${t.partner_id}, '${escapeHtml(t.partner_name || t.partner_username)}')">
          <div class="chat-thread-avatar">
            ${(t.partner_name || t.partner_username || 'M').substring(0, 2).toUpperCase()}
          </div>
          <div style="flex: 1; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <strong style="font-size: 0.9rem; color: var(--text-primary);">${escapeHtml(t.partner_name || t.partner_username)}</strong>
              <span class="text-xs" style="color: var(--text-muted); font-size: 0.68rem; font-family: var(--font-mono);">${t.latest_timestamp}</span>
            </div>
            <div style="font-size: 0.8rem; color: ${t.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: ${t.unread_count > 0 ? '600' : '400'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(t.latest_message || 'Start conversation')}
            </div>
          </div>
          ${t.unread_count > 0 ? `
            <span style="background: var(--primary); color: #000; font-size: 0.68rem; font-weight: 700; border-radius: 10px; padding: 1px 6px; font-family: var(--font-mono);">
              ${t.unread_count}
            </span>
          ` : ''}
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--status-warning);">Failed to load conversations.</div>`;
    }
  }

  async function loadActiveMessages(scrollDown = true) {
    if (!activePartner) return;
    const box = document.getElementById('chat-messages-box');
    if (!box) return;

    try {
      const messages = await api.chat.messages(activePartner.id, activeContext.projectId, activeContext.bountyId);

      if (messages.length === 0) {
        box.innerHTML = `
          <div style="margin: auto; text-align: center; color: var(--text-muted); padding: 20px;">
            <span class="material-symbols-outlined" style="font-size: 32px; color: var(--primary);">waving_hand</span>
            <p style="margin-top: 6px; font-size: 0.85rem;">Say hello to <strong>${escapeHtml(activePartner.name)}</strong>!</p>
          </div>
        `;
        return;
      }

      box.innerHTML = messages.map(m => {
        const isMe = currentUser && m.sender === currentUser.id;
        return `
          <div class="chat-msg-row ${isMe ? 'sent' : 'received'}">
            <div class="chat-msg-bubble">
              ${escapeHtml(m.message)}
            </div>
            <div class="chat-msg-time">${m.time_formatted || ''}</div>
          </div>
        `;
      }).join('');

      if (scrollDown) {
        box.scrollTop = box.scrollHeight;
      }

      checkUnreadCount();
    } catch (e) {
      // quiet fail
    }
  }

  // --- Global CyberChat API ---
  window.CyberChat = {
    toggleChat: () => {
      isChatOpen = !isChatOpen;
      const panel = document.getElementById('cyber-chat-panel');
      if (panel) {
        panel.style.display = isChatOpen ? 'flex' : 'none';
        if (isChatOpen) {
          if (!activePartner) {
            window.CyberChat.showThreadList();
          } else {
            loadActiveMessages(true);
            window.CyberChat.startPolling();
          }
        } else {
          window.CyberChat.stopPolling();
        }
      }
    },

    showThreadList: () => {
      activePartner = null;
      window.CyberChat.stopPolling();

      const threadList = document.getElementById('chat-thread-list-container');
      const convView = document.getElementById('chat-conversation-container');
      const backBtn = document.getElementById('chat-back-btn');
      const headerInfo = document.getElementById('chat-header-info');

      if (threadList) threadList.style.display = 'block';
      if (convView) convView.style.display = 'none';
      if (backBtn) backBtn.style.display = 'none';
      if (headerInfo) {
        headerInfo.innerHTML = `
          <strong style="font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--primary);">forum</span>
            Maker Live Messenger
          </strong>
          <div class="text-xs" style="color: var(--text-muted); font-family: var(--font-mono);">IoT HIVE &bull; Direct Hardware Chat</div>
        `;
      }

      loadConversations();
    },

    selectConversation: (partnerId, partnerName, projectId = null, projectTitle = '', bountyId = null) => {
      activePartner = { id: partnerId, name: partnerName };
      activeContext = { projectId, projectTitle, bountyId };

      const threadList = document.getElementById('chat-thread-list-container');
      const convView = document.getElementById('chat-conversation-container');
      const backBtn = document.getElementById('chat-back-btn');
      const headerInfo = document.getElementById('chat-header-info');
      const contextBanner = document.getElementById('chat-context-banner');
      const contextLabel = document.getElementById('chat-context-label');

      if (threadList) threadList.style.display = 'none';
      if (convView) convView.style.display = 'flex';
      if (backBtn) backBtn.style.display = 'inline-flex';
      if (headerInfo) {
        headerInfo.innerHTML = `
          <strong style="font-size: 0.95rem; color: var(--text-primary);">${escapeHtml(partnerName)}</strong>
          <div class="text-xs" style="color: var(--status-online); font-family: var(--font-mono);">&bull; Online Live Channel</div>
        `;
      }

      if (contextBanner && contextLabel) {
        if (projectTitle) {
          contextBanner.style.display = 'flex';
          contextLabel.textContent = `Project: ${projectTitle}`;
        } else if (bountyId) {
          contextBanner.style.display = 'flex';
          contextLabel.textContent = `Bounty Commission Ref #${bountyId}`;
        } else {
          contextBanner.style.display = 'none';
        }
      }

      loadActiveMessages(true);
      window.CyberChat.startPolling();

      const input = document.getElementById('chat-message-input');
      if (input) input.focus();
    },

    openChatWithUser: (partnerId, partnerName, projectId = null, projectTitle = '', bountyId = null) => {
      if (!isChatOpen) {
        window.CyberChat.toggleChat();
      }
      window.CyberChat.selectConversation(partnerId, partnerName, projectId, projectTitle, bountyId);
    },

    handleSendMessage: async (e) => {
      e.preventDefault();
      if (!activePartner) return;
      const input = document.getElementById('chat-message-input');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';

      // Optimistic instant UI render
      const box = document.getElementById('chat-messages-box');
      if (box) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        box.innerHTML += `
          <div class="chat-msg-row sent">
            <div class="chat-msg-bubble">${escapeHtml(text)}</div>
            <div class="chat-msg-time">${timeNow}</div>
          </div>
        `;
        box.scrollTop = box.scrollHeight;
      }

      try {
        await api.chat.send(activePartner.id, text, activeContext.projectId, activeContext.bountyId);
      } catch (err) {
        if (window.showToast) showToast('Failed to send message: ' + (err.message || 'Error'), 'error');
      }
    },

    startPolling: () => {
      window.CyberChat.stopPolling();
      pollingInterval = setInterval(() => {
        if (activePartner && isChatOpen) {
          loadActiveMessages(false);
        }
      }, 3000);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      currentUser = await auth.getUser();
    } catch (e) {
      currentUser = null;
    }

    initChatWidget();
    checkUnreadCount();
    unreadCheckInterval = setInterval(checkUnreadCount, 15000);
  });
})();
