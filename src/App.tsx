import { useSimulation } from './hooks/useSimulation';
import { Controls } from './ui/Controls';
import { InfoPanel } from './ui/InfoPanel';
import { MetricsPanel } from './ui/MetricsPanel';
import { Scene } from './ui/Scene';
import { TtftChart } from './ui/TtftChart';

export default function App() {
  const sim = useSimulation();
  return (
    <main className="app">
      <header>
        <h1>Inference Placement Simulator</h1>
        <p>How the distance between prefill and decode servers shapes latency and queueing.</p>
      </header>
      <div className="layout">
        <section>
          <Scene state={sim.state} tierId={sim.params.tierId} linkUtil={sim.metrics.linkUtil} />
          <Controls params={sim.params} setTier={sim.setTier} setRpm={sim.setRpm} reset={sim.reset} />
        </section>
        <aside>
          <MetricsPanel metrics={sim.metrics} />
          <TtftChart state={sim.state} />
        </aside>
      </div>
      <InfoPanel tierId={sim.params.tierId} />
    </main>
  );
}
