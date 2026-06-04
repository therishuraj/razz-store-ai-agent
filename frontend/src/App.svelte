<script>
  import { onMount, tick } from "svelte";

  // In production frontend is served from same origin as backend
  const API = import.meta.env.DEV ? "http://localhost:3000" : "";
  const MAX_LENGTH = 1000;

  let messages = [];
  let inputText = "";
  let loading = false;
  let error = "";
  let messagesEnd;

  let sessionId = localStorage.getItem("sessionId") || null;

  $: charCount = inputText.length;
  $: charNearLimit = charCount > 800;

  onMount(async () => {
    if (sessionId) await loadHistory();
  });

  function formatTime(ts) {
    const d = ts ? new Date(ts.includes("Z") ? ts : ts + "Z") : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${API}/chat/history/${sessionId}`);
      if (!res.ok) {
        localStorage.removeItem("sessionId");
        sessionId = null;
        return;
      }
      const data = await res.json();
      messages = data.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        time: formatTime(m.timestamp),
      }));
      await scrollToBottom();
    } catch {
      // Network error — start fresh silently
    }
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || loading) return;

    inputText = "";
    error = "";
    messages = [...messages, { sender: "user", text, time: formatTime() }];
    loading = true;
    await scrollToBottom();

    try {
      const res = await fetch(`${API}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || "Something went wrong. Please try again.";
        messages = messages.slice(0, -1);
        return;
      }

      sessionId = data.sessionId;
      localStorage.setItem("sessionId", sessionId);
      messages = [...messages, { sender: "ai", text: data.reply, time: formatTime() }];
    } catch {
      error = "Could not reach the server. Please check your connection.";
      messages = messages.slice(0, -1);
    } finally {
      loading = false;
      await scrollToBottom();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function scrollToBottom() {
    await tick();
    messagesEnd?.scrollIntoView({ behavior: "smooth" });
  }

  function startNewChat() {
    localStorage.removeItem("sessionId");
    sessionId = null;
    messages = [];
    error = "";
  }
</script>

<div class="container">
  <div class="header">
    <div class="header-left">
      <div class="avatar">🧑‍💼</div>
      <div>
        <div class="agent-name">Razz</div>
        <div class="agent-status">Online</div>
      </div>
    </div>
    <button class="new-chat-btn" on:click={startNewChat}>New Chat</button>
  </div>

  <div class="messages">
    {#if messages.length === 0}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>Hi! I'm Razz's support agent.</p>
        <p>Ask me about shipping, returns, or anything about our store.</p>
      </div>
    {/if}

    {#each messages as msg}
      <div class="message {msg.sender === 'user' ? 'user' : 'ai'}">
        {#if msg.sender === "ai"}
          <div class="msg-avatar">🧑‍💼</div>
        {/if}
        <div class="msg-col {msg.sender}">
          <div class="bubble">{msg.text}</div>
          <div class="timestamp">{msg.time}</div>
        </div>
      </div>
    {/each}

    {#if loading}
      <div class="message ai">
        <div class="msg-avatar">A</div>
        <div class="bubble typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <div bind:this={messagesEnd}></div>
  </div>

  <div class="input-wrapper">
    <div class="char-counter" class:warn={charNearLimit}>
      {charCount}/{MAX_LENGTH}
    </div>
    <div class="input-area">
      <input
        type="text"
        placeholder="Type a message..."
        bind:value={inputText}
        on:keydown={handleKeydown}
        disabled={loading}
        maxlength={MAX_LENGTH}
      />
      <button
        on:click={sendMessage}
        disabled={loading || inputText.trim().length === 0}
      >
        {#if loading}
          <span class="spinner"></span>
        {:else}
          Send
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :global(html), :global(body) {
    height: calc(100% - 48px);
    overflow: hidden;
    background: linear-gradient(135deg, #e8c3ff 0%, #aff2ff 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Fixed to viewport — content inside can never resize this */
  .container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 48px);
    max-width: 600px;
    height: 80%;
    border-radius: 16px;
    border-color: #00669d84;;
    border-style: solid;
    border-width: 1px;
    background: #bbcff8;
    box-shadow: 0 8px 32px rgba(2, 2, 2, 0.38);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 480px) {
    .container {
      top: 0; bottom: 0;
      left: 0;
      transform: none;
      width: 100%;
      max-width: 100%;
      border-radius: 0;
      box-shadow: none;
    }
  }

  /* Header */
  .header {
    background: #00669d;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 38px; height: 38px;
    background: #ffffff;
    color: #005a72;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 15px;
    flex-shrink: 0;
  }
  .agent-name { color: #ffffff; font-weight: 600; font-size: 15px; }
  .agent-status { color: #fdfdfd; font-size: 12px; }
  .new-chat-btn {
    background: rgba(255, 255, 255, 0.9);
    color: #0082a6;
    border: 1px solid rgb(255, 255, 255);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .new-chat-btn:hover { color: #eff0f0; }

  /* Messages */
  .messages {
    flex: 1;
    min-height: 0; /* critical — prevents flex child from expanding container */
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .empty-state {
    margin: auto;
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    line-height: 1.8;
    padding: 0 16px;
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }

  .message {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .message.user { flex-direction: row-reverse; }

  .msg-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-width: 75%;
  }
  .msg-col.user { align-items: flex-end; }
  .msg-col.ai  { align-items: flex-start; }

  .msg-avatar {
    width: 26px; height: 26px;
    background: #2485b9;
    color: #fff;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0;
  }

  .bubble {
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .message.user .bubble {
    background: #00669d;
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .message.ai .bubble {
    background: #f3f4f6;
    color: #111827;
    border-bottom-left-radius: 4px;
  }

  .timestamp {
    font-size: 11px;
    color: #9ca3af;
    padding: 0 4px;
  }

  /* Typing indicator */
  .typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
  }
  .typing span {
    width: 7px; height: 7px;
    background: #9ca3af;
    border-radius: 50%;
    animation: bounce 1.2s infinite ease-in-out;
  }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }

  /* Error */
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    text-align: center;
  }

  /* Input area */
  .input-wrapper {
    border-top: 1px solid #e5e7eb;
    padding: 8px 16px 14px;
    flex-shrink: 0;
  }

  .char-counter {
    font-size: 11px;
    color: #9ca3af;
    text-align: right;
    margin-bottom: 6px;
    transition: color 0.2s;
  }
  .char-counter.warn { color: #f59e0b; }

  .input-area {
    display: flex;
    gap: 8px;
  }
  input {
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 24px;
    padding: 10px 16px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    min-width: 0;
  }
  input:focus { border-color: #00669d; }
  input:disabled { background: #f9fafb; }

  button {
    background: #00669d;
    color: #fff;
    border: none;
    border-radius: 24px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  button:hover:not(:disabled) { background: #014265; }
  button:disabled { opacity: 0.45; cursor: not-allowed; }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
