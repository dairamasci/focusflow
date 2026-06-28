import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import InboxView from '@/views/InboxView'
import BoardView from '@/views/BoardView'
import FocusView from '@/views/FocusView'
import SummaryView from '@/views/SummaryView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inbox" replace />} />
      <Route element={<Layout />}>
        <Route path="/inbox" element={<InboxView />} />
        <Route path="/board" element={<BoardView />} />
        <Route path="/focus" element={<FocusView />} />
        <Route path="/summary" element={<SummaryView />} />
      </Route>
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}
