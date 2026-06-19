import { useAuthInit } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/shared/loading-screen';
import AppRoutes from '@/routes';

function App() {
  const { isLoading } = useAuthInit();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AppRoutes />;
}

export default App;
