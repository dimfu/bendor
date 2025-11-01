import { useEffect, useRef, useState } from "react";

interface CanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: ArrayBuffer;
}

type DrawOffset = {
  x: number;
  y: number;
};

const STROKE_STYLE = "black";
const STROKE_WIDTH = 2;

function renderImage(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  src: ArrayBuffer
) {
  const blob = new Blob([src]);
  const objectURL = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    canvas.height = img.naturalHeight;
    canvas.width = img.naturalWidth;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(objectURL);
  };
  img.src = objectURL;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.strokeStyle = STROKE_STYLE;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function Canvas({ src, ...props }: CanvasProps) {
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const drawOffsetRef = useRef<DrawOffset>({ x: 0, y: 0 });

  const [ongoingTouches, setOngoingTouches] = useState<Touch[]>([]);
  const getOngoingTouchById = (id: number) =>
    ongoingTouches.findIndex((t) => t.identifier === id);

  useEffect(() => {
    if (!imageCanvasRef.current || !drawCanvasRef.current || !src) return;

    const imageCanvas = imageCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const imageCtx = imageCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");

    if (!imageCtx || !drawCtx) return;

    drawCtxRef.current = drawCtx;

    renderImage(imageCanvas, imageCtx, src);

    const img = new Image();
    const blob = new Blob([src]);
    const objectURL = URL.createObjectURL(blob);
    img.onload = () => {
      drawCanvas.height = img.naturalHeight;
      drawCanvas.width = img.naturalWidth;
      URL.revokeObjectURL(objectURL);
    };
    img.src = objectURL;

    const handleMouseDown = (e: MouseEvent) => {
      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;

      isDrawingRef.current = true;
      drawOffsetRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;

      const prev = drawOffsetRef.current;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      drawLine(drawCtxRef.current, prev.x, prev.y, currentX, currentY);
      drawOffsetRef.current = { x: currentX, y: currentY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;

      const prev = drawOffsetRef.current;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      drawLine(drawCtxRef.current, prev.x, prev.y, currentX, currentY);
      isDrawingRef.current = false;
      drawOffsetRef.current = { x: 0, y: 0 };
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        setOngoingTouches((prev) => [...prev, touches[i]]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!drawCtxRef.current) return;

      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;
      const touches = e.changedTouches;

      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier);
        if (idx >= 0) {
          const prev = ongoingTouches[idx];
          drawLine(
            drawCtxRef.current,
            (prev.clientX - rect.left) * scaleX,
            (prev.clientY - rect.top) * scaleY,
            (touches[i].clientX - rect.left) * scaleX,
            (touches[i].clientY - rect.top) * scaleY
          );
          setOngoingTouches((prev) => {
            const updated = [...prev];
            updated.splice(idx, 1, touches[i]);
            return updated;
          });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier);
        if (idx >= 0) {
          setOngoingTouches((prev) => prev.filter((_, j) => j !== idx));
        }
      }
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier);
        if (idx >= 0) {
          setOngoingTouches((prev) => prev.filter((_, j) => j !== idx));
        }
      }
    };

    drawCanvas.addEventListener("mousedown", handleMouseDown);
    drawCanvas.addEventListener("mousemove", handleMouseMove);
    drawCanvas.addEventListener("mouseup", handleMouseUp);
    drawCanvas.addEventListener("touchstart", handleTouchStart);
    drawCanvas.addEventListener("touchmove", handleTouchMove);
    drawCanvas.addEventListener("touchend", handleTouchEnd);
    drawCanvas.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      drawCanvas.removeEventListener("mousedown", handleMouseDown);
      drawCanvas.removeEventListener("mousemove", handleMouseMove);
      drawCanvas.removeEventListener("mouseup", handleMouseUp);
      drawCanvas.removeEventListener("touchstart", handleTouchStart);
      drawCanvas.removeEventListener("touchmove", handleTouchMove);
      drawCanvas.removeEventListener("touchend", handleTouchEnd);
      drawCanvas.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [src, ongoingTouches]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block", lineHeight: 0 }}
      {...props}
    >
      <canvas
        ref={imageCanvasRef}
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
        }}
      />
      <canvas
        ref={drawCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: "crosshair",
        }}
      />
    </div>
  );
}

export default Canvas;
