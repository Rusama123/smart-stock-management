// src/hooks/useScripts.js
import { useEffect } from "react";

export const reinitPlugins = () => {
  // AOS
  if (window.AOS) {
    window.AOS.init({ duration: 600, easing: "ease-in-out", once: true, mirror: false });
  }

  // PureCounter
  if (window.PureCounter) new window.PureCounter();

  // GLightbox
  if (window.GLightbox) window.GLightbox({ selector: ".glightbox" });

  // Scroll-top button visibility
  const scrollTop = document.getElementById("scroll-top");
  if (scrollTop) {
    const toggleScrollTop = () => {
      window.scrollY > 100
        ? scrollTop.classList.add("active")
        : scrollTop.classList.remove("active");
    };
    window.addEventListener("scroll", toggleScrollTop);
    scrollTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Mobile nav toggle
  const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
  if (mobileNavToggle) {
    mobileNavToggle.addEventListener("click", () => {
      document.body.classList.toggle("mobile-nav-active");
      mobileNavToggle.classList.toggle("bi-list");
      mobileNavToggle.classList.toggle("bi-x");
    });
  }

  // Dropdown toggles in nav
  document.querySelectorAll(".navmenu .toggle-dropdown").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.parentNode.classList.toggle("active");
      toggle.parentNode.nextElementSibling?.classList.toggle("dropdown-active");
    });
  });
};

const useScripts = () => {
  useEffect(() => {
    const t = setTimeout(reinitPlugins, 300);
    return () => clearTimeout(t);
  }, []);
};

export default useScripts;