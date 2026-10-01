import { GameApp } from './core/GameApp.js';
import { RuntimeErrorJournal } from './core/RuntimeErrorJournal.js';
import { PwaUpdateManager } from './core/PwaUpdateManager.js';
import { RELEASE_CANDIDATE } from './core/ReleaseReport.js';

const errorJournal = new RuntimeErrorJournal(RELEASE_CANDIDATE);
errorJournal.install();

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    void registration.update().catch((error) => errorJournal.record('update', error, 'warning'));
  } catch (error) {
    errorJournal.record('update', error, 'error');
    console.error('Service worker registration failed', error);
  }
}

async function boot(): Promise<void> {
  const host = document.querySelector<HTMLElement>('#app');
  if (!host) throw new Error('Missing #app host');
  const game = new GameApp(errorJournal);
  await game.init(host);
  await registerServiceWorker();
}

boot().catch(async (error: unknown) => {
  errorJournal.record('boot', error, 'fatal');
  console.error(error);
  const updater = new PwaUpdateManager(RELEASE_CANDIDATE);
  const recovery = await updater.recoverFailedBoot().catch(() => ({ recovered: false, message: 'AUTO RECOVERY FAILED' }));
  if (recovery.recovered) {
    window.setTimeout(() => window.location.reload(), 120);
    return;
  }
  const host = document.querySelector<HTMLElement>('#app');
  if (host) {
    const panel = document.createElement('div');
    panel.className = 'fatal-error';
    const title = document.createElement('strong');
    title.textContent = 'BOOT ERROR';
    const detail = document.createElement('span');
    detail.textContent = `${String(error)} • ${recovery.message}`;
    panel.append(title, detail);
    host.replaceChildren(panel);
  }
});
