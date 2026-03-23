/**
 * Navigate with View Transitions API support.
 * Falls back to immediate navigation on unsupported browsers.
 *
 * @param {Function} navigateFn - React Router's navigate function
 * @param {string} to - Path to navigate to
 * @param {Object} [options] - React Router navigate options
 */
export function navigateWithTransition(navigateFn, to, options = {}) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      navigateFn(to, options);
    });
  } else {
    navigateFn(to, options);
  }
}

/**
 * Higher-order function that wraps a React Router navigate function
 * with View Transitions API support.
 *
 * Usage:
 *   const navigate = useNavigate();
 *   const navWithTransition = withViewTransition(navigate);
 *   navWithTransition('/constellation');
 */
export function withViewTransition(navigateFn) {
  return (to, options = {}) => navigateWithTransition(navigateFn, to, options);
}

/**
 * Global click interceptor that wraps all internal <a> link clicks
 * (React Router <Link> renders as <a>) with the View Transitions API.
 *
 * Call once at app mount (e.g., in a useEffect in AppContent).
 * Returns a cleanup function to remove the listener.
 *
 * How it works:
 * - Listens for click events on the document (delegation)
 * - Finds the closest <a> ancestor of the click target
 * - Checks if the link is internal (same origin, no target="_blank", no download)
 * - If internal and View Transitions API is available:
 *   - Prevents the default browser navigation
 *   - Wraps React Router's client-side navigation in startViewTransition
 * - If not supported, lets the click proceed normally (React Router handles it)
 *
 * @param {Function} navigateFn - React Router's navigate function
 * @returns {Function} cleanup function to remove the event listener
 */
export function setupGlobalViewTransitions(navigateFn) {
  // Bail out early if browser doesn't support View Transitions
  if (!document.startViewTransition) {
    return () => {}; // no-op cleanup
  }

  function handleClick(e) {
    // Find the closest <a> element from the click target
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    // Skip if modifier keys are held (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Skip external links, downloads, target="_blank"
    if (anchor.target === '_blank') return;
    if (anchor.hasAttribute('download')) return;
    if (anchor.origin !== window.location.origin) return;

    // Skip hash-only links on the same page
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    // Skip if data-no-view-transition is present (opt-out escape hatch)
    if (anchor.hasAttribute('data-no-view-transition')) return;

    // Skip constellation routes — WebGL/Three.js contexts conflict with
    // view transition snapshots, causing Context Lost on first-visit hover
    if (href.startsWith('/constellation')) return;

    // This is an internal React Router link -- intercept it
    e.preventDefault();

    document.startViewTransition(() => {
      navigateFn(href);
    });
  }

  document.addEventListener('click', handleClick, { capture: true });

  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
  };
}
