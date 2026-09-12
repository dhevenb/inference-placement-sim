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
        <p>
          See how the physical placement of AI inference servers shapes what customers experience when they use a
          model. Set how far apart the servers sit and how many requests arrive per minute, then watch requests queue,
          slow down, and get turned away. The goal is understanding, not realism: why “just add more servers in another
          building” is not a free decision.
        </p>
      </header>
      <div className="layout">
        <section>
          <Scene state={sim.state} tierId={sim.params.tierId} linkUtil={sim.metrics.linkUtil} />
          <Controls params={sim.params} setTier={sim.setTier} setRpm={sim.setRpm}
            applyPreset={sim.applyPreset} reset={sim.reset} />
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
