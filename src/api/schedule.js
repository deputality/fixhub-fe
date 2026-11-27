import { api } from './client'

// расписание мастера: [{ dayOfWeek: 1..7 (1 = Пн), startTime: 'HH:mm', endTime: 'HH:mm' }]
export const getMySchedule = () => api('/api/performer/schedule')

// days: те же объекты; дней, которых нет в списке, считаем выходными
export const saveMySchedule = (days) =>
  api('/api/performer/schedule', { method: 'PUT', body: { days } })

// свободные слоты мастера на дату (YYYY-MM-DD): { date, hasSchedule, slots: [{ time: '09:00', isFree }] }
export const getSlots = (performerId, date) =>
  api(`/api/performers/${performerId}/slots?date=${encodeURIComponent(date)}`, { auth: false })
