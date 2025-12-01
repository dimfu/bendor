import { useCallback, useEffect, useRef, useState } from "react"
import type { Layer, Point } from "~/types"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { useLoading } from "~/hooks/useLoading"
import { getAreaData } from "~/utils/image"

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  let j = polygon.length - 1

  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
    j = i
  }

  return inside
}

const renderSelection = (
  ctx: CanvasRenderingContext2D,
  element: HTMLCanvasElement,
  points: Point[],
  start: Point | null,
  color: Layer["color"]
) => {
  if (points.length <= 1 || !start) return
  ctx.clearRect(0, 0, element.width, element.height)
  ctx.setLineDash([5, 3])
  ctx.strokeStyle = color
  const toRgb = color
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
    .substring(1)
    .match(/.{2}/g)
    ?.map((x) => parseInt(x, 16)) ?? [0, 0, 0]
  ctx.fillStyle = `rgb(${toRgb[0]}, ${toRgb[1]}, ${toRgb[2]}, 0.3)`
  ctx.lineWidth = 2
  ctx.beginPath()

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (i === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  }

  ctx.lineTo(start.x, start.y)
  ctx.fill()
  ctx.stroke()
  ctx.closePath()
  ctx.setLineDash([])
}

function Canvas(props: React.HTMLAttributes<HTMLDivElement>) {
  const { loading, start, stop } = useLoading()
  const { state, dispatch } = useStore()

  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isDrawingRef = useRef(false)
  const pointsRef = useRef<Point[]>([])
  const startPointRef = useRef<Point | null>(null)
  const areaRef = useRef<Uint8Array | null>(null)

  const [ongoingTouches, setOngoingTouches] = useState<Touch[]>([])

  const getOngoingTouchById = useCallback(
    (id: number) => ongoingTouches.findIndex((t) => t.identifier === id),
    [ongoingTouches]
  )

  // select area inside the point coordinates that are drawn by the client
  const selectArea = useCallback((points: Point[], canvas: HTMLCanvasElement) => {
    if (points.length <= 1) return
    areaRef.current = new Uint8Array(canvas.width * canvas.height)
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        if (isPointInPolygon({ x, y }, points)) {
          const index = y * canvas.width + x
          areaRef.current[index] = 1
        }
      }
    }
  }, [])

  useEffect(() => {
    if (state.imgBuf.byteLength === 0 || !imageCanvasRef.current) return
    const imageCanvas = imageCanvasRef.current
    const imageCtx = imageCanvas.getContext("2d")
    if (!imageCtx) return

    const container = containerRef.current
    if (!container) {
      return
    }
    // remove all previously existing canvas to avoid duplicating when changing image
    const canvases = container.querySelectorAll<HTMLCanvasElement>('[id^="drawing-canvas-"]')
    canvases.forEach((canvas) => {
      canvas.remove()
    })

    start()
    // load image
    const blob = new Blob([state.imgBuf])
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      imageCanvas.width = img.naturalWidth
      imageCanvas.height = img.naturalHeight
      imageCtx.drawImage(img, 0, 0)
      dispatch({
        type: StoreActionType.UpdateState,
        payload: { key: "imgCtx", value: imageCtx }
      })
      areaRef.current = new Uint8Array(img.naturalWidth * img.naturalHeight)
      areaRef.current.fill(1)
      const area = getAreaData(imageCtx, areaRef.current)
      dispatch({
        type: StoreActionType.UpdateState,
        payload: { key: "originalAreaData", value: area }
      })
      stop()
    }
    img.onerror = () => {
      stop()
      console.error("Failed to load image")
    }
    img.src = url
  }, [state.imgBuf, dispatch, start, stop])

  // To register mouse events to the drawing canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // use timeout to prevent from accessing the activeCanvas before it being created to the DOM
    const timeout = setTimeout(() => {
      const activeCanvas = container.querySelector<HTMLCanvasElement>(
        `#drawing-canvas-${state.selectedLayerIdx}`
      )
      if (!activeCanvas) return

      const drawingCanvasCtx = state.currentLayer?.ctx
      if (!drawingCanvasCtx) {
        console.log("drawingCanvasCtx empty in register")
        return
      }

      const getCanvasCoordinates = (clientX: number, clientY: number) => {
        const rect = activeCanvas.getBoundingClientRect()
        const scaleX = activeCanvas.width / rect.width
        const scaleY = activeCanvas.height / rect.height
        return {
          x: Math.round((clientX - rect.left) * scaleX),
          y: Math.round((clientY - rect.top) * scaleY)
        }
      }

      const handleMouseDown = (e: MouseEvent) => {
        // dont do anything unless there is layer selected
        if (state.selectedLayerIdx < 0) {
          return
        }
        isDrawingRef.current = true
        areaRef.current = new Uint8Array(activeCanvas.width * activeCanvas.height)
        const point = getCanvasCoordinates(e.clientX, e.clientY)
        startPointRef.current = point
        pointsRef.current = [point]
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color
        )
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawingRef.current) return

        const point = getCanvasCoordinates(e.clientX, e.clientY)
        pointsRef.current.push(point)
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color
        )
      }

      const handleMouseUp = () => {
        if (!isDrawingRef.current) return
        areaRef.current = new Uint8Array(activeCanvas.width * activeCanvas.height)
        isDrawingRef.current = false
        if (startPointRef.current) {
          pointsRef.current.push(startPointRef.current)
        }
        drawingCanvasCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height)
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color
        )
        start()
        requestIdleCallback(() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          selectArea(pointsRef.current, activeCanvas)
          dispatch({
            type: StoreActionType.SetPointsToLayer,
            payload: {
              points: pointsRef.current,
              start: startPointRef.current!
            }
          })
          const imageCanvas = imageCanvasRef.current
          const imageCtx = imageCanvas?.getContext("2d")
          if (!imageCtx) return
          const area = getAreaData(imageCtx, areaRef.current!)
          dispatch({
            type: StoreActionType.UpdateLayerSelection,
            payload: {
              layerIdx: state.selectedLayerIdx,
              pselection: {
                area
              },
              withUpdateInitialPresent: true
            }
          })
          dispatch({ type: StoreActionType.GenerateResult })
          stop()
        })
      }

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        const touches = e.changedTouches
        if (touches.length > 0) {
          isDrawingRef.current = true
          areaRef.current = new Uint8Array(activeCanvas.width * activeCanvas.height)
          const point = getCanvasCoordinates(touches[0].clientX, touches[0].clientY)
          startPointRef.current = point
          pointsRef.current = [point]
          setOngoingTouches([touches[0]])
          renderSelection(
            drawingCanvasCtx,
            activeCanvas,
            pointsRef.current,
            startPointRef.current,
            state.currentLayer!.color
          )
        }
      }

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        if (!isDrawingRef.current) return

        const touches = e.changedTouches
        for (let i = 0; i < touches.length; i++) {
          const idx = getOngoingTouchById(touches[i].identifier)
          if (idx >= 0) {
            const point = getCanvasCoordinates(touches[i].clientX, touches[i].clientY)
            pointsRef.current.push(point)
            setOngoingTouches((prev) => {
              const updated = [...prev]
              updated.splice(idx, 1, touches[i])
              return updated
            })
          }
        }
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color
        )
      }

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault()
        if (!isDrawingRef.current) return

        const touches = e.changedTouches
        for (let i = 0; i < touches.length; i++) {
          const idx = getOngoingTouchById(touches[i].identifier)
          if (idx >= 0) {
            setOngoingTouches((prev) => prev.filter((_, j) => j !== idx))
          }
        }

        isDrawingRef.current = false
        if (startPointRef.current) {
          pointsRef.current.push(startPointRef.current)
        }
        selectArea(pointsRef.current, activeCanvas)
        renderSelection(
          drawingCanvasCtx,
          activeCanvas,
          pointsRef.current,
          startPointRef.current,
          state.currentLayer!.color
        )
      }

      const handleTouchCancel = (e: TouchEvent) => {
        e.preventDefault()
        const touches = e.changedTouches
        for (let i = 0; i < touches.length; i++) {
          const idx = getOngoingTouchById(touches[i].identifier)
          if (idx >= 0) {
            setOngoingTouches((prev) => prev.filter((_, j) => j !== idx))
          }
        }
        isDrawingRef.current = false
      }

      activeCanvas.addEventListener("mousedown", handleMouseDown)
      activeCanvas.addEventListener("mousemove", handleMouseMove)
      activeCanvas.addEventListener("mouseup", handleMouseUp)
      activeCanvas.addEventListener("touchstart", handleTouchStart)
      activeCanvas.addEventListener("touchmove", handleTouchMove)
      activeCanvas.addEventListener("touchend", handleTouchEnd)
      activeCanvas.addEventListener("touchcancel", handleTouchCancel)

      return () => {
        activeCanvas.removeEventListener("mousedown", handleMouseDown)
        activeCanvas.removeEventListener("mousemove", handleMouseMove)
        activeCanvas.removeEventListener("mouseup", handleMouseUp)
        activeCanvas.removeEventListener("touchstart", handleTouchStart)
        activeCanvas.removeEventListener("touchmove", handleTouchMove)
        activeCanvas.removeEventListener("touchend", handleTouchEnd)
        activeCanvas.removeEventListener("touchcancel", handleTouchCancel)
      }
    }, 0)

    return () => clearTimeout(timeout)
  }, [
    ongoingTouches,
    state.selectedLayerIdx,
    state.currentLayer,
    dispatch,
    getOngoingTouchById,
    selectArea,
    start,
    stop
  ])

  // Handle selection render on layer index change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeCanvas = container.querySelector<HTMLCanvasElement>(
      `#drawing-canvas-${state.selectedLayerIdx}`
    )

    if (!state.currentLayer?.selection) return
    const { points, start, area } = state.currentLayer.selection

    // when user selects a layer, sync its points into refs
    pointsRef.current = points
    startPointRef.current = start

    // now redraw the overlay only if there is already a drawing canvas element for this layer
    if (activeCanvas && state.currentLayer?.ctx) {
      if (pointsRef.current.length === 0) {
        state.currentLayer.ctx?.clearRect(0, 0, activeCanvas?.width, activeCanvas?.height)
      }

      // mark existing layer area coordinate in areaRef
      areaRef.current = new Uint8Array(activeCanvas.width * activeCanvas.height)
      for (const ap of area) {
        const index = ap.y * activeCanvas.width + ap.x
        areaRef.current[index] = 1
      }

      renderSelection(
        state.currentLayer.ctx,
        activeCanvas,
        pointsRef.current,
        startPointRef.current,
        state.currentLayer.color
      )
    }

    // create drawing canvas on new layer creation
    if (state.selectedLayerIdx >= 0 && !state.currentLayer?.ctx) {
      const container = containerRef.current
      if (!container) return
      const img = imageCanvasRef.current
      const drawingCanvas = document.createElement("canvas")

      // set drawing canvas dimension with the image dimension
      if (img) {
        drawingCanvas.width = img.width
        drawingCanvas.height = img.height
      }

      drawingCanvas.id = `drawing-canvas-${state.selectedLayerIdx}`
      Object.assign(drawingCanvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        cursor: "crosshair"
      })

      container.appendChild(drawingCanvas)
      const ctx = drawingCanvas.getContext("2d")
      // area is set by default to whole image dimension
      dispatch({
        type: StoreActionType.UpdateLayer,
        payload: {
          layerIdx: state.selectedLayerIdx,
          pselection: { ctx }
        }
      })

      const imageCanvas = imageCanvasRef.current
      const imageCtx = imageCanvas?.getContext("2d")
      if (!imageCtx) return
      const area = getAreaData(imageCtx, areaRef.current!)

      dispatch({
        type: StoreActionType.UpdateLayerSelection,
        payload: {
          layerIdx: state.selectedLayerIdx,
          pselection: { area },
          withUpdateInitialPresent: false
        }
      })
    }
  }, [
    state.selectedLayerIdx,
    state.currentLayer,
    state.originalAreaData,
    state.currentLayer?.commands.present,
    dispatch,
    selectArea
  ])

  // Handle layers selection on selected index change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // find all canvases with id starting with "drawing-canvas-"
    const canvases = container.querySelectorAll<HTMLCanvasElement>('[id^="drawing-canvas-"]')

    canvases.forEach((canvas) => {
      // extract the numeric index from the id
      const idx = Number(canvas.id.replace("drawing-canvas-", ""))

      if (idx === state.selectedLayerIdx) {
        canvas.classList.add("active")
        canvas.style.pointerEvents = "auto"
      } else {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        canvas.classList.remove("active")
        canvas.style.pointerEvents = "none"
      }
    })
  }, [state.selectedLayerIdx])

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block", lineHeight: 0 }}
      {...props}
    >
      {loading ? "Loading" : "None"}
      <canvas
        ref={imageCanvasRef}
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto"
        }}
      />
    </div>
  )
}

export default Canvas
