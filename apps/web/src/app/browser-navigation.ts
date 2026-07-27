import { useCallback, useSyncExternalStore } from "react";

const navigationEvent = "lnfs:navigation";

function locationSnapshot() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(navigationEvent, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(navigationEvent, listener);
  };
}

export function useBrowserLocation() {
  const snapshot = useSyncExternalStore(subscribe, locationSnapshot, () => "/");
  const url = new URL(snapshot, window.location.origin);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash
  };
}

export function useBrowserNavigate() {
  return useCallback((path: string) => {
    const current = locationSnapshot();
    if (path === current || path === `${window.location.pathname}${window.location.search}`) {
      return;
    }
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event(navigationEvent));
  }, []);
}
