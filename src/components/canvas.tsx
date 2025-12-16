import { useCallback, useEffect, useRef, useState } from "react"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { useLoading } from "~/hooks/useLoading"
import { cursorInBoundingBox, getAreaData, getMouseCanvasCoordinates } from "~/utils/image"
import DrawManager from "~/utils/drawManager"

function Canvas(props: React.HTMLAttributes<HTMLDivElement>) {
  const { start, stop } = useLoading()
  const { state, dispatch } = useStore()

  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawManagerRef = useRef<DrawManager>(new DrawManager())
  const [ongoingTouches, setOngoingTouches] = useState<Touch[]>([])
  const [selectionMovable, setSelectionMovable] = useState<boolean>(false)

  const getOngoingTouchById = useCallback((id: number) => ongoingTouches.findIndex((t) => t.identifier === id), [ongoingTouches])

  useEffect(() => {
    if (state.imgBuf.byteLength === 0 || !imageCanvasRef.current) return
    const imageCanvas = imageCanvasRef.current
    const imageCtx = imageCanvas?.getContext("2d", { willReadFrequently: true })
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
      const wholeImageArea = new Uint8Array(img.naturalWidth * img.naturalHeight)
      wholeImageArea.fill(1)

      // set the canvas dimension the same as the image canvas
      drawManagerRef.current.cwidth = img.naturalWidth
      drawManagerRef.current.cheight = img.naturalHeight

      const area = getAreaData(imageCtx, wholeImageArea)
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

    const activeCanvas = container.querySelector<HTMLCanvasElement>(`#drawing-canvas-${state.selectedLayerIdx}`)
    if (!activeCanvas) return

    const drawingCanvasCtx = state.currentLayer?.ctx
    if (!drawingCanvasCtx) {
      console.log("drawingCanvasCtx empty in register")
      return
    }

    const onMouseDown = (e: MouseEvent) => {
      const point = getMouseCanvasCoordinates(activeCanvas, e.clientX, e.clientY)
      drawManagerRef.current.reset()
      drawManagerRef.current.begin(point)
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
    }

    const onMouseMove = (e: MouseEvent) => {
      const point = getMouseCanvasCoordinates(activeCanvas, e.clientX, e.clientY)
      drawManagerRef.current.update(point)
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
    }

    const onMouseUp = () => {
      drawManagerRef.current.finish()
      drawingCanvasCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height)
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
      start()
      requestIdleCallback(() => {
        dispatch({ type: StoreActionType.ResetImageCanvas })
        drawManagerRef.current.getSelectArea()
        const { points, startPoint, selectionArea } = drawManagerRef.current
        dispatch({
          type: StoreActionType.SetPointsToLayer,
          payload: {
            points: points,
            start: startPoint!
          }
        })
        const imageCanvas = imageCanvasRef.current
        const imageCtx = imageCanvas?.getContext("2d")
        if (!imageCtx) return
        if (drawManagerRef.current.points.length > 1) {
          const area = getAreaData(imageCtx, selectionArea!)
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
        } else {
          dispatch({
            type: StoreActionType.UpdateLayerSelection,
            payload: {
              layerIdx: state.selectedLayerIdx,
              pselection: {
                area: state.originalAreaData
              },
              withUpdateInitialPresent: true
            }
          })
        }
        const [, , minX, minY] = drawManagerRef.current.getPointsBoundingBox()
        drawManagerRef.current.mouseStartPos = { x: minX, y: minY }
        dispatch({ type: StoreActionType.GenerateResult })
        stop()
      })
    }

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touches = e.changedTouches
      if (touches.length > 0) {
        const point = getMouseCanvasCoordinates(activeCanvas, touches[0].clientX, touches[0].clientY)
        drawManagerRef.current.reset()
        drawManagerRef.current.begin(point)
        setOngoingTouches([touches[0]])
        drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const touches = e.changedTouches
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier)
        if (idx >= 0) {
          const point = getMouseCanvasCoordinates(activeCanvas, touches[i].clientX, touches[i].clientY)
          drawManagerRef.current.update(point)
          setOngoingTouches((prev) => {
            const updated = [...prev]
            updated.splice(idx, 1, touches[i])
            return updated
          })
        }
      }
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      drawManagerRef.current.finish()
      const touches = e.changedTouches
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier)
        if (idx >= 0) {
          setOngoingTouches((prev) => prev.filter((_, j) => j !== idx))
        }
      }
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
      start()
      requestIdleCallback(() => {
        dispatch({ type: StoreActionType.ResetImageCanvas })
        drawManagerRef.current.getSelectArea()
        const { points, startPoint, selectionArea } = drawManagerRef.current
        dispatch({
          type: StoreActionType.SetPointsToLayer,
          payload: {
            points,
            start: startPoint!
          }
        })
        const imageCanvas = imageCanvasRef.current
        const imageCtx = imageCanvas?.getContext("2d")
        if (!imageCtx) return
        const area = getAreaData(imageCtx, selectionArea!)
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
        const [, , minX, minY] = drawManagerRef.current.getPointsBoundingBox()
        drawManagerRef.current.mouseStartPos = { x: minX, y: minY }
        dispatch({ type: StoreActionType.GenerateResult })
        stop()
      })
    }

    const onTouchCancel = (e: TouchEvent) => {
      e.preventDefault()
      const touches = e.changedTouches
      for (let i = 0; i < touches.length; i++) {
        const idx = getOngoingTouchById(touches[i].identifier)
        if (idx >= 0) {
          setOngoingTouches((prev) => prev.filter((_, j) => j !== idx))
        }
      }
      drawManagerRef.current.finish()
    }

    const onMouseOut = () => {
      if (!drawManagerRef.current.isDrawing) return
      document.addEventListener("mousemove", handleMouseMoveOutside)
      document.addEventListener("mouseup", handleMouseUpOutside)
    }

    // to handle layer selection when cursor is out of the canvas offset
    const handleMouseMoveOutside = (e: MouseEvent) => {
      if (!drawManagerRef.current.isDrawing) return
      // get the rough coordinate first and clamp later
      let point = getMouseCanvasCoordinates(activeCanvas, e.clientX, e.clientY)

      // clamp point coordinate so that we only select points that are
      // within the canvas boundaries
      const canvasWidth = activeCanvas.width
      const canvasHeight = activeCanvas.height
      point = {
        // limit to only selecting within the canvas height and width
        x: Math.max(0, Math.min(canvasWidth, point.x)),
        y: Math.max(0, Math.min(canvasHeight, point.y))
      }

      drawManagerRef.current.points.push(point)
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
    }

    // same as the in element mouse up event handler
    const handleMouseUpOutside = () => {
      document.removeEventListener("mousemove", handleMouseMoveOutside)
      document.removeEventListener("mouseup", handleMouseUpOutside)

      drawManagerRef.current.finish()
      drawingCanvasCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height)
      drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)

      start()
      requestIdleCallback(() => {
        dispatch({ type: StoreActionType.ResetImageCanvas })
        drawManagerRef.current.getSelectArea()
        const { points, startPoint, selectionArea } = drawManagerRef.current
        dispatch({
          type: StoreActionType.SetPointsToLayer,
          payload: {
            points,
            start: startPoint!
          }
        })
        const imageCanvas = imageCanvasRef.current
        const imageCtx = imageCanvas?.getContext("2d")
        if (!imageCtx) return
        const area = getAreaData(imageCtx, selectionArea!)
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

    const ctrl = new AbortController()
    if (state.mode === "edit") {
      activeCanvas.addEventListener("mousedown", onMouseDown, ctrl)
      activeCanvas.addEventListener("mousemove", onMouseMove, ctrl)
      activeCanvas.addEventListener("mouseup", onMouseUp, ctrl)
      activeCanvas.addEventListener("touchstart", onTouchStart, ctrl)
      activeCanvas.addEventListener("touchmove", onTouchMove, ctrl)
      activeCanvas.addEventListener("touchend", onTouchEnd, ctrl)
      activeCanvas.addEventListener("touchcancel", onTouchCancel, ctrl)
      activeCanvas.addEventListener("mouseout", onMouseOut, ctrl)
    }

    return () => {
      ctrl.abort()
    }
  }, [ongoingTouches, state.selectedLayerIdx, state.currentLayer, state.mode, dispatch, getOngoingTouchById, start, stop, state.originalAreaData])

  // Handle selection render on layer index change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeCanvas = container.querySelector<HTMLCanvasElement>(`#drawing-canvas-${state.selectedLayerIdx}`)

    if (!state.currentLayer?.selection) return
    const { points, start, area } = state.currentLayer.selection

    // when user selects a layer, sync its points into refs
    drawManagerRef.current.reset()
    drawManagerRef.current.loadSelection(points, start)

    // now redraw the overlay only if there is already a drawing canvas element for this layer
    if (activeCanvas && state.currentLayer?.ctx) {
      if (points.length === 0) {
        state.currentLayer.ctx?.clearRect(0, 0, activeCanvas?.width, activeCanvas?.height)
      }
      // mark existing layer area coordinate in areaRef
      drawManagerRef.current.fillSelectionArea(area)
      drawManagerRef.current.renderSelection(state.currentLayer.ctx, activeCanvas, state.currentLayer!.color)
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
      const imageCtx = imageCanvas?.getContext("2d", { willReadFrequently: true })
      if (!imageCtx) return
      const emptySelection = new Uint8Array()
      const area = getAreaData(imageCtx, emptySelection)

      dispatch({
        type: StoreActionType.UpdateLayerSelection,
        payload: {
          layerIdx: state.selectedLayerIdx,
          pselection: { area },
          withUpdateInitialPresent: false
        }
      })
    }
  }, [state.selectedLayerIdx, state.currentLayer, state.originalAreaData, state.currentLayer?.commands.present, dispatch])

  // to handle drawing movement
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const activeCanvas = container.querySelector<HTMLCanvasElement>(`#drawing-canvas-${state.selectedLayerIdx}`)
    if (!activeCanvas) return
    if (!state.currentLayer?.selection) return

    if (state.mode === "move") {
      const drawingCanvasCtx = state.currentLayer?.ctx
      if (!drawingCanvasCtx) {
        return
      }

      const ctx = activeCanvas?.getContext("2d")
      if (!ctx) {
        return
      }

      const renderBoundingBox = () => {
        drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
        const [width, height, minX, minY] = drawManagerRef.current.getPointsBoundingBox()
        ctx.fillStyle = state.currentLayer!.color
        ctx.fillRect(minX, minY, width, height)
      }

      renderBoundingBox()

      // to determine if the cursor is inside the drawing bounding box or not
      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault()
        const { x: mouseX, y: mouseY } = getMouseCanvasCoordinates(activeCanvas, e.clientX, e.clientY)
        const [width, height, minX, minY] = drawManagerRef.current.getPointsBoundingBox()
        const isInBound = cursorInBoundingBox({
          drawing: {
            width,
            height,
            minX,
            minY
          },
          mouse: {
            x: mouseX,
            y: mouseY
          }
        })
        if (!isInBound) return
        // if so we can start moving the drawing
        setSelectionMovable(true)
        drawManagerRef.current.mouseStartPos = { x: mouseX, y: mouseY }
      }

      const onMouseUp = (e: MouseEvent) => {
        if (!selectionMovable) return
        e.preventDefault()
        setSelectionMovable(false)
        start()
        requestIdleCallback(() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          drawManagerRef.current.getSelectArea()
          const { points, startPoint, selectionArea } = drawManagerRef.current
          dispatch({
            type: StoreActionType.SetPointsToLayer,
            payload: {
              points: points,
              start: startPoint!
            }
          })
          const imageCanvas = imageCanvasRef.current
          const imageCtx = imageCanvas?.getContext("2d", { willReadFrequently: true })
          if (!imageCtx) return
          const area = getAreaData(imageCtx, selectionArea!)
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
          renderBoundingBox()
          dispatch({ type: StoreActionType.GenerateResult })
          stop()
        })
      }

      const onMouseMove = (e: MouseEvent) => {
        const { x: mouseX, y: mouseY } = getMouseCanvasCoordinates(activeCanvas, e.clientX, e.clientY)
        const mousestart = drawManagerRef.current.mouseStartPos
        if (!mousestart || !selectionMovable) {
          return
        }
        const dx = mouseX - mousestart.x
        const dy = mouseY - mousestart.y
        drawManagerRef.current.moveSelection(dx, dy)
        drawManagerRef.current.mouseStartPos = { x: mouseX, y: mouseY }
        drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
      }

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        const touches = e.changedTouches
        if (touches.length > 0) {
          const { x: mouseX, y: mouseY } = getMouseCanvasCoordinates(activeCanvas, touches[0].clientX, touches[0].clientY)
          const [width, height, minX, minY] = drawManagerRef.current.getPointsBoundingBox()
          const isInBound = cursorInBoundingBox({
            drawing: {
              width,
              height,
              minX,
              minY
            },
            mouse: {
              x: mouseX,
              y: mouseY
            }
          })
          if (!isInBound) return
          // if so we can start moving the drawing
          setSelectionMovable(true)
          drawManagerRef.current.mouseStartPos = { x: mouseX, y: mouseY }
        }
      }

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        const touches = e.changedTouches
        if (touches.length === 0) return
        const { x: mouseX, y: mouseY } = getMouseCanvasCoordinates(activeCanvas, touches[0].clientX, touches[0].clientY)
        const mousestart = drawManagerRef.current.mouseStartPos
        if (!mousestart || !selectionMovable) {
          return
        }
        const dx = mouseX - mousestart.x
        const dy = mouseY - mousestart.y
        drawManagerRef.current.moveSelection(dx, dy)
        drawManagerRef.current.mouseStartPos = { x: mouseX, y: mouseY }
        drawManagerRef.current.renderSelection(drawingCanvasCtx, activeCanvas, state.currentLayer!.color)
      }

      const onTouchEnd = (e: TouchEvent) => {
        if (!selectionMovable) return
        e.preventDefault()
        setSelectionMovable(false)
        start()
        requestIdleCallback(() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          drawManagerRef.current.getSelectArea()
          const { points, startPoint, selectionArea } = drawManagerRef.current
          dispatch({
            type: StoreActionType.SetPointsToLayer,
            payload: {
              points: points,
              start: startPoint!
            }
          })
          const imageCanvas = imageCanvasRef.current
          const imageCtx = imageCanvas?.getContext("2d", { willReadFrequently: true })
          if (!imageCtx) return
          const area = getAreaData(imageCtx, selectionArea!)
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
          renderBoundingBox()
          dispatch({ type: StoreActionType.GenerateResult })
          stop()
        })
      }

      const ctrl = new AbortController()
      activeCanvas.addEventListener("mousedown", onMouseDown, ctrl)
      activeCanvas.addEventListener("mouseup", onMouseUp, ctrl)
      activeCanvas.addEventListener("mousemove", onMouseMove, ctrl)
      activeCanvas.addEventListener("touchstart", onTouchStart, ctrl)
      activeCanvas.addEventListener("touchmove", onTouchMove, ctrl)
      activeCanvas.addEventListener("touchend", onTouchEnd, ctrl)

      return () => {
        ctrl.abort()
      }
    }
  }, [state.mode, state.currentLayer, state.selectedLayerIdx, selectionMovable, dispatch, start, stop])

  // auto select layer whenever seletedLayerIdx changes
  useEffect(() => {
    dispatch({ type: StoreActionType.SelectLayer, payload: state.selectedLayerIdx })
  }, [state.selectedLayerIdx, dispatch])

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", lineHeight: 0 }} {...props}>
      <canvas
        id="imageCanvas"
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
