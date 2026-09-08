const currentPage = document.body.dataset.page;
const currentTab = document.querySelector(`[data-route="${currentPage}"]`);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

window.requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
});

if (currentTab) {
  currentTab.classList.add("is-active");
  currentTab.setAttribute("aria-current", "page");
}

document.querySelectorAll("a[href$='.html']").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || prefersReducedMotion.matches) return;
    event.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => { window.location.href = link.href; }, 170);
  });
});

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const tiltCard = document.querySelector("[data-tilt]");

if (tiltCard && !prefersReducedMotion.matches && window.matchMedia("(pointer: fine)").matches) {
  tiltCard.addEventListener("pointermove", (event) => {
    const bounds = tiltCard.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    tiltCard.style.setProperty("--glow-x", `${(x + 0.5) * 100}%`);
    tiltCard.style.setProperty("--glow-y", `${(y + 0.5) * 100}%`);
    tiltCard.style.transform = `perspective(700px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg) rotateZ(1deg)`;
  });

  tiltCard.addEventListener("pointerleave", () => {
    tiltCard.style.setProperty("--glow-x", "50%");
    tiltCard.style.setProperty("--glow-y", "50%");
    tiltCard.style.transform = "rotate(2deg)";
  });
}

if (!prefersReducedMotion.matches && window.matchMedia("(pointer: fine)").matches) {
  const cursorLight = document.createElement("div");
  cursorLight.className = "cursor-light";
  cursorLight.setAttribute("aria-hidden", "true");
  document.body.append(cursorLight);

  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--mouse-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${event.clientY}px`);
  }, { passive: true });
}
