// After a new deploy, a page that was opened earlier may ask for code files that no longer exist (each build
// gives them new names), and the screen it was opening fails to load. Reloading once fetches the new version;
// the app returns to the same screen because the current view is kept in the browser history.
const KEY = 'chunk-reload-at';

export function reloadForNewVersion(err: unknown): Promise<never> {
    let last = 0;
    try {
        last = Number(sessionStorage.getItem(KEY) || 0);
    } catch {
        // storage unavailable: still reload once below
    }
    // Reload at most once every 30 s, so a real network problem cannot cause a reload loop
    if (Date.now() - last > 30000) {
        try {
            sessionStorage.setItem(KEY, String(Date.now()));
        } catch {
            // ignore
        }
        window.location.reload();
        return new Promise<never>(() => {}); // keep showing the loading screen until the page reloads
    }
    return Promise.reject(err);
}
