import { useEffect, useState } from 'react';
import { useLocale } from './LocaleProvider';
import { createWorld, forkWorld, MAX_TICKS, metrics, stepWorld, type Place, type Rule, type Scenario, type World } from './simulation';
import WorldCanvas from './WorldCanvas';

export default function WorldsLab() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [world, setWorld] = useState(() => createWorld());
  const [baseline, setBaseline] = useState<World | null>(null);
  const [forkAt, setForkAt] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState(0);
  const [seed, setSeed] = useState('42');
  const [dirty, setDirty] = useState(false);
  const [exportError, setExportError] = useState(false);
  const running = playing && world.tick < MAX_TICKS;
  function advance() {
    setWorld(stepWorld);
    setBaseline(previous => previous ? stepWorld(previous) : null);
    setDirty(true);
  }
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(advance, 700 / speed);
    return () => window.clearInterval(interval);
  }, [running, speed]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.('a[href]');
      if (!link || event.ctrlKey || event.metaKey || link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;
      if (!window.confirm(en ? 'Leave without exporting this experiment?' : '実験をエクスポートせずに移動しますか？')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty, en]);
  const ruleName = (rule: Rule) => rule === 'commons' ? (en ? 'Shared commons' : '共有する') : (en ? 'Private reserves' : '各自で蓄える');
  const placeName = (place: Place) => ({ grove: en ? 'Grove' : '森', commons: en ? 'Commons' : '広場', home: en ? 'Village' : '住まい' })[place];
  const summary = metrics(world);
  const agent = world.agents[selected];
  function reset() {
    if (dirty && !window.confirm(en ? 'Discard this unexported experiment?' : '未エクスポートの実験を破棄しますか？')) return;
    setPlaying(false);
    setWorld(createWorld(Number(seed), world.rule, world.scenario));
    setBaseline(null);
    setForkAt(null);
    setDirty(false);
  }
  function fork() {
    setPlaying(false);
    setBaseline(forkWorld(world, world.rule));
    setForkAt(world.tick);
    setWorld(forkWorld(world, world.rule === 'commons' ? 'private' : 'commons'));
    setDirty(true);
  }
  function exportRun() {
    let url: string | undefined;
    const anchor = document.createElement('a');
    try {
      const data = { format: 'kibou-worlds-experiment', version: 1, engine: 'rules-v1', forkAt, world, baseline,
        limitations: 'Synthetic rule-based agents, not LLMs or evidence about human behavior.' };
      url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      anchor.href = url; anchor.download = `kibou-worlds-${world.seed}-${world.tick}.json`;
      document.body.append(anchor); anchor.click();
      setDirty(false); setExportError(false);
    } catch { setExportError(true); }
    finally {
      anchor.remove();
      if (url) {
        const downloadUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
    }
  }
  return <main className="worlds">
    <header className="world-header"><div><p className="world-kicker">KIBOU LAB / EXPERIMENT 001</p><h1>KIBOU Worlds</h1><p>{en ? 'One island. Different rules. Shared futures.' : 'ひとつの島。異なるルール。変わる未来。'}</p></div><div className="world-status"><span className={running ? 'world-live active' : 'world-live'} />{running ? (en ? 'Running' : '実行中') : (en ? 'Paused' : '一時停止')}<span>LOCAL / RULE-BASED</span></div></header>
    <div className="world-toolbar"><div className="world-command-group">
      <button className="world-primary" onClick={() => setPlaying(!running)} disabled={world.tick >= MAX_TICKS}>{running ? (en ? 'Pause' : '一時停止') : (en ? 'Run world' : '世界を動かす')}</button>
      <button onClick={advance} disabled={running || world.tick >= MAX_TICKS}>{en ? 'Step' : '1ステップ'}</button>
      <button onClick={fork} disabled={!!baseline || world.tick >= MAX_TICKS}>{en ? 'Fork rules' : 'ルールを分岐'}</button>
    </div><div className="world-speed" role="group" aria-label={en ? 'Simulation speed' : '実行速度'}>{[1, 2, 4].map(value => <button key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}x</button>)}</div><button onClick={exportRun}>{en ? 'Export' : 'エクスポート'}</button></div>
    <div className="world-workspace"><section className="world-stage" aria-label={en ? 'Island experiment' : '島の実験'}>
      <div className="world-stage-top"><span>HOSHIMA / SEED {world.seed}</span><strong>{en ? 'Day' : '日'} {String(summary.day).padStart(2, '0')} <span>/ 100</span></strong></div>
      <WorldCanvas world={world} selected={selected} en={en} />
      <div className="world-metrics"><div><span>{en ? 'Needs met' : '必要量を満たした人数'}</span><strong>{summary.met}<small> / 12</small></strong></div><div><span>{en ? 'Stored provisions' : '備蓄'}</span><strong>{Math.round(summary.reserves)}</strong></div><div><span>{en ? 'Resource inequality' : '資源の偏り'}</span><strong>{summary.inequality.toFixed(2)}</strong></div></div>
      <div className="world-agent-strip" role="group" aria-label={en ? 'Select an agent' : 'エージェントを選択'}>{world.agents.map(a => <button key={a.id} aria-pressed={selected === a.id} onClick={() => setSelected(a.id)}><span className={`world-avatar agent-${a.id % 4}`} />{a.name}</button>)}</div>
    </section><aside className="world-inspector"><h2>{en ? 'World rules' : '世界のルール'}</h2>
      <label>{en ? 'Resource ownership' : '資源の所有'}<select value={world.rule} disabled={world.tick > 0 || !!baseline} onChange={e => setWorld(createWorld(world.seed, e.target.value as Rule, world.scenario))}><option value="commons">{ruleName('commons')}</option><option value="private">{ruleName('private')}</option></select></label>
      <label>{en ? 'Environment' : '環境'}<select value={world.scenario} disabled={world.tick > 0 || !!baseline} onChange={e => setWorld(createWorld(world.seed, world.rule, e.target.value as Scenario))}><option value="steady">{en ? 'Steady growth' : '安定した成長'}</option><option value="drought">{en ? 'Drought · days 8–19' : '干ばつ · 8〜19日'}</option></select></label>
      <div className="world-seed"><label>{en ? 'Next seed' : '次のシード'}<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e => setSeed(e.target.value)} /></label><button disabled={!/^\d{1,10}$/.test(seed) || Number(seed) > 4294967295} onClick={reset}>{en ? 'Reset' : 'リセット'}</button></div>
      <section className="world-agent-detail"><p className="world-kicker">AGENT {String(agent.id + 1).padStart(2, '0')}</p><h2>{agent.name}</h2><dl>{[[en ? 'Destination' : '行き先', placeName(agent.target)], [en ? 'Carrying' : '運搬中', agent.cargo], [en ? 'Private reserve' : '個人の備蓄', agent.reserve], [en ? 'Daily need' : '1日の必要量', agent.fed ? (en ? 'Met' : '充足') : (en ? 'Unmet' : '不足')]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="world-observations"><h2>{en ? 'Observations' : '観察記録'}</h2><ol>{world.events.slice(0, 5).map((event, i) => <li key={`${event.tick}-${i}`}><span>{String(event.tick).padStart(3, '0')}</span>{event.kind === 'day' ? `${en ? 'Needs met' : '充足'}: ${event.amount}/12` : `${world.agents[event.agent!].name} · ${event.kind === 'gather' ? (en ? 'gathered' : '採集') : (en ? 'delivered' : '搬入')} ${event.amount}`}</li>)}</ol>{!world.events.length && <p>{en ? 'No observations yet.' : 'まだ記録はありません。'}</p>}</section>
    </aside></div>
    <section className="world-comparison" aria-label={en ? 'Branch comparison' : '分岐の比較'}><div><p className="world-kicker">COUNTERFACTUAL / SAME STATE</p><h2>{en ? 'What changes when the rules change?' : 'ルールが変わると、何が変わる？'}</h2></div>{baseline ? <div className="world-comparison-results">{[baseline, world].map((run, i) => <div key={i}><span>{i ? (en ? 'Branch' : '分岐') : (en ? 'Baseline' : '元の世界')} · {ruleName(run.rule)}</span><strong>{metrics(run).met}/12</strong><small>{en ? 'needs met' : '充足人数'} · {en ? 'fork tick' : '分岐ステップ'} {forkAt}</small></div>)}</div> : <p>{en ? 'No branch yet' : 'まだ分岐していません'}</p>}</section>
    <div className="world-run-status" role="status">{exportError ? (en ? 'Export failed. Your experiment remains in this tab.' : 'エクスポートできませんでした。実験はこのタブに残っています。') : dirty ? (en ? 'Unexported experiment · tab only' : '未エクスポートの実験 · このタブのみ') : (en ? 'No unexported changes' : '未エクスポートの変更なし')}{world.tick >= MAX_TICKS && ` · ${en ? 'Experiment complete' : '実験終了'}`}</div>
    <footer className="world-footer"><p>{en ? 'Synthetic agents. Explicit rules. Reproducible experiments. This browser island does not use LLMs or real member data; its outcomes are not evidence about human societies.' : '架空のエージェント、明示的なルール、再現可能な実験。このブラウザ版はLLMや会員データを使用しません。結果は人間社会についての根拠ではありません。'}</p><nav><a href="https://github.com/kibo-org/kibou-worlds/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">{en ? 'Contribute' : '貢献する'}</a><a href="https://github.com/kibo-org/kibou-worlds/issues" target="_blank" rel="noopener noreferrer">{en ? 'Ideas & questions' : 'アイデアと質問'}</a><a href="https://github.com/kibo-org/kibou-worlds/blob/main/docs/AGENT_EXPERIMENTS.md" target="_blank" rel="noopener noreferrer">{en ? 'Local agent experiments' : 'ローカル社会実験'}</a></nav></footer>
  </main>;
}
