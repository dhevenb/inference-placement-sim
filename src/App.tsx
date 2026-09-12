import { useSimulation } from './hooks/useSimulation';
import { Controls } from './ui/Controls';
import { Scene } from './ui/Scene';

export default function App() {
  const sim = useSimulation();
  return (
    <main className="app">
      <header>
        <h1>Inference Placement Simulator</h1>
        <p>How the distance between prefill and decode servers shapes latency and queueing.</p>
      </header>
      <section className="stage">
        <Scene state={sim.state} tierId={sim.params.tierId} linkUtil={sim.metrics.linkUtil} />
        <Controls params={sim.params} setTier={sim.setTier} setRpm={sim.setRpm} reset={sim.reset} />
      </section>
    </main>
  );
}
