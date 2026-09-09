const guestbookForm = document.querySelector("[data-guestbook-form]");
const guestbookList = document.querySelector("[data-guestbook-list]");
const guestbookCount = document.querySelector("[data-entry-count]");
const charCount = document.querySelector("[data-char-count]");
const messageInput = document.querySelector("#guest-message");
const guestbookKey = "eume-zip-guestbook-v1";

if (guestbookForm && guestbookList && guestbookCount) {
  const readEntries = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(guestbookKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const formatDate = (value) => new Intl.DateTimeFormat("ko-KR", {
    month: "short", day: "numeric"
  }).format(new Date(value));

  const renderEntries = () => {
    const entries = readEntries();
    guestbookCount.textContent = entries.length;

    if (!entries.length) {
      guestbookList.innerHTML = '<div class="note-empty"><span aria-hidden="true">💌</span><strong>첫 번째 페이지를 남겨주세요!</strong><p>다녀간 흔적이 이곳에 쌓여요.</p></div>';
      return;
    }

    guestbookList.innerHTML = entries.slice().reverse().map((entry, index) => {
      const color = ["note-blue", "note-pink", "note-lime"][index % 3];
      return `<article class="guest-note ${color}"><span class="note-pin" aria-hidden="true">✦</span><p>${escapeHtml(entry.message).replace(/\n/g, "<br>")}</p><footer><strong>FROM. ${escapeHtml(entry.name)}</strong><time datetime="${entry.createdAt}">${formatDate(entry.createdAt)}</time></footer></article>`;
    }).join("");
  };

  const updateCount = () => {
    if (charCount && messageInput) charCount.textContent = `${messageInput.value.length} / 180`;
  };

  messageInput?.addEventListener("input", updateCount);

  guestbookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(guestbookForm);
    const name = String(formData.get("name") || "").trim();
    const message = String(formData.get("message") || "").trim();
    if (!name || !message) return;

    const entries = readEntries();
    entries.push({ name: name.slice(0, 18), message: message.slice(0, 180), createdAt: new Date().toISOString() });
    localStorage.setItem(guestbookKey, JSON.stringify(entries.slice(-30)));
    guestbookForm.reset();
    updateCount();
    renderEntries();
  });

  updateCount();
  renderEntries();
}
