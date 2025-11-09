import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "./types";
import { ActionType } from "./reducer";
import { useStore } from "./hooks";

interface CanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: ArrayBuffer;
}

function Canvas({ src, ...props }: CanvasProps) {
  const { state, dispatch } = useStore();

  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const selectedPixelsRef = useRef<Set<string>>(new Set());

  const [ongoingTouches, setOngoingTouches] = useState<Touch[]>([]);

  const getOngoingTouchById = useCallback((id: number) =>
    ongoingTouches.findIndex((t) => t.identifier === id), [ongoingTouches]);

  // https://codepen.io/cranes/pen/GvobwB (MASSIVE SHOUTOUT)
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    if (polygon.length <= 1) return false;

    let intersectionCount = 0;

    for (let i = 1; i < polygon.length; i++) {
      const start = polygon[i - 1];
      const end = polygon[i];

      const ray = {
        Start: { x: point.x, y: point.y },
        End: { x: 99999, y: point.y },
      };
      const segment = { Start: start, End: end };

      const rayDistance = {
        x: ray.End.x - ray.Start.x,
        y: ray.End.y - ray.Start.y,
      };

      const segDistance = {
        x: segment.End.x - segment.Start.x,
        y: segment.End.y - segment.Start.y,
      };

      const rayLength = Math.sqrt(
        Math.pow(rayDistance.x, 2) + Math.pow(rayDistance.y, 2)
      );
      const segLength = Math.sqrt(
        Math.pow(segDistance.x, 2) + Math.pow(segDistance.y, 2)
      );

      if (
        rayDistance.x / rayLength === segDistance.x / segLength &&
        rayDistance.y / rayLength === segDistance.y / segLength
      ) {
        continue;
      }

      const T2 =
        (rayDistance.x * (segment.Start.y - ray.Start.y) +
          rayDistance.y * (ray.Start.x - segment.Start.x)) /
        (segDistance.x * rayDistance.y - segDistance.y * rayDistance.x);
      const T1 =
        (segment.Start.x + segDistance.x * T2 - ray.Start.x) / rayDistance.x;

      if (T1 < 0) continue;
      if (T2 < 0 || T2 > 1) continue;
      if (isNaN(T1)) continue;

      intersectionCount++;
    }

    return (intersectionCount & 1) === 1;
  };

  const renderSelection = (
    ctx: CanvasRenderingContext2D,
    points: Point[],
    start: Point | null
  ) => {
    if (points.length <= 1 || !start) return;

    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    ctx.lineTo(start.x, start.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.setLineDash([]);
  };

  const selectPixels = useCallback((points: Point[]) => {
    if (!drawCanvasRef.current || points.length <= 1) return;

    const canvas = drawCanvasRef.current;
    selectedPixelsRef.current.clear();

    // sample every 10th pixel instead of every pixel for perfomance boost :)
    const steps = 10;
    for (let x = 0; x < canvas.width; x += steps) {
      for (let y = 0; y < canvas.height; y += steps) {
        if (isPointInPolygon({ x, y }, points)) {
          selectedPixelsRef.current.add(`${x},${y}`);
        }
      }
    }
  }, []);

  const renderCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderSelection(ctx, pointsRef.current, startPointRef.current);
  }, []);

  useEffect(() => {
    if (!src || !imageCanvasRef.current || !drawCanvasRef.current) return;

    const imageCanvas = imageCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const imageCtx = imageCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");
    if (!imageCtx || !drawCtx) return;

    drawCtxRef.current = drawCtx;

    // load image
    const blob = new Blob([src]);
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      // sizing (this clears both canvases)
      imageCanvas.width = img.naturalWidth;
      imageCanvas.height = img.naturalHeight;

      drawCanvas.width = img.naturalWidth;
      drawCanvas.height = img.naturalHeight;

      // draw base image
      imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      imageCtx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [src]);

  useEffect(() => {
    if (!drawCanvasRef.current) return;
    const drawCanvas = drawCanvasRef.current;
    const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      // dont do anything unless there is layer selected
      if (state.selectedSelectionIdx < 0) {
        return;
      }
      isDrawingRef.current = true;
      selectedPixelsRef.current.clear();
      const point = getCanvasCoordinates(e.clientX, e.clientY);
      startPointRef.current = point;
      pointsRef.current = [point];
      if (drawCtxRef.current) {
        renderCanvas(drawCtxRef.current);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      const point = getCanvasCoordinates(e.clientX, e.clientY);
      pointsRef.current.push(point);
      renderCanvas(drawCtxRef.current);
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      isDrawingRef.current = false;
      if (startPointRef.current) {
        pointsRef.current.push(startPointRef.current);
      }
      selectPixels(pointsRef.current);
      renderCanvas(drawCtxRef.current);

      dispatch({
        type: ActionType.SetPointsToLayer,
        payload: { points: pointsRef.current, start: startPointRef.current! },
      });

      console.log(`Selected ${selectedPixelsRef.current.size} pixels`);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.changedTouches;
      if (touches.length > 0) {
        isDrawingRef.current = true;
        selectedPixelsRef.current.clear();
        const point = getCanvasCoordinates(
          touches[0].clientX,
          touches[0].clientY
        );
        startPointRef.current = point;
        pointsRef.current = [point];
        setOngoingTouches([touches[0]]);
        if (drawCtxRef.current) {
          renderCanvas(drawCtxRef.current);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier);
        if (idx >= 0) {
          const point = getCanvasCoordinates(
            touches[i].clientX,
            touches[i].clientY
          );
          pointsRef.current.push(point);
          setOngoingTouches((prev) => {
            const updated = [...prev];
            updated.splice(idx, 1, touches[i]);
            return updated;
          });
        }
      }
      renderCanvas(drawCtxRef.current);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || !drawCtxRef.current) return;

      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier);
        if (idx >= 0) {
          setOngoingTouches((prev) => prev.filter((_, j) => j !== idx));
        }
      }

      isDrawingRef.current = false;
      if (startPointRef.current) {
        pointsRef.current.push(startPointRef.current);
      }
      selectPixels(pointsRef.current);
      renderCanvas(drawCtxRef.current);

      console.log(`Selected ${selectedPixelsRef.current.size} pixels`);
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
      isDrawingRef.current = false;
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
  }, [ongoingTouches, state.selectedSelectionIdx, dispatch, getOngoingTouchById, renderCanvas, selectPixels]);

  useEffect(() => {
    // when user selects a layer, sync its points into refs
    if (!drawCtxRef.current) return;

    pointsRef.current = state.currentSelection?.points || [];
    startPointRef.current = state.currentSelection?.start || null;

    // now redraw the overlay
    renderCanvas(drawCtxRef.current);
  }, [state.currentSelection, renderCanvas]);

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
