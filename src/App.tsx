import { Link, Route, Routes, useLocation } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import StartSessionScreen from './screens/StartSessionScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

function NavBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/history', label: 'History', icon: '📅' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  // Hide the nav bar during an active session to keep focus on the timer.
  if (pathname.startsWith('/session/active')) return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const active =
            t.to === '/' ? pathname === '/' : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/session/active');
  return (
    <div className="mx-auto min-h-full max-w-md">
      <main className={hideNav ? '' : 'pb-20'}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/start/:childId?" element={<StartSessionScreen />} />
          <Route path="/session/active" element={<ActiveSessionScreen />} />
          <Route path="/session/summary" element={<SessionSummaryScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  );
}
