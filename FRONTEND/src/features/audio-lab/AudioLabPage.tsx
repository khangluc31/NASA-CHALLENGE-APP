import { useEffect } from "react";

import { engine } from "../../../audio";
import { DataSource } from "./components/DataSource";
import { FeatureGrid } from "./components/FeatureGrid";
import { ImageProbe } from "./components/ImageProbe";
import { LogPanel } from "./components/LogPanel";
import { Swatches } from "./components/Swatches";
import { Transport } from "./components/Transport";
import { bindEngineToStore, useJukeboxStore } from "./store";

export default function AudioLabPage() {
  useEffect(() => {
    const unbind = bindEngineToStore();

    const log = useJukeboxStore.getState().log;
    const onError = (e: ErrorEvent) => log("Error: " + e.message, "bad");
    const onRejection = (e: PromiseRejectionEvent) =>
      log("Error: " + ((e.reason as Error | undefined)?.message ?? String(e.reason)), "bad");

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      unbind();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      engine.stop(); // rời trang thì dừng phát
    };
  }, []);

  return (
    <main className="audio-lab mx-auto min-h-screen max-w-[900px] bg-lab-bg p-4 font-sans text-[15px] leading-normal text-lab-fg">
      <h1 className="text-xl font-bold">Earth Jukebox – Audio Test Bench</h1>
      <DataSource />
      <Transport />
      <FeatureGrid />
      <Swatches />
      <ImageProbe />
      <LogPanel />
    </main>
  );
}
