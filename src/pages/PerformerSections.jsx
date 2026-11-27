import { useOutletContext } from 'react-router-dom'
import OrdersPanel from './performer/OrdersPanel'
import PortfolioPanel from './performer/PortfolioPanel'
import RequestsPanel from './performer/RequestsPanel'
import ReviewsPanel from './performer/ReviewsPanel'
import SchedulePanel from './performer/SchedulePanel'
import ServicesPanel from './performer/ServicesPanel'
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
