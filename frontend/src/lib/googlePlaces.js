let loadingPromise = null;

export function loadGooglePlaces() {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) return Promise.resolve(false);

  if (window.google?.maps?.places) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadingPromise;
}
