import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import Community from './pages/WorkspaceCommunity'
const root = document.getElementById('root')
if (root) createRoot(root).render(<BrowserRouter><Community /></BrowserRouter>)
