import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorChannel, Layer, Point } from "./types";
import { ActionType } from "./reducer";
import { useStore } from "./hooks";

function selectedPixelData(
  ctx: CanvasRenderingContext2D,
  selection?: Point[]
): ColorChannel[] {
  const channels: ColorChannel[] = [];
  // push every pixel from top left to bottom right if no selection
  if (!selection || selection.length == 0) {
    const data = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    ).data;
    for (let i = 0; i < data.length; i += 4) {
      channels.push(
        new Uint8Array([
          data[i],
          data[i + 1],
          data[i + 2],
          data[i + 3],
        ]) as ColorChannel
      );
    }
  }
  return channels;
}

function Canvas(props: React.HTMLAttributes<HTMLDivElement>) {
  const { state, dispatch } = useStore();

  const imgSrc = state.imgBuf;

  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const selectedPixelsRef = useRef<Set<string>>(new Set());

  const [ongoingTouches, setOngoingTouches] = useState<Touch[]>([]);

  const getOngoingTouchById = useCallback(
    (id: number) => ongoingTouches.findIndex((t) => t.identifier === id),
    [ongoingTouches]
  );

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
    element: HTMLCanvasElement,
    points: Point[],
    start: Point | null,
    color: Layer['color']
  ) => {
    if (points.length <= 1 || !start) return;
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = color;
    const toRgb = color
      .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
      .substring(1)
      .match(/.{2}/g)
      ?.map(x => parseInt(x, 16)) ?? [0, 0, 0];
    ctx.fillStyle = `rgb(${toRgb[0]}, ${toRgb[1]}, ${toRgb[2]}, 0.3)`;
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

  const selectPixels = useCallback(
    (points: Point[], canvas: HTMLCanvasElement) => {
      if (points.length <= 1) return;
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
    },
    []
  );

  useEffect(() => {
    if (!imgSrc || !imageCanvasRef.current) return;
    const imageCanvas = imageCanvasRef.current;
    const imageCtx = imageCanvas.getContext("2d");
    if (!imageCtx) return;
    // load image
    const blob = new Blob([imgSrc]);
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      // sizing (this clears both canvases)
      imageCanvas.width = img.naturalWidth;
      imageCanvas.height = img.naturalHeight;
      // draw base image
      imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      imageCtx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [imgSrc]);

  // To register mouse events to the drawing canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // use timeout to prevent from accessing the activeCanvas before it being created to the DOM
    const timeout = setTimeout(() => {
      const activeCanvas = container.querySelector<HTMLCanvasElement>(
        `#drawing-canvas-${state.selectedLayerIdx}`
      );
      if (!activeCanvas) return;

      const drawingCanvasCtx = state.currentLayer?.ctx;
      if (!drawingCanvasCtx) {
        console.log("drawingCanvasCtx empty in register");
        return;
      }

      const getCanvasCoordinates = (clientX: number, clientY: number) => {
        const rect = activeCanvas.getBoundingClientRect();
        const scaleX = activeCanvas.width / rect.width;
        const scaleY = activeCanvas.height / rect.height;
        return {
          x: Math.round((clientX - rect.left) * scaleX),
          y: Math.round((clientY - rect.top) * scaleY),
        };
      };

      const handleMouseDown = (e: MouseEvent) => {
        // dont do anything unless there is layer selected
        if (state.selectedLayerIdx < 0) {
          return;
        }
        isDrawingRef.current = true;
        selectedPixelsRef.current.clear();
        const point = getCanvasCoordinates(e.clientX, e.clientY);
        startPointRef.current = point;
        pointsRef.current = [point];
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color,
        );
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawingRef.current) return;

        const point = getCanvasCoordinates(e.clientX, e.clientY);
        pointsRef.current.push(point);
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color,
        );
      };

      const handleMouseUp = () => {
        if (!isDrawingRef.current) return;

        isDrawingRef.current = false;
        if (startPointRef.current) {
          pointsRef.current.push(startPointRef.current);
        }
        selectPixels(pointsRef.current, activeCanvas);
        drawingCanvasCtx.clearRect(
          0,
          0,
          activeCanvas.width,
          activeCanvas.height
        );
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color,
        );

        dispatch({
          type: ActionType.SetPointsToLayer,
          payload: { points: pointsRef.current, start: startPointRef.current! },
        });

        // TODO: apply filter to selected points
        console.log(selectedPixelData(drawingCanvasCtx, pointsRef.current));
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
          renderSelection(
            drawingCanvasCtx,
            activeCanvas,
            pointsRef.current,
            startPointRef.current,
            state.currentLayer!.color,
          );
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (!isDrawingRef.current) return;

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
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color,
        );
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if (!isDrawingRef.current) return;

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
        selectPixels(pointsRef.current, activeCanvas);
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color,
        );

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

      activeCanvas.addEventListener("mousedown", handleMouseDown);
      activeCanvas.addEventListener("mousemove", handleMouseMove);
      activeCanvas.addEventListener("mouseup", handleMouseUp);
      activeCanvas.addEventListener("touchstart", handleTouchStart);
      activeCanvas.addEventListener("touchmove", handleTouchMove);
      activeCanvas.addEventListener("touchend", handleTouchEnd);
      activeCanvas.addEventListener("touchcancel", handleTouchCancel);

      return () => {
        activeCanvas.removeEventListener("mousedown", handleMouseDown);
        activeCanvas.removeEventListener("mousemove", handleMouseMove);
        activeCanvas.removeEventListener("mouseup", handleMouseUp);
        activeCanvas.removeEventListener("touchstart", handleTouchStart);
        activeCanvas.removeEventListener("touchmove", handleTouchMove);
        activeCanvas.removeEventListener("touchend", handleTouchEnd);
        activeCanvas.removeEventListener("touchcancel", handleTouchCancel);
      };
    }, 0);

    return () => clearTimeout(timeout);
  }, [
    ongoingTouches,
    state.selectedLayerIdx,
    state.currentLayer,
    dispatch,
    getOngoingTouchById,
    selectPixels,
  ]);

  // Handle selection render on layer index change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeCanvas = container.querySelector<HTMLCanvasElement>(
      `#drawing-canvas-${state.selectedLayerIdx}`
    );

    // when user selects a layer, sync its points into refs
    pointsRef.current = state.currentLayer?.points || [];
    startPointRef.current = state.currentLayer?.start || null;

    // now redraw the overlay only if there is already a drawing canvas element for this layer
    if (activeCanvas && state.currentLayer?.ctx) {
      renderSelection(
        state.currentLayer.ctx,
        activeCanvas,
        pointsRef.current,
        startPointRef.current,
        state.currentLayer.color,
      );
    }

    // create drawing canvas on new layer creation
    if (state.selectedLayerIdx >= 0 && !state.currentLayer?.ctx) {
      const container = containerRef.current;
      if (!container) return;
      const img = imageCanvasRef.current;
      const drawingCanvas = document.createElement("canvas");

      // set drawing canvas dimension with the image dimension
      if (img) {
        drawingCanvas.width = img.width;
        drawingCanvas.height = img.height;
      }

      drawingCanvas.id = `drawing-canvas-${state.selectedLayerIdx}`;
      Object.assign(drawingCanvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        cursor: "crosshair",
      });

      container.appendChild(drawingCanvas);
      const ctx = drawingCanvas.getContext("2d");
      dispatch({
        type: ActionType.UpdateLayer,
        payload: {
          layerIdx: state.selectedLayerIdx,
          pselection: { ctx },
        },
      });
    }
  }, [state.selectedLayerIdx, state.currentLayer, dispatch]);

  // Handle layers selection on selected index change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // find all canvases with id starting with "drawing-canvas-"
    const canvases = container.querySelectorAll<HTMLCanvasElement>(
      '[id^="drawing-canvas-"]'
    );

    canvases.forEach((canvas) => {
      // extract the numeric index from the id
      const idx = Number(canvas.id.replace("drawing-canvas-", ""));

      if (idx === state.selectedLayerIdx) {
        canvas.classList.add("active");
        canvas.style.pointerEvents = "auto";
      } else {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.classList.remove("active");
        canvas.style.pointerEvents = "none";
      }
    });
  }, [state.selectedLayerIdx]);

  // TODO: should the image result rendered as:
  // - another canvas element as the preview canvas
  // - render the result directly inside the main canvas
  // - the main canvas can be toggled to preview the result or edit the selection points
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
    </div>
  );
}

export default Canvas;
