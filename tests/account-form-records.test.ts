import { test, expect } from 'bun:test'
import { accountFormRecords, type AccountFormRecord } from '../src/lib/account-form-records'

const workbook: AccountFormRecord = {
  id: 'saved-workbook', user_id: 'client', trust_type: 'vip_protection_workbook',
  status: 'completed', created_at: '2026-10-29T16:13:00Z', form_data: { family_name: 'Collins' },
}

test('completed Family Protection Workbooks appear in the client account forms with their answers', () => {
  const records = accountFormRecords([workbook], 'client')
  expect(records.workbooks).toEqual([workbook])
  expect(records.workbooks[0].form_data).toEqual({ family_name: 'Collins' })
})

test('another client workbook is never included in a client account record', () => {
  expect(accountFormRecords([workbook], 'another-client').workbooks).toEqual([])
})

test('unfinished workbooks are not reported as completed submissions', () => {
  expect(accountFormRecords([{ ...workbook, status: 'draft' }], 'client').workbooks).toEqual([])
})

test('existing trust forms and protection plans remain available without duplicating the workbook', () => {
  const plan = { ...workbook, id: 'plan', trust_type: 'family_protection_plan' }
  const records = accountFormRecords([plan, workbook], 'client')
  expect(records.trustForms).toEqual([plan])
  expect(records.workbooks).toEqual([workbook])
})