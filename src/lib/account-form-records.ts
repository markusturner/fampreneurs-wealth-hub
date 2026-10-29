export interface AccountFormRecord {
  id: string
  user_id: string
  trust_type: string
  status?: string | null
  submitted_at?: string | null
  created_at: string
  submitter_name?: string | null
  form_data?: unknown
}

export function accountFormRecords(forms: AccountFormRecord[], userId: string) {
  const ownForms = forms.filter(form => form.user_id === userId)
  return {
    workbooks: ownForms.filter(form => form.trust_type === 'vip_protection_workbook' && form.status === 'completed'),
    trustForms: ownForms.filter(form => form.trust_type !== 'vip_protection_workbook'),
  }
}