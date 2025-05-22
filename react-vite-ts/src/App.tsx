import { MantineProvider } from '@mantine/core';
import AppRouter from './router';
import './index.scss';

function App() {
  return (
    <MantineProvider>
      <AppRouter />
    </MantineProvider>
  );
}

export default App;
