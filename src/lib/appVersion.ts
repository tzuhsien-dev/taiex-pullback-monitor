export const getModuleScriptPath = (html: string, baseUrl: string) => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const source = document
    .querySelector<HTMLScriptElement>('script[type="module"][src]')
    ?.getAttribute('src');
  return source ? new URL(source, baseUrl).pathname : null;
};

export const hasNewAppVersion = async () => {
  const currentSource = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src;
  if (!currentSource) return false;

  const url = new URL(window.location.href);
  url.searchParams.set('_version', Date.now().toString());
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return false;

  const latestPath = getModuleScriptPath(await response.text(), window.location.href);
  return Boolean(latestPath && latestPath !== new URL(currentSource).pathname);
};
