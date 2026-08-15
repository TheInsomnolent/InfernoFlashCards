import { describe, it, expect } from 'vitest'
import { MonsterType, AttackStyle, Prayer } from './types'
import { MONSTERS, COUNTER_PRAYER, blobAttackStyle, BLOB_SCAN_TO_ATTACK_TICKS } from './monsters'

describe('monster definitions (validated against the OSRS wiki)', () => {
  it('Jal-MejRah (bat): 2x2, ranged, 3-tick speed, 4-tile range', () => {
    const bat = MONSTERS[MonsterType.Bat]
    expect(bat.size).toBe(2)
    expect(bat.style).toBe(AttackStyle.Ranged)
    expect(bat.attackSpeed).toBe(3)
    expect(bat.attackRange).toBe(4)
  })

  it('Jal-Ak (blob): 3x3, 6-tick cycle, 15-tile range', () => {
    const blob = MONSTERS[MonsterType.Blob]
    expect(blob.size).toBe(3)
    expect(blob.attackSpeed).toBe(6)
    expect(blob.attackRange).toBe(15)
  })

  it('Jal-ImKot (meleer): 4x4, melee only, 4-tick speed, 1-tile reach', () => {
    const meleer = MONSTERS[MonsterType.Meleer]
    expect(meleer.size).toBe(4)
    expect(meleer.style).toBe(AttackStyle.Melee)
    expect(meleer.attackSpeed).toBe(4)
    expect(meleer.attackRange).toBe(1)
  })

  it('Jal-Xil (ranger): 3x3, ranged, 4-tick speed, 15-tile range', () => {
    const ranger = MONSTERS[MonsterType.Ranger]
    expect(ranger.size).toBe(3)
    expect(ranger.style).toBe(AttackStyle.Ranged)
    expect(ranger.attackSpeed).toBe(4)
    expect(ranger.attackRange).toBe(15)
  })

  it('Jal-Zek (mager): 4x4, magic, 4-tick speed, 15-tile range, hits up to 70', () => {
    const mager = MONSTERS[MonsterType.Mager]
    expect(mager.size).toBe(4)
    expect(mager.style).toBe(AttackStyle.Magic)
    expect(mager.attackSpeed).toBe(4)
    expect(mager.attackRange).toBe(15)
    expect(mager.maxHit).toBe(70)
  })

  it('maps each monster to its counter prayer', () => {
    expect(COUNTER_PRAYER[MonsterType.Bat]).toBe(Prayer.ProtectRanged)
    expect(COUNTER_PRAYER[MonsterType.Meleer]).toBe(Prayer.ProtectMelee)
    expect(COUNTER_PRAYER[MonsterType.Ranger]).toBe(Prayer.ProtectRanged)
    expect(COUNTER_PRAYER[MonsterType.Mager]).toBe(Prayer.ProtectMagic)
  })
})

describe('blob prayer-read mechanic', () => {
  it('reads the prayer 3 ticks before its attack lands', () => {
    expect(BLOB_SCAN_TO_ATTACK_TICKS).toBe(3)
  })

  it('attacks with ranged when the player prays magic on the scan tick', () => {
    expect(blobAttackStyle(Prayer.ProtectMagic)).toBe(AttackStyle.Ranged)
  })

  it('attacks with magic when the player prays ranged on the scan tick', () => {
    expect(blobAttackStyle(Prayer.ProtectRanged)).toBe(AttackStyle.Magic)
  })

  it('picks randomly between magic and ranged with melee/no prayer', () => {
    expect(blobAttackStyle(Prayer.None, () => 0.2)).toBe(AttackStyle.Magic)
    expect(blobAttackStyle(Prayer.None, () => 0.8)).toBe(AttackStyle.Ranged)
    expect(blobAttackStyle(Prayer.ProtectMelee, () => 0.2)).toBe(AttackStyle.Magic)
    expect(blobAttackStyle(Prayer.ProtectMelee, () => 0.8)).toBe(AttackStyle.Ranged)
  })
})
