export function streamSummary(
  taskId: number,
  onMsg: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: string) => void,
  options?: {
    maxRetries?: number;   // 最大重试次数
    retryDelay?: number;   // 每次重试间隔
  }
) {
  const { maxRetries = 5, retryDelay = 2000 } = options || {};
  let retryCount = 0;
  let eventSource: EventSource | null = null;
  let lastEventId: string | null = null; // 保存上次接收的消息ID

  const connect = () => {

    const url = new URL(`http://localhost:3001/api/stream/${taskId}`);
    if (lastEventId) url.searchParams.append("lastEventId", lastEventId);

    eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      // 记录最新事件ID，用于断点续传
      if (event.lastEventId) {
        lastEventId = event.lastEventId;
      }
      onMsg(event.data);
    };

    eventSource.addEventListener("done", () => {
      eventSource?.close();
      onDone?.();
    });

    // 出错或断开连接
    eventSource.onerror = () => {
      eventSource?.close();
      retryCount++;

      if (retryCount <= maxRetries) {
        console.warn(`SSE 连接断开，正在第 ${retryCount} 次重试...`);
        setTimeout(connect, retryDelay);
      } else {
        console.error("SSE 重连失败，已达最大重试次数");
        onError?.("连接失败，请稍后重试");
      }
    };
  };

  connect();

  return () => {
    eventSource?.close();
  };
}
