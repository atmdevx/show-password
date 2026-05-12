/**
 * ShowPassword - Browser Extension Content Script
 * @description Instantly reveals password field content on hover for effortless verification.
 *              Engineered for modern web apps: handles dynamic DOM mutations, Shadow DOM traversal,
 *              and seamless SPA navigation support without compromising performance.
 * @version 1.1.0
 */

(function () {
  "use strict";

  /**
   * Attaches hover and focus event listeners to a password input element.
   * - On mouseenter: switches type to 'text' to reveal the password visually.
   * - On mouseleave: reverts type back to 'password'.
   * - Applies a prominent green outline (independent of border styles) for unmistakable feedback.
   * - Guards against duplicate listeners using a data attribute flag.
   *
   * @param {HTMLInputElement} input - The password field to enhance.
   */
  function handlePasswordField(input) {
    // Prevent re-binding listeners to already-initialized fields
    if (input.dataset.showpasswordActive === "true") return;
    input.dataset.showpasswordActive = "true";

    let originalType = input.type;
    let isHovering = false;

    // --- Reveal password on hover ---
    input.addEventListener("mouseenter", () => {
      if (input.type === "password") {
        originalType = "password";
        input.type = "text";
        isHovering = true;

        // Apply a green outline with offset to avoid clashing with existing borders.
        // Green conveys security and confirmation — ideal for password visibility.
        input.style.setProperty("outline", "2px solid #22c55e", "important");
        input.style.setProperty("outline-offset", "2px", "important");
        input.style.setProperty(
          "box-shadow",
          "0 0 10px rgba(34, 197, 94, 0.25)",
          "important"
        );
      }
    });

    // --- Hide password when cursor leaves ---
    input.addEventListener("mouseleave", () => {
      if (isHovering && originalType === "password") {
        input.type = "password";
        isHovering = false;

        // Remove visual indicators
        input.style.removeProperty("outline");
        input.style.removeProperty("outline-offset");
        input.style.removeProperty("box-shadow");
      }
    });

    // --- Store original type on focus for future toggle support ---
    input.addEventListener("focus", () => {
      if (input.type === "password") {
        originalType = "password";
      }
    });

    // --- Clean up state on blur if hovering ended ---
    input.addEventListener("blur", () => {
      if (isHovering && originalType === "password") {
        input.type = "password";
        isHovering = false;
        input.style.removeProperty("outline");
        input.style.removeProperty("outline-offset");
        input.style.removeProperty("box-shadow");
      }
    });
  }

  /**
   * Determines if an input element is intended for password entry.
   * Checks standard type="password" as well as text inputs with
   * password-identifying attributes (autocomplete, name, placeholder, etc.).
   *
   * @param {HTMLElement} element - The element to inspect.
   * @returns {boolean} True if the element is a password field.
   */
  function isPasswordField(element) {
    // Standard password field
    if (element.type === "password") return true;

    // Heuristic: text inputs masquerading as password fields
    if (
      element.type === "text" &&
      (element.autocomplete === "current-password" ||
        element.autocomplete === "new-password" ||
        element.name?.toLowerCase().includes("password") ||
        element.id?.toLowerCase().includes("password") ||
        element.placeholder?.toLowerCase().includes("password") ||
        element.getAttribute("data-type") === "password" ||
        element.getAttribute("aria-label")?.toLowerCase().includes("password"))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Recursively scans a DOM root for password fields and initializes them.
   * Handles both standard DOM and open Shadow DOM boundaries.
   *
   * @param {Document|HTMLElement|ShadowRoot} root - The root node to scan.
   */
  function processAllPasswordFields(root = document) {
    // --- Standard input elements ---
    const inputs = root.querySelectorAll("input");
    inputs.forEach((input) => {
      if (isPasswordField(input)) {
        handlePasswordField(input);
      }
    });

    // --- Traverse into Shadow DOMs (e.g., web components) ---
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) {
        processAllPasswordFields(el.shadowRoot);
      }
    });

    // --- Handle custom text widgets acting as password inputs ---
    const customFields = root.querySelectorAll(
      '[role="textbox"][aria-label*="password" i], [contenteditable="true"][aria-label*="password" i]'
    );
    customFields.forEach((field) => {
      // Placeholder for custom widget support
      console.log("Custom password field found:", field);
    });
  }

  // ==============================
  // Initialization
  // ==============================

  // First pass on page load
  processAllPasswordFields();

  // ==============================
  // Dynamic Content Handling
  // ==============================

  /**
   * MutationObserver callback.
   * Re-scans for password fields when new nodes are added to the DOM
   * or when an existing input's type attribute changes.
   */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // --- Handle newly inserted nodes ---
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          // Direct input insertion
          if (node.tagName === "INPUT" && isPasswordField(node)) {
            handlePasswordField(node);
          }

          // Nested inputs within the inserted subtree
          if (node.querySelectorAll) {
            const inputs = node.querySelectorAll("input");
            inputs.forEach((input) => {
              if (isPasswordField(input)) {
                handlePasswordField(input);
              }
            });
          }

          // Shadow DOM roots within inserted elements
          if (node.shadowRoot) {
            processAllPasswordFields(node.shadowRoot);
          }
        }
      });

      // --- Handle attribute changes on existing inputs ---
      if (
        mutation.type === "attributes" &&
        mutation.target.tagName === "INPUT" &&
        mutation.attributeName === "type"
      ) {
        if (isPasswordField(mutation.target)) {
          handlePasswordField(mutation.target);
        }
      }
    });
  });

  // Start observing the document body for all relevant mutations
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["type"],
  });

  // ==============================
  // SPA Support (Polling Fallback)
  // ==============================

  // Periodically scan for password fields to handle SPA route changes
  // that do not trigger detectable DOM mutations (rare edge case).
  setInterval(() => {
    processAllPasswordFields();
  }, 2000);
})();