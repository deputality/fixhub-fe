import { useOutletContext } from 'react-router-dom'
import OrdersPanel from './performer/OrdersPanel'
import PortfolioPanel from './performer/PortfolioPanel'
import ReviewsPanel from './performer/ReviewsPanel'
import ServicesPanel from './performer/ServicesPanel'
import './PerformerPages.css'

export function PerformerServicesPage() {
  return <div className="pf-section"><ServicesPanel /></div>
}

export function PerformerOrdersPage() {
  const { reloadStats } = useOutletContext()
  return <div className="pf-section"><OrdersPanel onChanged={reloadStats} /></div>
}

export function PerformerReviewsPage() {
  return <div className="pf-section"><ReviewsPanel /></div>
}

export function PerformerPortfolioPage() {
  return <div className="pf-section"><PortfolioPanel /></div>
}
