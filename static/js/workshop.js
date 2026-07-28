const imp = document.querySelector("#imp");
const impLinks = document.querySelectorAll("[data-imp-link]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (imp && impLinks.length) {
  impLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      imp.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start",
      });
      imp.focus({ preventScroll: true });
    });
  });
}
