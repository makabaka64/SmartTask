import './index.scss'

const NotFound = () => {
  return (
    <div className="box">
      <div className="logo-box">
        <div className="bear">
        </div>
      </div>
      <div className="text-box">
        <div className="title">404 Not Found</div>
        <div className="list-box">
          请试试以下办法：
          <ul>
            <li>检查网络连接</li>
            <li>检查代理服务器和防火墙</li>
            <li>运行 Windows 网络诊断</li>
          </ul>
        </div>
      </div>
    </div>
  )
};

export default NotFound;
