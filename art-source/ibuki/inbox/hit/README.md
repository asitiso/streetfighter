# Ibuki hit (8F)

Built-in imagegen produced four transparent full-body impact/recoil/recovery/guard poses using idle as reference. Order [4,1,2,2,dash1,3,4,4] reuses dash compression for counterlean recovery. Mixed-sheet idle endpoints failed master IoU (.495/.514); same-sheet guard endpoints pass (.647881). Original-root correction and zero staging anchors preserve scale. All quality thresholds unchanged. Seven base motions total 57 enabled frames, cache v089.

Real receiveHit regression was RED before promotion, then GREEN for both facings, counter, hit stop, recovery and restart. Ingestion covers hit rollback, incomplete source rejection and character isolation. Both browser facings reach 8/8 poses without render failures or console warnings/errors. Candidate/runtime hashes match. No manual stage playthrough claimed.

Generation brief: adult beige masked ninja matching reference; four full-body transparent poses: mild impact, backward-left recoil, balance recovery, open-hand guard. Consistent scale and complete hair/fingers/toes; no blood, attacker, text, effects or shadows. Source, candidate/runtime, preview and QA retained.
