import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from "./router/index.tsx";
import store from '@/store'      
import "./index.scss";      

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
root.render(
  <Provider store={store}>
    <BrowserRouter>
    <AppRouter />
    </BrowserRouter>
    
  </Provider>
)