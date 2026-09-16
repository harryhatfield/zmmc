document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initHubLocator();
  initFranchiseForm();
  initHeroVideoSound();
  initCookieConsent();
});

/* ---- Cookie consent (gates the Google Ads tag) ---- */
const COOKIE_CONSENT_KEY = "zmmc_cookie_consent";
const GOOGLE_ADS_ID = "AW-18442684641";

function loadGoogleAdsTag() {
  if (window.zmmcGoogleTagLoaded) return;
  window.zmmcGoogleTagLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}

function initCookieConsent() {
  const settingsLink = document.querySelector("[data-cookie-settings]");
  settingsLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showCookieBanner();
  });

  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (consent === "accepted") {
    loadGoogleAdsTag();
    return;
  }
  if (consent === "rejected") return;

  showCookieBanner();
}

function showCookieBanner() {
  if (document.querySelector("[data-cookie-banner]")) return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("data-cookie-banner", "");
  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <p>We use cookies for advertising conversion tracking (Google Ads). Essential site functionality works either way — see our <a href="privacy.html">Privacy Policy</a> for details.</p>
      <div class="cookie-banner-actions">
        <button type="button" class="btn btn-outline" data-cookie-reject>Reject</button>
        <button type="button" class="btn btn-gold" data-cookie-accept>Accept</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    loadGoogleAdsTag();
    banner.remove();
  });
  banner.querySelector("[data-cookie-reject]").addEventListener("click", () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    banner.remove();
  });
}

/* ---- Hero video sound toggle ---- */
function initHeroVideoSound() {
  const toggle = document.querySelector("[data-hero-video-toggle]");
  const video = document.querySelector(".hero-video");
  if (!toggle || !video) return;

  toggle.addEventListener("click", () => {
    video.muted = !video.muted;
    toggle.toggleAttribute("data-unmuted", !video.muted);
    toggle.setAttribute("aria-label", video.muted ? "Turn sound on" : "Turn sound off");
  });
}

/* ---- Mobile nav toggle ---- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---- Hub locator (hubs.html + index.html preview) ---- */
function initHubLocator() {
  const grid = document.querySelector("[data-hub-grid]");
  if (!grid || typeof HUBS === "undefined") return;

  const searchInput = document.querySelector("[data-hub-search]");
  const regionSelect = document.querySelector("[data-hub-region]");
  const speciesSelect = document.querySelector("[data-hub-species]");
  const countEl = document.querySelector("[data-hub-count]");
  const emptyState = document.querySelector("[data-hub-empty]");
  const limit = Number(grid.dataset.hubGrid) || Infinity;

  if (regionSelect) {
    REGIONS.forEach((region) => {
      const opt = document.createElement("option");
      opt.value = region.value;
      opt.textContent = region.label;
      regionSelect.appendChild(opt);
    });
  }

  if (speciesSelect) {
    SPECIES.forEach((species) => {
      const opt = document.createElement("option");
      opt.value = species.value;
      opt.textContent = species.label;
      speciesSelect.appendChild(opt);
    });
  }

  function regionLabel(value) {
    const match = REGIONS.find((r) => r.value === value);
    return match ? match.label : value;
  }

  function hubCard(hub) {
    const statusLabel = hub.status === "open" ? "Open now" : "Opening soon";
    const buyVia =
      hub.buy ||
      (hub.status === "open"
        ? "Farm-gate collection, or via local butchers &amp; farm shops"
        : "Opening soon");
    const location = hub.postcode ? `${hub.town}, ${hub.postcode}` : hub.town;
    const websiteLabel = hub.website ? hub.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    const contact = [
      hub.phone,
      hub.email,
      hub.website ? `<a href="${hub.website}" target="_blank" rel="noopener">${websiteLabel}</a>` : "",
    ].filter(Boolean).join("<br>");

    return `
      <article class="hub-card">
        <span class="region-tag">${regionLabel(hub.region)} · ${statusLabel}</span>
        <h3>${hub.name}</h3>
        ${hub.estate ? `<p class="farm-partner">${hub.estate}</p>` : ""}
        <dl>
          <dt>Location</dt>
          <dd>${location}</dd>
          ${hub.product ? `<dt>Sells</dt><dd>${hub.product}</dd>` : ""}
          <dt>Buy</dt>
          <dd>${buyVia}</dd>
          <dt>Farm-Gate Hours</dt>
          <dd>${hub.hours}</dd>
          ${contact ? `<dt>Contact</dt><dd>${contact}</dd>` : ""}
        </dl>
        <div class="hub-actions">
          <a class="btn btn-outline-dark" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hub.mapsQuery)}" target="_blank" rel="noopener">Get Directions</a>
          ${hub.email ? `<a class="btn btn-outline-dark" href="mailto:${hub.email}">Email Hub</a>` : ""}
          ${hub.website ? `<a class="btn btn-outline-dark" href="${hub.website}" target="_blank" rel="noopener">Visit Website</a>` : ""}
        </div>
      </article>
    `;
  }

  function render() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const region = regionSelect?.value || "";
    const species = speciesSelect?.value || "";

    const filtered = HUBS.filter((hub) => {
      const matchesQuery =
        !query ||
        hub.town.toLowerCase().includes(query) ||
        (hub.postcode || "").toLowerCase().includes(query) ||
        hub.name.toLowerCase().includes(query) ||
        (hub.estate || "").toLowerCase().includes(query);
      const matchesRegion = !region || hub.region === region;
      const hubSpecies = Array.isArray(hub.species) ? hub.species : [hub.species];
      const matchesSpecies = !species || hubSpecies.includes(species);
      return matchesQuery && matchesRegion && matchesSpecies;
    });

    const toShow = filtered.slice(0, limit);

    grid.innerHTML = toShow.map(hubCard).join("");

    if (countEl) {
      countEl.textContent = filtered.length
        ? `Showing ${toShow.length} of ${filtered.length} hub${filtered.length === 1 ? "" : "s"}`
        : "";
    }

    if (emptyState) {
      emptyState.style.display = filtered.length ? "none" : "block";
    }
  }

  searchInput?.addEventListener("input", render);
  regionSelect?.addEventListener("change", render);
  speciesSelect?.addEventListener("change", render);

  render();
}

/* ---- Zoho Campaigns background sign-up ---- */
function syncToZohoCampaigns(name, email) {
  const zohoForm = document.querySelector("[data-zoho-form]");
  if (!zohoForm || !email) return;

  const [firstName, ...rest] = (name || "").trim().split(/\s+/);
  zohoForm.querySelector("[data-zoho-email]").value = email;
  zohoForm.querySelector("[data-zoho-firstname]").value = firstName || "";
  zohoForm.querySelector("[data-zoho-lastname]").value = rest.join(" ");
  zohoForm.submit();
}

/* ---- Franchise enquiry form ---- */
function initFranchiseForm() {
  const form = document.querySelector("[data-franchise-form]");
  if (!form) return;

  const status = form.querySelector("[data-form-status]");
  const endpoint = form.getAttribute("action") || "";
  const isPlaceholder = endpoint.includes("YOUR_FORM_ID");

  form.addEventListener("submit", async (e) => {
    if (isPlaceholder) {
      e.preventDefault();
      if (status) {
        status.dataset.state = "error";
        status.textContent =
          "Form isn't connected yet — set up a Formspree endpoint (or your preferred form service) and update the form's action attribute. In the meantime, please email info@thezeromilesmeatcompany.co.uk directly.";
      }
      return;
    }

    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn?.setAttribute("disabled", "true");

    syncToZohoCampaigns(form.elements.name?.value, form.elements.email?.value);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        form.reset();
        if (status) {
          status.dataset.state = "success";
          status.textContent = "Thanks — your enquiry has been sent. We'll be in touch shortly.";
        }
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      if (status) {
        status.dataset.state = "error";
        status.textContent =
          "Something went wrong sending your enquiry. Please email info@thezeromilesmeatcompany.co.uk instead.";
      }
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
}
