import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('No root element')

createRoot(root).render(
    <StrictMode>
        <html lang="ja">
            <head>
                <title>Brace</title>
            </head>
            <body>
                <App />
            </body>
        </html>
    </StrictMode>,
)
