import DemoApp from './DemoApp';
import { LiveHUD } from '../features/live/LiveHUD';

export default function App() {
  return new URLSearchParams(window.location.search).get('demo') === '1'
    ? <DemoApp /> : <LiveHUD />;
}
