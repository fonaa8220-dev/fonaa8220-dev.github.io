const guestbookForm = document.querySelector("[data-guestbook-form]");
const guestbookList = document.querySelector("[data-guestbook-list]");
const guestbookCount = document.querySelector("[data-entry-count]");
const guestbookStatus = document.querySelector("[data-guestbook-status]");
const charCount = document.querySelector("[data-char-count]");
const messageInput = document.querySelector("#guest-message");
const submitButton = guestbookForm?.querySelector('button[type="submit"]');
const supabaseClient = window.getEumeSupabaseClient?.() || null;

if (guestbookForm && guestbookList && guestbookCount) {
  let entries = [];

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const formatDate = (value) => new Intl.DateTimeFormat("ko-KR", {
    month: "short", day: "numeric"
  }).format(new Date(value));

  const renderEntries = () => {
    guestbookCount.textContent = entries.length;

    if (!entries.length) {
      guestbookList.innerHTML = '<div class="note-empty"><span aria-hidden="true">💌</span><strong>첫 번째 페이지를 남겨주세요!</strong><p>다녀간 흔적이 이곳에 쌓여요.</p></div>';
      return;
    }

    guestbookList.innerHTML = entries.map((entry, index) => {
      const color = ["note-blue", "note-pink", "note-lime"][index % 3];
      const safeDate = escapeHtml(entry.created_at);
      return `<article class="guest-note ${color}"><span class="note-pin" aria-hidden="true">✦</span><p>${escapeHtml(entry.message).replace(/\n/g, "<br>")}</p><footer><strong>FROM. ${escapeHtml(entry.name)}</strong><time datetime="${safeDate}">${formatDate(entry.created_at)}</time></footer></article>`;
    }).join("");
  };

  const updateCount = () => {
    if (charCount && messageInput) charCount.textContent = `${messageInput.value.length} / 180`;
  };

  const loadEntries = async () => {
    if (!supabaseClient) {
      guestbookStatus.textContent = "방명록 연결 설정을 확인해 주세요.";
      submitButton.disabled = true;
      renderEntries();
      return;
    }

    const { data, error } = await supabaseClient
      .from("guestbook_entries")
      .select("id, name, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("방명록을 불러오지 못했습니다.", error);
      guestbookStatus.textContent = "방명록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.";
      return;
    }

    entries = data || [];
    guestbookStatus.textContent = "남긴 글은 모든 방문자에게 함께 보여요.";
    renderEntries();
  };

  messageInput?.addEventListener("input", updateCount);

  guestbookForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient || submitButton.disabled) return;

    const formData = new FormData(guestbookForm);
    const name = String(formData.get("name") || "").trim().slice(0, 18);
    const message = String(formData.get("message") || "").trim().slice(0, 180);
    if (!name || !message) return;

    submitButton.disabled = true;
    guestbookStatus.textContent = "페이지를 붙이는 중이에요…";

    const { data, error } = await supabaseClient
      .from("guestbook_entries")
      .insert({ name, message })
      .select("id, name, message, created_at")
      .single();

    submitButton.disabled = false;

    if (error) {
      console.error("방명록을 저장하지 못했습니다.", error);
      guestbookStatus.textContent = "저장하지 못했어요. 작성 내용은 유지했으니 다시 시도해 주세요.";
      return;
    }

    entries.unshift(data);
    entries = entries.slice(0, 50);
    guestbookForm.reset();
    updateCount();
    guestbookStatus.textContent = "방명록에 페이지를 붙였어요!";
    renderEntries();
  });

  updateCount();
  loadEntries();
}
