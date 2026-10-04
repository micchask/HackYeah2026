// PWA (#35): Service Worker tylko w buildzie produkcyjnym - w dev nie przeszkadza w hot reload.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // bez Service Workera aplikacja działa normalnie, tylko nie offline
    })
  })
}
