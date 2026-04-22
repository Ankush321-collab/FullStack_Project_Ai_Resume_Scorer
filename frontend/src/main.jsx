import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null
    , React.createElement(App, null )
    , React.createElement(ToastContainer, {
      position: "top-right",
      autoClose: 3200,
      hideProgressBar: false,
      newestOnTop: true,
      closeOnClick: true,
      pauseOnHover: true,
      theme: "dark",
      toastClassName: "!bg-[#140c0c] !text-red-100 !border !border-red-500/40"   ,
      progressClassName: "!bg-red-500",}
    )
  ),
)
