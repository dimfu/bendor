import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"

const Exports = () => {
  const ffmpegRef = useRef(new FFmpeg())
  const { loading, start, stop } = useLoading()
  const { state, dispatch } = useStore()
  const [loadingFfmpeg, setLoadingFfmpeg] = useState(true)

  useEffect(() => {
    // had to do this on my shit machine or the ram usage will shit itself
    // upon many refreshes
    if (import.meta.env.DEV) {
      console.warn("in development mode, ffmpeg is turned off")
      setLoadingFfmpeg(false)
      return
    }
    ;(async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
      console.log("loading ffmpeg...")
      await ffmpegRef.current.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
      })
      setLoadingFfmpeg(false)
      console.log("ffmpeg loaded")
    })()
  }, [])

  if (!state.imgCtx) return <div></div>

  const onExportImage = () => {
    if (!state.imgCtx) return
    let dt = state.imgCtx.canvas.toDataURL()
    dt = dt.replace(/^data:image\/[^;]*/, "data:application/octet-stream")
    dt = dt.replace(
      /^data:application\/octet-stream/,
      "data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=result.png"
    )
    window.open(dt, "_blank")
  }

  const onExportGIF = async () => {
    start()
    if (!state.imgCtx) return

    const ffmpeg = ffmpegRef.current
    if (!ffmpeg.loaded) {
      await ffmpeg.load()
    }

    const frames: Blob[] = []
    const captureFrame = (): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        state.imgCtx?.canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Failed to capture frame"))
        })
      })
    }

    // push the current image canvas result into the frames
    frames.push(await captureFrame())
    dispatch({ type: StoreActionType.ResetImageCanvas })
    // and iterate from there
    for (let i = 0; i < 11; i++) {
      dispatch({ type: StoreActionType.GenerateResult, payload: { refresh: true } })
      frames.push(await captureFrame())
      dispatch({ type: StoreActionType.ResetImageCanvas })
    }

    for (let i = 0; i < frames.length; i++) {
      const arrayBuffer = await frames[i].arrayBuffer()
      await ffmpeg.writeFile(
        `frame${i.toString().padStart(3, "0")}.png`,
        new Uint8Array(arrayBuffer)
      )
    }

    await ffmpeg.exec([
      "-framerate",
      "10",
      "-i",
      "frame%03d.png",
      "-vf",
      "scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5",
      "output.gif"
    ])

    const data = await ffmpeg.readFile("output.gif")

    const blob = new Blob([data.slice(0)], { type: "image/gif" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "output.gif"
    a.click()
    URL.revokeObjectURL(url)

    stop()

    // cleanups
    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`)
    }
    await ffmpeg.deleteFile("output.gif")
  }

  return (
    <div>
      <button disabled={loadingFfmpeg || loading} onClick={onExportImage}>
        Export as image
      </button>
      <button disabled={loadingFfmpeg || loading} onClick={onExportGIF}>
        Export as GIF
      </button>
    </div>
  )
}

export default Exports
