import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
// import './index.css'
import App from './App.tsx'
// import BarChart from './frontend/components/BarChart'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {/* <BarChart data={[
      {name: "Park 1", acres: 37.57},
      {name: "Park 2", acres: 47.57},
      {name: "Park 3", acres: 57.57},
    ]} /> */}
    
  </StrictMode>,
)
