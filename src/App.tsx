import { Navigate, Route, Routes, useLocation } from 'react-router'
import { SideNav } from './components/SideNav'
import { routes } from './data/story'
import { PresenterBar } from './presenter/PresenterBar'
import { useDemo } from './presenter/useStep'
import { BuyerView } from './views/BuyerView'
import { Closing } from './views/Closing'
import { Insights } from './views/Insights'
import { Policies } from './views/Policies'
import { SellerView } from './views/SellerView'
import { Setup } from './views/Setup'
import { Title } from './views/Title'

export default function App() {
  const { resetKey } = useDemo()
  const { pathname } = useLocation()
  // Title and closing are full-bleed slides; every other screen shows the left nav.
  const slide = pathname === routes.title || pathname === routes.closing

  return (
    <div
      className={`grid h-full grid-rows-[minmax(0,1fr)_auto] ${
        slide ? 'grid-cols-1' : 'grid-cols-[13.5rem_minmax(0,1fr)]'
      }`}
    >
      {!slide && <SideNav />}
      <main key={resetKey} className="min-h-0 min-w-0 overflow-hidden">
        <Routes>
          <Route path={routes.title} element={<Title />} />
          <Route path={routes.buyer} element={<BuyerView />} />
          <Route path={routes.seller} element={<SellerView />} />
          {/* Older links used /seller. */}
          <Route path="/seller" element={<Navigate to={routes.seller} replace />} />
          <Route path={routes.insights} element={<Insights />} />
          <Route path={routes.policies} element={<Policies />} />
          <Route path={routes.setup} element={<Setup />} />
          <Route path={routes.closing} element={<Closing />} />
          <Route path="*" element={<Navigate to={routes.title} replace />} />
        </Routes>
      </main>
      <PresenterBar />
    </div>
  )
}
