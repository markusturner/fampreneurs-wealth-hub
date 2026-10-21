import { test, expect } from 'bun:test'
import { welcomeSections, documentsToBring, buildStructure } from '../src/lib/workbook'

test('admins and owners see 4 welcome buttons', () => {
  expect(welcomeSections(true, null)).toEqual(['community', 'content', 'dashboard', 'workbook'])
})
test('VIP Weekend clients see only DFO and workbook', () => {
  expect(welcomeSections(false, 'The Private Estate Accelerator (VIP Weekend)')).toEqual(['dashboard', 'workbook'])
})
test('other clients do not see the workbook', () => {
  expect(welcomeSections(false, 'The Trust Vault (TTV)')).not.toContain('workbook')
})
test('owning a home asks for the deed', () => {
  const docs = documentsToBring({ owns_home: 'yes', assets: [] }).flatMap(g => g.items)
  expect(docs).toContain('Recorded deed for each property')
})
test('no home means no deed', () => {
  const docs = documentsToBring({ owns_home: 'no', assets: [] }).flatMap(g => g.items)
  expect(docs).not.toContain('Recorded deed for each property')
})
test('gold asks for purchase receipts', () => {
  const docs = documentsToBring({ assets: [], commodities: ['Gold'] }).flatMap(g => g.items)
  expect(docs).toContain('Purchase receipts or certificates for metals')
})
test('revocable trust asks for signed copy', () => {
  const docs = documentsToBring({ assets: [], has_revocable: 'yes' }).flatMap(g => g.items)
  expect(docs).toContain('Full signed copy of the revocable trust')
})
test('offshore trust only shows with foreign assets', () => {
  expect(buildStructure({ assets: [], foreign_assets: 'no' })[0].key).toBe('family')
  expect(buildStructure({ assets: [], foreign_assets: 'yes' })[0].key).toBe('offshore')
})
