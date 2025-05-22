import { getToken } from "@/utils/token";

/**
 * 检查是否存在 token，返回是否已登录
 */
const useAuth = (): boolean => {
  return !!getToken();
};

export default useAuth;

