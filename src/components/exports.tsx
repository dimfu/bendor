import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { ExportImage } from "./exports/image"
import { ExportGIF } from "./exports/gif"

const EXPORT_TYPES = ["Image", "GIF"] as const

const Exports = () => {
  const ffmpegRef = useRef(new FFmpeg())
  const { loading, start, stop } = useLoading()
  const { state } = useStore()
  const [exportType, setExportType] = useState<(typeof EXPORT_TYPES)[number]>("Image")

  useEffect(() => {
    start()
    ;(async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
      await ffmpegRef.current.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
      })
      stop()
      console.info("ffmpeg loaded")
    })()
  }, [start, stop])

  if (!state.imgCtx) return <div></div>

  return (
    <div>
      <p>Export options</p>
      <select
        onChange={(e) => setExportType(e.currentTarget.value as typeof exportType)}
        value={exportType}
        disabled={loading}
      >
        {EXPORT_TYPES.map((t, idx) => (
          <option key={idx} value={t}>
            {t}
          </option>
        ))}
      </select>
      {exportType === "Image" ? <ExportImage /> : <ExportGIF ffmpegRef={ffmpegRef} />}
    </div>
  )
}

export default Exports
