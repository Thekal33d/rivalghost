/** Readable, deterministic NPC spending policy. CR are non-cash demo credits. */
export const HOUND_POLICY={reserve:20,dailyAttackBudget:60,cooldownMs:120000,entry:10,openingStake:20,defense:20} as const;
export function houndDecision(input:{balance:number;spentToday:number;now:number;lastAttack:number;target:number;rehearsal:number;bounty:number;locked:boolean;open:boolean}){
  const margin=input.rehearsal-input.target;
  // Conservative heuristic, not a calibrated human win probability.
  const confidence=margin<=0?0.2:Math.min(.85,.55+margin/Math.max(1000,input.target)*.5);
  const expectedNet=Math.round((confidence*input.bounty-(1-confidence)*HOUND_POLICY.entry)*100)/100;
  const pass=(reason:string)=>({action:'pass' as const,reason,confidence,expectedNet});
  if(!input.open||input.bounty<20)return pass('The purse is closed. I will not pay to chase an empty Crown.');
  if(input.locked)return pass('Someone is flying. Their target stays locked.');
  if(input.balance-HOUND_POLICY.entry<HOUND_POLICY.reserve)return pass('I keep 20 CR in reserve. Pride does not pay the hangar bill.');
  if(input.spentToday+HOUND_POLICY.entry>HOUND_POLICY.dailyAttackBudget)return pass('My 60 CR attack budget is spent for this UTC day.');
  if(input.now-input.lastAttack<HOUND_POLICY.cooldownMs)return pass('Cooling down. I wait two minutes between paid attacks.');
  if(margin<=0)return pass('My best rehearsal cannot beat that ghost. You earned this one.');
  if(expectedNet<2)return pass('The bounty does not justify a 10 CR entry. I need a better offer.');
  return {action:'attack' as const,reason:`My rehearsal leads by ${margin} points. The ${input.bounty} CR bounty justifies a 10 CR entry.`,confidence,expectedNet};
}
