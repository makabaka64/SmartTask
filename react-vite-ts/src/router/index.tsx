import { lazy, Suspense } from "react";
import { 
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Loading from "@/components/Loading";

// 懒加载页面组件
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const Report = lazy(() => import("@/pages/Report"));
const Profile = lazy(() => import("@/pages/Profile"));

const AppRouter = () => {
  const isAuthenticated = useAuth();

  return (
   
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
            }
          />

          {/* 公共路由 */}
          <Route path="/login" element={<Login />} />

          {/* 私有路由 */}
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/task/:id" element={<TaskDetail />} />
              <Route path="/report" element={<Report />} />
              <Route path="/profile" element={<Profile />} />
            </>
          )}

          {/* 404 页面 */}
          <Route path="*" element={<div>页面不存在</div>} />
        </Routes>
      </Suspense>
   
  );
};

export default AppRouter;
