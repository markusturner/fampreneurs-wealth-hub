// Lightweight global store for background upload progress shown in the notification bell.
export type UploadJob = {
  id: string
  name: string
  percent: number
  status: 'uploading' | 'done' | 'error'
  startedAt: number
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
  start(name: string): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    jobs = [...jobs, { id, name, percent: 0, status: 'uploading', startedAt: Date.now() }]
    emit()
    return id
  },
  update(id: string, percent: number) {
    jobs = jobs.map(j => j.id === id ? { ...j, percent } : j)
    emit()
  },
  finish(id: string, status: 'done' | 'error') {
    jobs = jobs.map(j => j.id === id ? { ...j, status, percent: status === 'done' ? 100 : j.percent } : j)
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
