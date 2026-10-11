import { createRoot } from 'react-dom/client';
import { LocaleProvider, useLocale } from './LocaleProvider';
import WorldsLab from './WorldsLab';
import './base.css';
import './worlds.css';

function App() {
  const { locale, setLocale } = useLocale();
  return <>
    <div className="app-bar">
      <span>RESEARCH PROTOTYPE / 0.1</span>
      <label>{locale === 'en' ? 'Language' : '言語'}
        <select value={locale} onChange={event => setLocale(event.target.value === 'ja' ? 'ja' : 'en')}>
          <option value="en">English</option><option value="ja">日本語</option>
        </select>
      </label>
    </div>
    <WorldsLab />
  </>;
}

createRoot(document.getElementById('root')!).render(<LocaleProvider><App /></LocaleProvider>);
