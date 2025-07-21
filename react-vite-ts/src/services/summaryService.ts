// 使用 SSE 实时获取 AI 生成的任务摘要
export function streamSummary(
  taskId: number,
  onMsg: (chunk: string) => void,
  onDone?: () => void,
  onError?: () => void
) {
  const eventSource = new EventSource(`http://localhost:3001/api/stream/${taskId}`);

  eventSource.onmessage = (event) => {
    onMsg(event.data);
  };

  eventSource.addEventListener("done", () => {
    eventSource.close();
    onDone?.();
  });

  eventSource.onerror = () => {
    eventSource.close();
    onError?.();
  };

  return () => eventSource.close();
}