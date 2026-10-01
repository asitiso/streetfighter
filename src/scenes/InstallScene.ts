import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import type { PwaInstallManager } from '../core/PwaInstallManager.js';

export class InstallScene implements Scene {
  private message = '';
  private busy = false;
  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly install: PwaInstallManager,
    private readonly onBack: () => void,
  ) {}
  enter(): void { this.audio.playStagePulse(); }
  exit(): void {}
  resize(): void {}
  destroy(): void {}
  fixedUpdate(): void {
    if (this.input.pressed('lk')) { this.onBack(); return; }
    if ((this.input.pressed('lp') || this.input.pressed('start')) && !this.busy && this.install.state() === 'available') {
      this.busy = true;
      void this.install.prompt().then((result) => { this.message = result === 'accepted' ? 'INSTALL ACCEPTED' : result === 'dismissed' ? 'INSTALL DISMISSED' : 'USE BROWSER INSTALL MENU'; this.busy = false; });
    }
  }
  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const g = ctx.createRadialGradient(640, 300, 60, 640, 350, 700); g.addColorStop(0, '#29314a'); g.addColorStop(1, '#090c13'); ctx.fillStyle = g; ctx.fillRect(0,0,1280,720);
    ctx.textAlign='center'; ctx.fillStyle='#f2d277'; ctx.font='900 42px Arial Black, sans-serif'; ctx.fillText('INSTALL TO HOME SCREEN',640,128);
    const state = this.install.state();
    ctx.fillStyle='rgba(255,255,255,.06)'; ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(260,178,760,360,20); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='900 22px Arial Black, sans-serif';
    if (state === 'standalone') ctx.fillText('APP IS ALREADY RUNNING STANDALONE',640,232);
    else if (state === 'available') ctx.fillText('ONE-TAP INSTALL IS AVAILABLE',640,232);
    else if (state === 'ios-guide') ctx.fillText('SAFARI • SHARE → ADD TO HOME SCREEN',640,232);
    else ctx.fillText('BROWSER MENU → INSTALL APP / ADD TO HOME SCREEN',640,232);
    ctx.font='700 15px Arial, sans-serif'; ctx.fillStyle='rgba(224,231,241,.78)';
    const lines = state === 'ios-guide' ? ['1. Safari 공유 버튼을 누릅니다.', '2. 홈 화면에 추가를 선택합니다.', '3. 가로 화면으로 실행합니다.'] : state === 'available' ? ['LP / START를 누르면 설치 창이 열립니다.', '설치 후 홈 화면 아이콘으로 실행하면', '전체화면에 가까운 standalone 모드로 플레이할 수 있습니다.'] : ['브라우저의 ⋮ 또는 설치 아이콘을 엽니다.', 'Install App / 홈 화면에 추가를 선택합니다.', '지원 브라우저에서는 오프라인 App Shell도 사용할 수 있습니다.'];
    lines.forEach((line,i)=>ctx.fillText(line,640,304+i*42));
    if (this.message) { ctx.fillStyle='#8be0b4'; ctx.font='900 14px Arial Black, sans-serif'; ctx.fillText(this.message,640,466); }
    ctx.fillStyle='rgba(255,255,255,.56)'; ctx.font='700 12px Arial, sans-serif'; ctx.fillText(state === 'available' ? 'LP / START  INSTALL   •   LK  BACK' : 'LK  BACK',640,596);
    ctx.restore();
  }
}
