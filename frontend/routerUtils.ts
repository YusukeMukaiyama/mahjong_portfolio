type RouteInfo = { view: "home"; matchId: null } | { view: "detail"; matchId: string };

type RuntimeGlobal = typeof globalThis & {
  resolveRouteView?: (hash: string | null | undefined, pathname: string | null | undefined) => RouteInfo;
};

declare const module:
  | {
      exports?: Record<string, unknown>;
    }
  | undefined;

(function (global: RuntimeGlobal) {
  function resolveRouteView(hash: string | null | undefined, pathname: string | null | undefined): RouteInfo {
    const h = typeof hash === "string" ? hash : "";
    const p = typeof pathname === "string" && pathname.length > 0 ? pathname : "/";
    const path = h.startsWith("#") && h.length > 1 ? h.slice(1) : p;
    const matched = path.match(/^\/matches\/([^/]+)$/);
    if (matched) {
      return { view: "detail", matchId: decodeURIComponent(matched[1]) };
    }
    return { view: "home", matchId: null };
  }

  global.resolveRouteView = resolveRouteView;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { resolveRouteView };
  }
})(typeof window !== "undefined" ? (window as RuntimeGlobal) : (globalThis as RuntimeGlobal));
