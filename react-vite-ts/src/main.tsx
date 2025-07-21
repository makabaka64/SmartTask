import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from "./router/index.tsx";
import store, { persistor } from '@/store' 
import { PersistGate } from 'redux-persist/integration/react'    
import "./index.scss";      

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
    <BrowserRouter>
    <AppRouter />
    </BrowserRouter>
    </PersistGate>
  </Provider>
)