import type { MonsterDefinition } from './types'
import { AttackStyle, MonsterType, Prayer } from './types'

/**
 * Combat definitions for the five main Inferno wave monsters.
 *
 * Values validated against the OSRS Wiki (Jal-MejRah, Jal-Ak, Jal-ImKot,
 * Jal-Xil, Jal-Zek pages and Inferno/Strategies) and cross-checked against
 * the open-source InfernoTrainer simulator. Nibblers, Jad and Zuk are out of
 * scope for this tool.
 */
export const MONSTERS: Record<MonsterType, MonsterDefinition> = {
  [MonsterType.Bat]: {
    type: MonsterType.Bat,
    name: 'Jal-MejRah',
    size: 2,
    attackRange: 4,
    attackSpeed: 3,
    style: AttackStyle.Ranged,
    maxHit: 19,
  },
  [MonsterType.Blob]: {
    type: MonsterType.Blob,
    name: 'Jal-Ak',
    size: 3,
    attackRange: 15,
    // Effective cycle: 3-tick prayer scan + 3-tick delay before the attack.
    attackSpeed: 6,
    // The blob attacks with whichever of ranged/magic the player is NOT
    // protecting against on the scan tick (see blobAttackStyle below).
    style: AttackStyle.Ranged,
    maxHit: 29,
  },
  [MonsterType.Meleer]: {
    type: MonsterType.Meleer,
    name: 'Jal-ImKot',
    size: 4,
    attackRange: 1,
    attackSpeed: 4,
    style: AttackStyle.Melee,
    maxHit: 49,
  },
  [MonsterType.Ranger]: {
    type: MonsterType.Ranger,
    name: 'Jal-Xil',
    size: 3,
    attackRange: 15,
    attackSpeed: 4,
    style: AttackStyle.Ranged,
    maxHit: 46,
  },
  [MonsterType.Mager]: {
    type: MonsterType.Mager,
    name: 'Jal-Zek',
    size: 4,
    attackRange: 15,
    attackSpeed: 4,
    style: AttackStyle.Magic,
    maxHit: 70,
  },
}

/** The protection prayer that blocks a monster's ranged attack. */
export const COUNTER_PRAYER: Record<MonsterType, Prayer> = {
  [MonsterType.Bat]: Prayer.ProtectRanged,
  [MonsterType.Blob]: Prayer.ProtectMagic, // pray magic on the scan, then swap
  [MonsterType.Meleer]: Prayer.ProtectMelee,
  [MonsterType.Ranger]: Prayer.ProtectRanged,
  [MonsterType.Mager]: Prayer.ProtectMagic,
}

/**
 * Blob (Jal-Ak) prayer-read mechanic.
 *
 * The blob reads the player's overhead prayer on its "scan" tick, exactly
 * 3 ticks before it attacks, and then attacks with the style the player was
 * NOT protecting against:
 * - praying Protect from Magic on the scan  -> blob attacks with Ranged
 * - praying Protect from Missiles on the scan -> blob attacks with Magic
 * - praying melee/nothing -> blob picks ranged or magic at random
 *
 * The standard counter is therefore: pray the style you want to be attacked
 * with the OPPOSITE of on the scan tick, then swap to the correct protection
 * before the attack lands 3 ticks later.
 */
export function blobAttackStyle(
  prayerOnScanTick: Prayer,
  random: () => number = Math.random,
): AttackStyle {
  if (prayerOnScanTick === Prayer.ProtectMagic) return AttackStyle.Ranged
  if (prayerOnScanTick === Prayer.ProtectRanged) return AttackStyle.Magic
  return random() < 0.5 ? AttackStyle.Magic : AttackStyle.Ranged
}

/** Number of ticks between the blob's prayer scan and its attack landing. */
export const BLOB_SCAN_TO_ATTACK_TICKS = 3
