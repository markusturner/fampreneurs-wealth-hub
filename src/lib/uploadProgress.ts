// Lightweight global store for background upload progress shown in the notification bell.
export type UploadJob = {
  id: string
  name: string
  percent: number
  status: 'uploading' | 'processing' | 'done' | 'error'
  startedAt: number
  sizeBytes?: number
  loadedBytes?: number
  speedBps?: number
  etaSeconds?: number | null
  message?: string
}

let jobs: UploadJob[] = []
const listeners = new Set<(jobs: UploadJob[]) => void>()

const emit = () => listeners.forEach(l => l([...jobs]))

export const uploadProgressStore = {
  getJobs: () => [...jobs],
  subscribe(listener: (jobs: UploadJob[]) => void) {
    listeners.add(listener)
    listener([...jobs])
    return () => { listeners.delete(listener) }
  },
  start(name: string, sizeBytes?: number): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    jobs = [...jobs, { id, name, percent: 0, status: 'uploading', startedAt: Date.now(), sizeBytes, etaSeconds: null }]
    emit()
    return id
  },
  update(id: string, percent: number, details: Partial<Pick<UploadJob, 'loadedBytes' | 'speedBps' | 'etaSeconds' | 'message' | 'status'>> = {}) {
    jobs = jobs.map(j => j.id === id ? { ...j, percent, ...details } : j)
    emit()
  },
  finish(id: string, status: 'done' | 'error', message?: string) {
    jobs = jobs.map(j => j.id === id ? { ...j, status, message, etaSeconds: null, percent: status === 'done' ? 100 : j.percent } : j)
    emit()
    // auto-clear completed jobs after a delay
    setTimeout(() => {
      jobs = jobs.filter(j => j.id !== id)
      emit()
    }, status === 'done' ? 4000 : 6000)
  },
  remove(id: string) {
    jobs = jobs.filter(j => j.id !== id)
    emit()
  },
}
