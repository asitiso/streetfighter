import { FixedStepLoop } from './FixedStepLoop.js';
import { SceneManager } from './SceneManager.js';
import { InputManager } from '../input/InputManager.js';
import { SaveManager, SAVE_DB_NAME, type GameSave } from '../save/SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { AssetManager, GAME_CACHE_NAME } from './AssetManager.js';
import { TouchControls } from '../ui/TouchControls.js';
import { TitleScene, type TitleMenuOption } from '../scenes/TitleScene.js';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene.js';
import { SuperArtSelectScene } from '../scenes/SuperArtSelectScene.js';
import { StageSelectScene } from '../scenes/StageSelectScene.js';
import { OptionsScene } from '../scenes/OptionsScene.js';
import { ResultsScene } from '../scenes/ResultsScene.js';
import { getCharacter, type CharacterDef, type SuperArtDef } from '../game/characters.js';
import type { StageResult } from '../game/StageResult.js';
import { runtimeQuality } from './RuntimeQuality.js';
import { PwaInstallManager } from './PwaInstallManager.js';
import { ReleaseCheckScene } from '../scenes/ReleaseCheckScene.js';
import { SaveToolsScene } from '../scenes/SaveToolsScene.js';
import { simulatePreviousReleaseUpgrade } from './UpdatePolicy.js';
import { InstallScene } from '../scenes/InstallScene.js';
import { RuntimeTelemetry } from './RuntimeTelemetry.js';
import { DeviceCertificationStore, certificationSummary } from './DeviceCertification.js';
import { RELEASE_CANDIDATE } from './ReleaseReport.js';
import { DeviceCertificationScene } from '../scenes/DeviceCertificationScene.js';
import { PwaUpdateManager } from './PwaUpdateManager.js';
import { PwaUpdateScene } from '../scenes/PwaUpdateScene.js';
import { RuntimeErrorJournal } from './RuntimeErrorJournal.js';
import { SessionRecoveryStore } from './SessionRecovery.js';
import { RecoveryHistoryStore } from './RecoveryHistory.js';
import { buildReleaseSummary } from './ReleaseSummary.js';
import { DiagnosticsScene } from '../scenes/DiagnosticsScene.js';
import { DeviceCertificationHistoryStore } from './DeviceCertificationHistory.js';
import { buildReproPackage, reproPackageJson } from './ReproPackage.js';
import { evaluateReleaseApproval, ReleaseApprovalStore } from './ReleaseApproval.js';
import { loadingProfile } from './LoadingProfiles.js';
import { measureSafeArea, readSafeAreaInsets, safeViewportSize } from './SafeAreaProbe.js';
import { buildFinalProofBundle, finalProofBundleJson } from './FinalProofBundle.js';
import { buildReleaseEvidenceFingerprint } from './ReleaseEvidenceFingerprint.js';
import { ReleaseIntegrityVerifier } from './ReleaseIntegrity.js';

export class GameApp {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scenes = new SceneManager();
  private readonly input = new InputManager();
  private readonly saves = new SaveManager();
  private readonly audio = new AudioManager();
  private readonly assets = new AssetManager();
  private readonly touch = new TouchControls(this.input);
  private readonly install = new PwaInstallManager();
  private readonly loadingOverlay = document.createElement('div');
  private readonly telemetry = new RuntimeTelemetry();
  private readonly certification = new DeviceCertificationStore(RELEASE_CANDIDATE);
  private readonly certificationHistory = new DeviceCertificationHistoryStore(RELEASE_CANDIDATE);
  private readonly releaseApproval = new ReleaseApprovalStore(RELEASE_CANDIDATE);
  private readonly releaseIntegrity = new ReleaseIntegrityVerifier();
  private readonly updates = new PwaUpdateManager(RELEASE_CANDIDATE);
  private readonly recovery = new SessionRecoveryStore(RELEASE_CANDIDATE);
  private readonly recoveryHistory = new RecoveryHistoryStore(RELEASE_CANDIDATE);
  private readonly errors: RuntimeErrorJournal;
  private loop: FixedStepLoop | null = null;
  private save: GameSave | null = null;
  private logicalWidth = 1280;
  private logicalHeight = 720;
  private cssWidth = 1280;
  private cssHeight = 720;
  private viewScale = 1;
  private dpr = 1;
  private readonly bootedOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  private backgroundedAt: number | null = null;

  constructor(errors = new RuntimeErrorJournal(RELEASE_CANDIDATE)) {
    this.errors = errors;
    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D unavailable');
    this.ctx = context;
  }

  async init(host: HTMLElement): Promise<void> {
    this.errors.install();
    this.recovery.begin();
    runtimeQuality.configureFromEnvironment();
    this.canvas.className = 'game-canvas';
    this.loadingOverlay.className = 'loading-overlay hidden';
    this.loadingOverlay.innerHTML = '<div class="loading-card"><small class="loading-kicker">SYSTEM</small><strong>LOADING</strong><span>PREPARING GAME</span><b class="loading-detail">COMBAT CORE • INPUT • SAVE</b><b class="loading-route">BOOT → TITLE</b><em></em><div class="loading-track"><i></i></div><div class="loading-actions"><button data-action="retry">RETRY</button><button data-action="back">BACK TO TITLE</button></div></div>';
    host.append(this.canvas, this.touch.element, this.loadingOverlay);

    await this.saves.init();
    this.save = await this.saves.load();
    this.audio.setEnabled(this.save.audioEnabled);
    this.touch.setSettings({
      stickScale: this.save.touchStickScale, buttonScale: this.save.touchButtonScale, opacity: this.save.touchOpacity,
      stickX: this.save.touchStickX, stickY: this.save.touchStickY, buttonsX: this.save.touchButtonsX, buttonsY: this.save.touchButtonsY,
      vibrationEnabled: this.save.vibrationEnabled,
    });
    await this.assets.loadGroup('app-shell');
    await this.showTitle();

    this.loop = new FixedStepLoop(
      (dt, tick) => {
        this.input.prepareTick();
        this.scenes.fixedUpdate(dt, tick);
        this.input.endTick();
      },
      (alpha, frameDt) => this.render(alpha, frameDt),
    );

    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
    this.loop.start();
    document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true });
    window.addEventListener('pagehide', this.onPageHide, { passive: true });
    if (new URLSearchParams(window.location.search).get('debug') === '1') this.installDebugOverlay();
    this.updates.markBootHealthy();
  }

  private async showTitle(): Promise<void> {
    this.syncAutomaticCertification();
    this.recovery.checkpoint('title', null, null, null);
    const interrupted = this.recovery.snapshot();
    const stage = Math.max(1, Math.min(5, this.save?.currentStage ?? 1));
    const campaignComplete = !!this.save?.stageSelectUnlocked && (this.save?.completedStages.includes(5) ?? false);
    const options: TitleMenuOption[] = [
      { id: 'new-game', label: 'NEW GAME', detail: 'CHARACTER SELECT → STAGE 1', enabled: true, action: () => { void this.showCharacterSelect(); } },
      { id: 'continue', label: 'CONTINUE', detail: this.save?.hasCampaignStarted ? `STAGE ${stage} • ${this.save.selectedCharacter}` : campaignComplete ? 'CAMPAIGN COMPLETE • USE STAGE SELECT' : 'NO CAMPAIGN SAVE', enabled: !!this.save?.hasCampaignStarted, action: () => { void this.continueCampaign(); } },
      { id: 'recover-session', label: 'RECOVER SESSION', detail: interrupted.label, enabled: interrupted.available, action: () => { void this.recoverInterruptedSession(); } },
      { id: 'stage-select', label: 'STAGE SELECT', detail: this.save?.stageSelectUnlocked ? 'STAGES 1–5 UNLOCKED' : 'CLEAR THE CAMPAIGN TO UNLOCK', enabled: !!this.save?.stageSelectUnlocked, action: () => { void this.showStageSelect(); } },
      { id: 'battle-record', label: 'BATTLE RECORD', detail: this.save?.stageResults.length ? `${this.save.stageResults.length}/5 STAGES RECORDED` : 'NO STAGE RECORDS', enabled: !!this.save?.stageResults.length, action: () => { void this.showResults(); } },
      { id: 'save-tools', label: 'SAVE TOOLS', detail: 'EXPORT / IMPORT PORTABLE BACKUP', enabled: true, action: () => { void this.showSaveTools(); } },
      { id: 'install', label: 'INSTALL APP', detail: this.install.state() === 'standalone' ? 'RUNNING STANDALONE' : this.install.state() === 'available' ? 'ONE-TAP INSTALL READY' : 'HOME SCREEN GUIDE', enabled: true, action: () => { void this.showInstall(); } },
      { id: 'device-cert', label: 'DEVICE CERT', detail: (() => { const c = certificationSummary(this.certification.snapshot()); return `${c.passed}/${c.total} PASS • ${c.untested} UNTESTED`; })(), enabled: true, action: () => { void this.showDeviceCertification(); } },
      { id: 'pwa-update', label: 'PWA UPDATE', detail: 'CHECK • APPLY • ROLLBACK ASSETS', enabled: true, action: () => { void this.showPwaUpdate(); } },
      { id: 'release-check', label: 'RELEASE CHECK', detail: `${runtimeQuality.currentTier.toUpperCase()} QUALITY • DEVICE / PWA STATUS`, enabled: true, action: () => { void this.showReleaseCheck(); } },
      { id: 'diagnostics', label: 'DIAGNOSTICS', detail: (() => { const e = this.errors.snapshot(); const r = this.recoveryHistory.snapshot(); return `${e.total} ERR • ${r.total} RECOVERY EVENTS`; })(), enabled: true, action: () => { void this.showDiagnostics(); } },
      { id: 'options', label: 'OPTIONS', detail: 'AUDIO • HD REMASTER • TOUCH LAYOUT', enabled: true, action: () => { void this.showOptions(); } },
    ];
    await this.scenes.setScene(new TitleScene(this.input, this.audio, options));
  }

  private async showSaveTools(): Promise<void> {
    await this.scenes.setScene(new SaveToolsScene(this.input, this.audio, {
      current: () => this.save,
      health: () => this.saves.health,
      exportSave: () => this.saves.exportPortable(),
      importSave: (text) => this.saves.importPortable(text),
      onImported: (save) => { this.save = save; this.audio.setEnabled(save.audioEnabled); this.touch.setSettings({ stickScale: save.touchStickScale, buttonScale: save.touchButtonScale, opacity: save.touchOpacity, stickX: save.touchStickX, stickY: save.touchStickY, buttonsX: save.touchButtonsX, buttonsY: save.touchButtonsY, vibrationEnabled: save.vibrationEnabled }); },
    }, () => { void this.showTitle(); }));
  }

  private async showInstall(): Promise<void> {
    await this.scenes.setScene(new InstallScene(this.input, this.audio, this.install, () => { void this.showTitle(); }));
  }

  private async showDeviceCertification(): Promise<void> {
    await this.scenes.setScene(new DeviceCertificationScene(this.input, this.audio, {
      candidate: RELEASE_CANDIDATE,
      canvas: this.canvas,
      getRecord: () => this.certification.snapshot(),
      setTest: (id, status, note) => { const record = this.certification.setTest(id, status, note); this.certificationHistory.archive(record, 'current'); return record; },
      setLatency: (samples) => { const record = this.certification.setLatency(samples); this.certificationHistory.archive(record, 'current'); return record; },
      syncAutomaticEvidence: () => this.syncAutomaticCertification(),
      reset: () => { this.certificationHistory.archive(this.certification.snapshot(), 'current'); this.releaseApproval.revoke(); return this.certification.reset(); },
      exportFinalProof: () => { this.exportFinalProof(); },
      importCertification: () => this.importDeviceCertification(),
      setTouchVisible: (visible) => this.touch.setVisible(visible),
      runOfflineTransitionAudit: () => this.assets.auditOfflineDynamicImports(),
      getTelemetry: () => this.telemetry.snapshot(),
    }, () => { void this.showTitle(); }));
  }


  private syncAutomaticCertification(): ReturnType<DeviceCertificationStore['snapshot']> {
    const before = this.certification.snapshot();
    const telemetry = this.telemetry.snapshot();
    const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const safeArea = measureSafeArea(this.canvas);
    const record = this.certification.applyAutomaticEvidence({
      standalone,
      bootedOffline: this.bootedOffline,
      audioReady: this.audio.isRunning(),
      sessionSeconds: telemetry.sessionSeconds,
      frameStability: telemetry.stability,
      memoryStability: telemetry.memoryStability,
      sustainedStability: telemetry.sustainedStability,
      baselineFps: telemetry.baselineFps,
      recentFps: telemetry.recentFps,
      sustainedDegradationPct: telemetry.sustainedDegradationPct,
      qualityChanges: telemetry.qualityChanges,
      heapTrendMbPerMin: telemetry.heapTrendMbPerMin,
      safeAreaReady: safeArea.ready,
      safeAreaNote: safeArea.note,
    });
    if (record.updatedAt !== before.updatedAt) {
      this.certificationHistory.archive(record, 'current');
      this.releaseApproval.revoke();
    }
    return record;
  }

  private async importDeviceCertification(): Promise<{ ok: boolean; message: string; record?: ReturnType<DeviceCertificationStore['snapshot']> }> {
    const text = await this.pickJsonText();
    if (text == null) return { ok: false, message: 'IMPORT CANCELLED' };
    const result = this.certification.importJson(text);
    if (result.ok && result.record) {
      this.certificationHistory.archive(result.record, 'import');
      this.releaseApproval.revoke();
      this.recoveryHistory.record('device-cert-import', 'success', result.message);
      return { ok: true, message: result.message, record: result.record };
    }
    const historical = this.certificationHistory.importJson(text);
    if (historical.ok) {
      this.recoveryHistory.record('device-cert-import', 'success', historical.message);
      return { ok: true, message: `${historical.message} • CURRENT CERT UNCHANGED`, record: this.certification.snapshot() };
    }
    this.recoveryHistory.record('device-cert-import', 'failed', result.message);
    return { ok: false, message: result.message };
  }

  private async showDiagnostics(): Promise<void> {
    await this.releaseIntegrity.verify();
    const releaseSummary = () => buildReleaseSummary({
      candidate: RELEASE_CANDIDATE,
      save: this.saves.health,
      certification: this.certification.snapshot(),
      errors: this.errors.snapshot(),
      recovery: this.recoveryHistory.snapshot(),
      telemetry: this.telemetry.snapshot(),
      serviceWorkerControlled: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
      standalone: typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true),
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
    });
    const approval = () => {
      const certification = this.certification.snapshot();
      this.certificationHistory.archive(certification, 'current');
      const errors = this.errors.snapshot();
      const storedApproval = this.releaseApproval.snapshot();
      const integrity = this.releaseIntegrity.snapshot();
      const currentFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification, errors, integrity });
      return evaluateReleaseApproval({
        candidate: RELEASE_CANDIDATE,
        acceptance: certification.lastAcceptance,
        certification,
        comparison: this.certificationHistory.compareCurrent(certification),
        errors,
        storedApproval,
        currentFingerprint,
        integrity,
      });
    };
    await this.scenes.setScene(new DiagnosticsScene(this.input, this.audio, {
      errors: () => this.errors.snapshot(),
      recovery: () => this.recoveryHistory.snapshot(),
      summary: releaseSummary,
      history: () => this.certificationHistory.snapshot(),
      comparison: () => { const certification = this.certification.snapshot(); this.certificationHistory.archive(certification, 'current'); return this.certificationHistory.compareCurrent(certification); },
      approval,
      integrity: () => this.releaseIntegrity.snapshot(),
      clearErrors: () => this.errors.clearCandidate(),
      exportRepro: () => {
        const payload = buildReproPackage({
          candidate: RELEASE_CANDIDATE, errors: this.errors.snapshot(), recovery: this.recoveryHistory.snapshot(), certification: this.certification.snapshot(), telemetry: this.telemetry.snapshot(), save: this.saves.health, currentRoute: this.recovery.activeRoute(),
          online: typeof navigator === 'undefined' ? true : navigator.onLine,
          standalone: typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true),
        });
        this.downloadJson(`side-scroll-chronicles-${RELEASE_CANDIDATE}-repro.json`, reproPackageJson(payload));
      },
      approveRelease: () => {
        const state = approval();
        if (state.verdict !== 'ready-for-approval' && state.verdict !== 'approved') return { ok: false, message: state.detail };
        if (state.verdict === 'approved') return { ok: true, message: 'RELEASE ALREADY APPROVED' };
        const certification = this.certification.snapshot();
        const integrity = this.releaseIntegrity.snapshot();
        const fingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification, errors: this.errors.snapshot(), integrity });
        this.releaseApproval.approve(certification.deviceLabel, fingerprint);
        this.recoveryHistory.record('release-approval', 'success', `APPROVED ${RELEASE_CANDIDATE} • ${certification.deviceLabel} • ${fingerprint}`);
        this.exportFinalProof();
        return { ok: true, message: `RELEASE SEALED • ${fingerprint} • FINAL PROOF EXPORTED` };
      },
      revokeApproval: () => { this.releaseApproval.revoke(); this.recoveryHistory.record('release-approval', 'check', `REVOKED ${RELEASE_CANDIDATE}`); },
      exportDiagnostics: () => {
        const certification = this.certification.snapshot();
        this.certificationHistory.archive(certification, 'current');
        const payload = {
          app: 'SIDE-SCROLL CHRONICLES', candidate: RELEASE_CANDIDATE, exportedAt: new Date().toISOString(),
          errors: this.errors.snapshot(), recovery: this.recoveryHistory.snapshot(), summary: releaseSummary(),
          deviceHistory: this.certificationHistory.snapshot(), comparison: this.certificationHistory.compareCurrent(certification), approval: approval(), integrity: this.releaseIntegrity.snapshot(),
        };
        this.downloadJson(`side-scroll-chronicles-${RELEASE_CANDIDATE}-diagnostics.json`, JSON.stringify(payload, null, 2));
      },
    }, () => { void this.showTitle(); }));
  }

  private async showPwaUpdate(): Promise<void> {
    await this.scenes.setScene(new PwaUpdateScene(this.input, this.audio, this.updates, () => { void this.showTitle(); }));
  }

  private async showReleaseCheck(): Promise<void> {
    this.syncAutomaticCertification();
    await this.scenes.setScene(new ReleaseCheckScene(this.input, this.audio, {
      saveReady: !!this.save,
      saveHealth: () => this.saves.health,
      appShellReady: this.assets.hasGroup('app-shell'),
      install: this.install,
      telemetry: () => this.telemetry.snapshot(),
      storageSeparated: String(SAVE_DB_NAME) !== String(GAME_CACHE_NAME),
      loadingRecoveryReady: true,
      serviceWorkerUpdateSafe: String(SAVE_DB_NAME) !== String(GAME_CACHE_NAME) && GAME_CACHE_NAME.startsWith('game-cache-'),
      portableSaveReady: true,
      updatePlan: simulatePreviousReleaseUpgrade(GAME_CACHE_NAME, SAVE_DB_NAME),
      verifyOffline: () => this.assets.verifyOfflineCampaign(),
      verifyTransitions: () => this.assets.verifyOfflineTransitions(),
      verifyNetworkCut: () => this.assets.verifyNetworkCutFallback(),
      prepareOffline: (onProgress) => this.assets.prepareOfflineCampaign(onProgress),
      deviceCertification: () => this.certification.snapshot(),
      errorJournal: () => this.errors.snapshot(),
      sessionRecoveryReady: true,
      updateAutoRecoveryReady: this.updates.autoRecoveryReady(),
      saveAcceptance: (matrix) => { this.certification.saveAcceptance(matrix); },
      releaseIntegrity: () => this.releaseIntegrity.snapshot(),
      verifyIntegrity: () => this.releaseIntegrity.verify(),
    }, () => { void this.showTitle(); }));
  }

  private async showOptions(): Promise<void> {
    if (!this.save) return;
    await this.scenes.setScene(new OptionsScene(
      this.input,
      this.audio,
      this.touch,
      this.save,
      (patch) => { void this.persist(patch); },
      () => { void this.showTitle(); },
    ));
  }


  private async showResults(): Promise<void> {
    if (!this.save?.stageResults.length) { await this.showTitle(); return; }
    await this.scenes.setScene(new ResultsScene(this.input, this.audio, this.save.stageResults, () => { void this.showTitle(); }));
  }

  private async showCharacterSelect(): Promise<void> {
    const current = this.save?.selectedCharacter ?? 'RYU';
    await this.scenes.setScene(new CharacterSelectScene(this.input, this.audio, current, (character) => {
      void this.persist({ selectedCharacter: character.id }).then(() => this.showSuperArtSelect(character));
    }));
  }

  private async showSuperArtSelect(character: CharacterDef): Promise<void> {
    const initial = this.save?.selectedSuperArt ?? 1;
    await this.scenes.setScene(new SuperArtSelectScene(
      this.input,
      this.audio,
      character,
      initial,
      (art) => { void this.startStage(character, art); },
      () => { void this.showCharacterSelect(); },
    ));
  }

  private async startStage(character: CharacterDef, art: SuperArtDef, resetProgress = true, replay = false): Promise<void> {
    if (!replay) {
      await this.persist({ selectedCharacter: character.id, selectedSuperArt: art.id, currentStage: 1, hasCampaignStarted: true, ...(resetProgress ? { completedStages: [], stageResults: [] } : {}) });
      this.recovery.checkpoint('stage-1', 1, character.id, art.id);
    }
    const module = await this.loadStageModule('stage-1', () => import('../scenes/Stage1Scene.js'));
    if (!module) { await this.showTitle(); return; }
    const { Stage1Scene } = module;
    await this.scenes.setScene(new Stage1Scene(this.input, this.audio, character, art, 1, (result) => {
      void this.recordStageResult(result).then(() => replay ? this.showStageSelect() : this.startStage2(character, art));
    }, () => { void this.startStage(character, art, false, replay); }));
    if (!replay) this.assets.prefetchGroup('stage-2');
  }


  private async startStage2(character: CharacterDef, art: SuperArtDef, replay = false): Promise<void> {
    if (!replay) {
      const completed = Array.from(new Set([...(this.save?.completedStages ?? []), 1]));
      await this.persist({ selectedCharacter: character.id, selectedSuperArt: art.id, currentStage: 2, completedStages: completed, hasCampaignStarted: true });
      this.recovery.checkpoint('stage-2', 2, character.id, art.id);
    }
    const module = await this.loadStageModule('stage-2', () => import('../scenes/Stage2Scene.js'));
    if (!module) { await this.showTitle(); return; }
    const { Stage2Scene } = module;
    await this.scenes.setScene(new Stage2Scene(this.input, this.audio, character, art, (result) => {
      void this.recordStageResult(result).then(() => replay ? this.showStageSelect() : this.startStage3(character, art));
    }, () => { void this.startStage2(character, art, replay); }));
    if (!replay) this.assets.prefetchGroup('stage-3');
  }

  private async startStage3(character: CharacterDef, art: SuperArtDef, replay = false): Promise<void> {
    if (!replay) {
      const completed = Array.from(new Set([...(this.save?.completedStages ?? []), 1, 2]));
      await this.persist({ selectedCharacter: character.id, selectedSuperArt: art.id, currentStage: 3, completedStages: completed, hasCampaignStarted: true });
      this.recovery.checkpoint('stage-3', 3, character.id, art.id);
    }
    const module = await this.loadStageModule('stage-3', () => import('../scenes/Stage3Scene.js'));
    if (!module) { await this.showTitle(); return; }
    const { Stage3Scene } = module;
    await this.scenes.setScene(new Stage3Scene(this.input, this.audio, character, art, (result) => {
      void this.recordStageResult(result).then(() => replay ? this.showStageSelect() : this.startStage4(character, art));
    }, () => { void this.startStage3(character, art, replay); }));
    if (!replay) this.assets.prefetchGroup('stage-4');
  }

  private async startStage4(character: CharacterDef, art: SuperArtDef, replay = false): Promise<void> {
    if (!replay) {
      const completed = Array.from(new Set([...(this.save?.completedStages ?? []), 1, 2, 3]));
      await this.persist({ selectedCharacter: character.id, selectedSuperArt: art.id, currentStage: 4, completedStages: completed, hasCampaignStarted: true });
      this.recovery.checkpoint('stage-4', 4, character.id, art.id);
    }
    const module = await this.loadStageModule('stage-4', () => import('../scenes/Stage4Scene.js'));
    if (!module) { await this.showTitle(); return; }
    const { Stage4Scene } = module;
    await this.scenes.setScene(new Stage4Scene(this.input, this.audio, character, art, (result) => {
      void this.recordStageResult(result).then(() => replay ? this.showStageSelect() : this.startStage5(character, art));
    }, () => { void this.startStage4(character, art, replay); }));
    if (!replay) this.assets.prefetchGroup('stage-5');
  }

  private async startStage5(character: CharacterDef, art: SuperArtDef, replay = false): Promise<void> {
    if (!replay) {
      const completed = Array.from(new Set([...(this.save?.completedStages ?? []), 1, 2, 3, 4]));
      await this.persist({ selectedCharacter: character.id, selectedSuperArt: art.id, currentStage: 5, completedStages: completed, hasCampaignStarted: true });
      this.recovery.checkpoint('stage-5', 5, character.id, art.id);
    }
    const module = await this.loadStageModule('stage-5', () => import('../scenes/Stage5Scene.js'));
    if (!module) { await this.showTitle(); return; }
    const { Stage5Scene } = module;
    await this.scenes.setScene(new Stage5Scene(this.input, this.audio, character, art, (result) => {
      void this.recordStageResult(result).then(() => replay ? this.showStageSelect() : this.showEnding(character, art));
    }, () => { void this.startStage5(character, art, replay); }));
    if (!replay) this.assets.prefetchGroup('ending');
  }

  private async showEnding(character: CharacterDef, art: SuperArtDef): Promise<void> {
    const completed = Array.from(new Set([...(this.save?.completedStages ?? []), 1, 2, 3, 4, 5]));
    await this.persist({ currentStage: 5, completedStages: completed, hasCampaignStarted: false, stageSelectUnlocked: true });
    this.recovery.checkpoint('ending', 5, character.id, art.id);
    const module = await this.loadStageModule('ending', () => import('../scenes/EndingScene.js'));
    if (!module) { await this.showTitle(); return; }
    const { EndingScene } = module;
    await this.scenes.setScene(new EndingScene(this.input, this.audio, character, art, this.save?.stageResults ?? [], () => { void this.showTitle(); }));
  }
  private savedFighter(): { character: CharacterDef; art: SuperArtDef } {
    const character = getCharacter(this.save?.selectedCharacter ?? 'RYU');
    const artId = this.save?.selectedSuperArt ?? 1;
    const art = character.superArts.find((candidate) => candidate.id === artId) ?? character.superArts[0];
    return { character, art };
  }

  private async continueCampaign(): Promise<void> {
    const { character, art } = this.savedFighter();
    await this.startStageNumber(Math.max(1, Math.min(5, this.save?.currentStage ?? 1)) as 1 | 2 | 3 | 4 | 5, character, art, false);
  }

  private async recoverInterruptedSession(): Promise<void> {
    const checkpoint = this.recovery.consumeRecovery();
    if (!checkpoint) { await this.showTitle(); return; }
    const character = getCharacter(checkpoint.character ?? this.save?.selectedCharacter ?? 'RYU');
    const artId = checkpoint.superArt ?? this.save?.selectedSuperArt ?? 1;
    const art = character.superArts.find((candidate) => candidate.id === artId) ?? character.superArts[0];
    this.recoveryHistory.record('session-recovery', 'success', checkpoint.route === 'ending' ? 'RESUME ENDING' : `RESTART STAGE ${checkpoint.stage ?? 1}`);
    if (checkpoint.route === 'ending') { await this.showEnding(character, art); return; }
    await this.startStageNumber(checkpoint.stage ?? 1, character, art, false);
  }


  private exportFinalProof(): void {
    const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const bundle = buildFinalProofBundle({
      candidate: RELEASE_CANDIDATE,
      certification: this.certification.snapshot(),
      telemetry: this.telemetry.snapshot(),
      errors: this.errors.snapshot(),
      recovery: this.recoveryHistory.snapshot(),
      safeArea: measureSafeArea(this.canvas),
      environment: {
        online: typeof navigator === 'undefined' ? true : navigator.onLine,
        standalone,
        serviceWorkerControlled: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
        userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
        viewport: typeof window === 'undefined' ? 'unknown' : `${window.innerWidth}x${window.innerHeight}`,
      },
      approval: this.releaseApproval.snapshot(),
      integrity: this.releaseIntegrity.snapshot(),
    });
    const filename = bundle.sealed
      ? `side-scroll-chronicles-${RELEASE_CANDIDATE}-sealed-final-proof.json`
      : `side-scroll-chronicles-${RELEASE_CANDIDATE}-final-proof.json`;
    this.downloadJson(filename, finalProofBundleJson(bundle));
  }

  private pickJsonText(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json,.json'; input.style.display = 'none';
      let settled = false;
      const finish = (value: string | null) => { if (settled) return; settled = true; input.remove(); resolve(value); };
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { finish(null); return; }
        try { finish(await file.text()); } catch { finish(null); }
      };
      document.body.appendChild(input); input.click();
      window.setTimeout(() => { if (!input.files?.length) finish(null); }, 30000);
    });
  }

  private downloadJson(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  private async showStageSelect(): Promise<void> {
    if (!this.save?.stageSelectUnlocked) { await this.showTitle(); return; }
    await this.scenes.setScene(new StageSelectScene(
      this.input,
      this.audio,
      this.save.currentStage,
      (stage) => { const { character, art } = this.savedFighter(); void this.startStageNumber(stage, character, art, false, true); },
      () => { void this.showTitle(); },
    ));
  }

  private async startStageNumber(stage: 1 | 2 | 3 | 4 | 5, character: CharacterDef, art: SuperArtDef, resetProgress = false, replay = false): Promise<void> {
    if (stage === 1) { await this.startStage(character, art, resetProgress, replay); return; }
    if (stage === 2) { await this.startStage2(character, art, replay); return; }
    if (stage === 3) { await this.startStage3(character, art, replay); return; }
    if (stage === 4) { await this.startStage4(character, art, replay); return; }
    await this.startStage5(character, art, replay);
  }


  private async loadStageModule<T>(group: 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'ending', importer: () => Promise<T>): Promise<T | null> {
    const loading = loadingProfile(group);
    const label = loading.title;
    while (true) {
      this.showLoading(label, 0);
      try {
        await this.assets.loadGroup(group, (done, total) => this.showLoading(label, total > 0 ? done / total : 1));
        const module = await importer();
        this.showLoading('READY', 1);
        window.setTimeout(() => this.hideLoading(), 80);
        return module;
      } catch (error) {
        this.errors.record('load', error, 'warning', { source: group });
        this.assets.invalidateGroup(group);
        const action = await this.showLoadFailure(error);
        if (action === 'back') { this.hideLoading(); return null; }
      }
    }
  }

  private showLoadFailure(error: unknown): Promise<'retry' | 'back'> {
    this.loadingOverlay.classList.remove('hidden');
    this.loadingOverlay.classList.add('failed');
    const strong = this.loadingOverlay.querySelector<HTMLElement>('strong');
    const text = this.loadingOverlay.querySelector<HTMLElement>('span');
    const detail = this.loadingOverlay.querySelector<HTMLElement>('em');
    const bar = this.loadingOverlay.querySelector<HTMLElement>('.loading-track i');
    if (strong) strong.textContent = 'LOAD FAILED';
    if (text) text.textContent = navigator.onLine ? 'STAGE DATA COULD NOT BE LOADED' : 'OFFLINE DATA IS NOT READY';
    if (detail) detail.textContent = (error instanceof Error ? error.message : String(error)).slice(0, 150);
    if (bar) bar.style.width = '100%';
    return new Promise((resolve) => {
      const retry = this.loadingOverlay.querySelector<HTMLButtonElement>('[data-action="retry"]');
      const back = this.loadingOverlay.querySelector<HTMLButtonElement>('[data-action="back"]');
      if (retry) retry.onclick = () => { this.recoveryHistory.record('load-recovery', 'success', `RETRY • ${error instanceof Error ? error.message : String(error)}`); this.loadingOverlay.classList.remove('failed'); resolve('retry'); };
      if (back) back.onclick = () => { this.recoveryHistory.record('load-recovery', 'check', `BACK TO TITLE • ${error instanceof Error ? error.message : String(error)}`); resolve('back'); };
    });
  }

  private showLoading(label: string, progress: number): void {
    this.loadingOverlay.classList.remove('hidden', 'failed');
    const text = this.loadingOverlay.querySelector<HTMLElement>('span');
    const strong = this.loadingOverlay.querySelector<HTMLElement>('strong');
    const detail = this.loadingOverlay.querySelector<HTMLElement>('em');
    const bar = this.loadingOverlay.querySelector<HTMLElement>('.loading-track i');
    const kicker = this.loadingOverlay.querySelector<HTMLElement>('.loading-kicker');
    const loadDetail = this.loadingOverlay.querySelector<HTMLElement>('.loading-detail');
    const loadRoute = this.loadingOverlay.querySelector<HTMLElement>('.loading-route');
    const profile = (['stage-1','stage-2','stage-3','stage-4','stage-5','ending'] as const).map((group) => loadingProfile(group)).find((item) => item.title === label);
    if (strong) strong.textContent = progress >= 1 ? 'READY' : 'LOADING';
    if (detail) detail.textContent = '';
    if (text) text.textContent = label;
    if (kicker) kicker.textContent = profile?.kicker ?? 'SYSTEM';
    if (loadDetail) loadDetail.textContent = profile?.detail ?? 'PREPARING GAME DATA';
    if (loadRoute) loadRoute.textContent = profile?.route ?? 'SYSTEM → READY';
    if (bar) { bar.style.width = `${Math.max(4, Math.min(100, progress * 100))}%`; if (profile) bar.style.background = `linear-gradient(90deg, ${profile.accent}, #fff0a6)`; }
  }

  private hideLoading(): void { this.loadingOverlay.classList.add('hidden'); this.loadingOverlay.classList.remove('failed'); }

  private async recordStageResult(result: StageResult): Promise<void> {
    const existing = this.save?.stageResults ?? [];
    const stageResults = [...existing.filter((record) => record.stageId !== result.stageId), result].sort((a, b) => a.stageId - b.stageId);
    await this.persist({ stageResults });
  }

  private async persist(patch: Partial<GameSave>): Promise<void> {
    this.save = await this.saves.write(patch);
  }

  private render(alpha: number, frameDt: number): void {
    this.telemetry.sampleFrame(frameDt);
    if (runtimeQuality.sampleFrame(frameDt)) { this.telemetry.noteQualityChange(); this.resize(); }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const renderScale = this.dpr * this.viewScale;
    this.ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    this.scenes.render({
      ctx: this.ctx,
      width: this.logicalWidth,
      height: this.logicalHeight,
      dpr: this.dpr,
    }, alpha, frameDt);
  }

  private resize = (): void => {
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const safeInsets = readSafeAreaInsets();
    const safeViewport = safeViewportSize(viewportWidth, viewportHeight, safeInsets);
    this.cssWidth = safeViewport.width;
    this.cssHeight = safeViewport.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, runtimeQuality.current.dprCap);

    const aspect = this.cssWidth / this.cssHeight;
    this.logicalHeight = 720;
    this.logicalWidth = Math.max(1280, Math.round(this.logicalHeight * aspect));
    this.viewScale = this.cssHeight / this.logicalHeight;

    this.canvas.width = Math.round(this.cssWidth * this.dpr);
    this.canvas.height = Math.round(this.cssHeight * this.dpr);
    this.canvas.style.left = `${safeInsets.left}px`;
    this.canvas.style.top = `${safeInsets.top}px`;
    this.canvas.style.right = 'auto';
    this.canvas.style.bottom = 'auto';
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;

    this.scenes.resize(this.logicalWidth, this.logicalHeight);
  };


  private onPageHide = (): void => { this.touch.releaseAll(); this.audio.setBackgrounded(true); };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.backgroundedAt = Date.now();
      this.touch.releaseAll();
      this.audio.setBackgrounded(true);
      this.loop?.stop();
      return;
    }
    this.touch.releaseAll();
    this.audio.setBackgrounded(false);
    this.loop?.start();
    if (this.backgroundedAt != null) {
      const before = this.certification.snapshot();
      const record = this.certification.recordBackgroundResume(Date.now() - this.backgroundedAt);
      this.backgroundedAt = null;
      if (record.updatedAt !== before.updatedAt) {
        this.certificationHistory.archive(record, 'current');
        this.releaseApproval.revoke();
      }
    }
    this.syncAutomaticCertification();
  };

  private installDebugOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'debug-overlay';
    document.body.appendChild(overlay);
    let last = performance.now();
    let frames = 0;
    let fps = 0;
    const update = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 500) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
        overlay.textContent = `FPS ${fps}  |  COMBAT TICK ${this.loop?.combatTick ?? 0}  |  QUALITY ${runtimeQuality.currentTier.toUpperCase()}  |  DPR ${this.dpr.toFixed(1)}  |  SAVE ${this.save ? 'OK' : '—'}  |  SHELL ${this.assets.hasGroup('app-shell') ? 'READY' : 'LOADING'}`;
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
