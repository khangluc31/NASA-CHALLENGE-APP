import { useEffect, useState, type ChangeEvent } from "react";

import { useJukeboxStore } from "../store";
import { fieldCls, Row, Section } from "./ui";

export function ImageProbe() {
  const [src, setSrc] = useState<string | null>(null);

  // Giải phóng object URL cũ khi đổi ảnh hoặc unmount.
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSrc(URL.createObjectURL(f));
  };

  return (
    <Section title="5. Try a real image (pick a file, click the image)">
      <Row>
        <input type="file" accept="image/*" className={fieldCls} onChange={onFile} aria-label="Choose image" />
      </Row>
      {src && (
        <img
          src={src}
          alt="Image being probed for color"
          className="mt-2 block max-w-full cursor-crosshair border border-lab-line-soft"
          onLoad={(e) =>
            useJukeboxStore
              .getState()
              .log(
                `Image ${e.currentTarget.naturalWidth}x${e.currentTarget.naturalHeight}. Click the image to hear its color.`,
                "ok",
              )
          }
          onClick={(e) => void useJukeboxStore.getState().probeImage(e.currentTarget, e.nativeEvent)}
        />
      )}
    </Section>
  );
}
