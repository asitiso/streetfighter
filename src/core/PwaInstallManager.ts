interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallState = 'standalone' | 'available' | 'ios-guide' | 'browser-guide';

export class PwaInstallManager {
  private deferred: BeforeInstallPromptEvent | null = null;
  private installed = false;

  constructor() {
    if (typeof window === 'undefined') return;
    this.installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => { this.installed = true; this.deferred = null; });
  }

  state(): InstallState {
    if (this.installed) return 'standalone';
    if (this.deferred) return 'available';
    const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return ios ? 'ios-guide' : 'browser-guide';
  }

  async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferred) return 'unavailable';
    await this.deferred.prompt();
    const choice = await this.deferred.userChoice;
    if (choice.outcome === 'accepted') this.deferred = null;
    return choice.outcome;
  }
}
