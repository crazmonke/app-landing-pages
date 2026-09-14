// Cloudflare Pages Functions middleware.
// Routes <app>.upsignaltrader.com/ to /apps/<app>/index.html in the static
// asset bucket, so each app only needs a wildcard custom domain (no separate
// Pages project per app). All other paths (assets, apps.json, css) pass
// through untouched regardless of hostname, since they're shared files.

const ROOT_HOSTS = ["upsignaltrader.com", "www.upsignaltrader.com"];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  const isRoot =
    ROOT_HOSTS.includes(host) ||
    host.endsWith(".pages.dev") ||
    host === "localhost";

  if (isRoot || url.pathname !== "/") {
    return context.next();
  }

  const subdomain = host.split(".")[0];
  url.pathname = `/apps/${subdomain}/`;
  return env.ASSETS.fetch(new Request(url, request));
}
