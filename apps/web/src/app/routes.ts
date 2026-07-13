import type { View } from "./types";

export interface AppRouteState {
  view: View;
  postId: string | null;
}

export function routeState(pathname: string, search: string): AppRouteState {
  const postMatch = /^\/posts\/([^/]+)\/?$/.exec(pathname);
  if (postMatch) {
    return { view: "post-detail", postId: decodeURIComponent(postMatch[1]) };
  }

  const legacyPostId = new URLSearchParams(search).get("post");
  if (legacyPostId) {
    return { view: "post-detail", postId: legacyPostId };
  }

  const routes: Record<string, Exclude<View, "post-detail">> = {
    "/": "board",
    "/my-posts": "my-posts",
    "/create": "create",
    "/handover": "handover",
    "/account": "account"
  };
  return { view: routes[pathname] ?? "board", postId: null };
}

export function pathForView(view: Exclude<View, "post-detail">) {
  const paths: Record<Exclude<View, "post-detail">, string> = {
    board: "/",
    "my-posts": "/my-posts",
    create: "/create",
    handover: "/handover",
    account: "/account"
  };
  return paths[view];
}

export function postPath(postId: string) {
  return `/posts/${encodeURIComponent(postId)}`;
}
