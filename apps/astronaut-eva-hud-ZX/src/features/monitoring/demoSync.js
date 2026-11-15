export const SYNC_DEMO = new URLSearchParams(location.search).get('sync') === '1';

/** EventSource reconnects automatically and always receives a complete server snapshot. */
export function subscribeDemo(onSnapshot, onConnection) {
  const source = new EventSource('/sync/events');
  source.onopen = () => onConnection(true);
  source.onerror = () => onConnection(false);
  source.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.type === 'demo') onSnapshot(message);
  };
  return () => source.close();
}
