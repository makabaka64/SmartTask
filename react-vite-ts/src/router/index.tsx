import { lazy, Suspense } from "react";
import { 
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Loading from "@/components/Loading";
import { Outlet } from "react-router-dom";

// 懒加载页面组件
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const Report = lazy(() => import("@/pages/Report"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"))
const Layout = lazy(() => import("@/pages/Layout"));


// 私有路由守卫组件
const RequireAuth = () => {
  const isAuthenticated = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
const AppRouter = () => {
  return (
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* 公共路由 */}
        <Route path="/login" element={<Login />} />

          {/* 私有路由 */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="task/:id" element={<TaskDetail />} />
            <Route path="report" element={<Report />} />
            {/* <Route path="profile" element={<Profile />} /> */}
          </Route>
          <Route path="profile" element={<Profile />} />
        </Route>


          {/* 404 页面 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
   
  );
};

export default AppRouter;