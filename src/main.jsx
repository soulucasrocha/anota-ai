import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import App from './App'
import AdminApp from './admin/AdminApp'
import DriverApp from './driver/DriverApp'
import './App.css'

function DriverRoute() {
  const [params] = useSearchParams();
  const storeId  = params.get('loja') || '';
  return <DriverApp storeId={storeId} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*"   element={<AdminApp />} />
        <Route path="/login"     element={<AdminApp />} />
        <Route path="/motorista" element={<DriverRoute />} />
        <Route path="/:slug"     element={<App />} />
        <Route path="/"          element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
