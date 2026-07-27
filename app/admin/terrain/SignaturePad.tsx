"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  estVide: () => boolean;
  exporterPng: () => Promise<Blob | null>;
  effacer: () => void;
};

// Capture au doigt/stylet sur canvas — pas de librairie externe pour un
// besoin aussi simple (tracer des traits, exporter en PNG). Le canvas est
// redimensionné au ratio de pixels de l'appareil pour rester net sur un
// écran de téléphone (sinon un trait fin devient flou en HiDPI).
const SignaturePad = forwardRef<SignaturePadHandle, { className?: string }>(function SignaturePad(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enTrainDeDessiner = useRef(false);
  const [aDessine, setADessine] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1C1C1C";
    }
  }, []);

  function positionDe(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function debuterTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    enTrainDeDessiner.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = positionDe(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function poursuivreTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enTrainDeDessiner.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = positionDe(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setADessine(true);
  }

  function terminerTrait() {
    enTrainDeDessiner.current = false;
  }

  useImperativeHandle(ref, () => ({
    estVide: () => !aDessine,
    exporterPng: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas || !aDessine) {
          resolve(null);
          return;
        }
        canvas.toBlob((blob) => resolve(blob), "image/png");
      }),
    effacer: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setADessine(false);
    },
  }));

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        onPointerDown={debuterTrait}
        onPointerMove={poursuivreTrait}
        onPointerUp={terminerTrait}
        onPointerLeave={terminerTrait}
        // touch-none : sans ça, le geste de signature fait défiler la page
        // sur mobile au lieu de tracer un trait.
        className="h-32 w-full touch-none rounded-lg border border-slate-300 bg-white"
      />
      {aDessine && (
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setADessine(false);
          }}
          className="mt-1 text-xs text-slate-500 underline"
        >
          Effacer la signature
        </button>
      )}
    </div>
  );
});

export default SignaturePad;
