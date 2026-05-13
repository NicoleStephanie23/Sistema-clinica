import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Pacientes    from './pages/Pacientes';
import Medicamentos from './pages/Medicamentos';
import NuevaConsulta from './pages/NuevaConsulta';
import Recetas      from './pages/Recetas';
import Reportes     from './pages/Reportes';
import Layout       from './components/Layout';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.perfil)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/dashboard" element={
            <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
          }/>

          <Route path="/pacientes" element={
            <PrivateRoute roles={['medico','administrador']}>
              <Layout><Pacientes /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/consulta" element={
            <PrivateRoute roles={['medico']}>
              <Layout><NuevaConsulta /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/historias" element={
            <PrivateRoute roles={['medico','administrador']}>
              <Layout><Pacientes /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/medicamentos" element={
            <PrivateRoute><Layout><Medicamentos /></Layout></PrivateRoute>
          }/>

          <Route path="/recetas" element={
            <PrivateRoute roles={['farmaceutico','administrador']}>
              <Layout><Recetas /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/movimientos" element={
            <PrivateRoute roles={['farmaceutico','administrador']}>
              <Layout><Medicamentos /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/stock-bajo" element={
            <PrivateRoute roles={['farmaceutico','administrador']}>
              <Layout><Medicamentos /></Layout>
            </PrivateRoute>
          }/>

          <Route path="/reportes" element={
            <PrivateRoute roles={['administrador','medico']}>
              <Layout><Reportes /></Layout>
            </PrivateRoute>
          }/>

          <Route path="*" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
