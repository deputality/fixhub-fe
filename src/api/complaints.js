import { api } from './client'

// body: { kind: 'Review' | 'Performer', targetId, reason, comment }
export const sendComplaint = (body) => api('/api/complaints', { method: 'POST', body })
