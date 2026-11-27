import { useOutletContext } from 'react-router-dom'
import OrdersPanel from './OrdersPanel'
import PortfolioPanel from './PortfolioPanel'
import RequestsPanel from './RequestsPanel'
import ReviewsPanel from './ReviewsPanel'
import SchedulePanel from './SchedulePanel'
import ServicesPanel from './ServicesPanel'
import './PerformerPages.css'

export function PerformerServicesPage() {
  return <div className="pf-section"><ServicesPanel /></div>
}

export function PerformerOrdersPage() {
  const { reloadStats } = useOutletContext()
  return <div className="pf-section"><OrdersPanel onChanged={reloadStats} /></div>
}

export function PerformerRequestsPage() {
  return <div className="pf-section"><RequestsPanel /></div>
}

export function PerformerSchedulePage() {
  return <div className="pf-section"><SchedulePanel /></div>
}

export function PerformerReviewsPage() {
  return <div className="pf-section"><ReviewsPanel /></div>
}

export function PerformerPortfolioPage() {
  return <div className="pf-section"><PortfolioPanel /></div>
}
