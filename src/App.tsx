import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Notes from './pages/Notes'
import Tasks from './pages/Tasks'
import Habits from './pages/Habits'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="notes" element={<Notes />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="habits" element={<Habits />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
