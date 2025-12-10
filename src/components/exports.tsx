import { FFmpeg } from "@ffmpeg/ffmpeg"
import imageCompression, { type Options } from "browser-image-compression"
import { toBlobURL } from "@ffmpeg/util"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"

const EXPORT_TYPES = ["Image", "GIF"] as const

// randomize filename by using the hash of the canvas blob
const generateFilename = async (buf: ArrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  const hash = hashHex.substring(0, 12)
  return hash
}

const Exports = () => {
  const ffmpegRef = useRef(new FFmpeg())
  const { loading, start, stop } = useLoading()

  const { state, dispatch } = useStore()

  const [exportType, setExportType] = useState<(typeof EXPORT_TYPES)[number]>("Image")
  // TODO: use useState to make updated value visible to the user
  // im kinda lazy to implement the ui side of this thing, not the most important thing yet
  const imageQualitySliderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // had to do this on my shit machine or the ram usage will shit itself
    // upon many refreshes
    if (import.meta.env.DEV) {
      console.warn("in development mode, ffmpeg is turned off")
      return
    }
    start()
      ; (async () => {
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

  const onExportImage = async (quality: number) => {
    if (!state.imgCtx) return

    if (!state.ftype) {
      console.error("uploaded image don't have a FileType")
      return
    }
    const ftype = state.ftype

    start()
    const file = await new Promise<File>((resolve) => {
      state.imgCtx!.canvas.toBlob(
        (blob) => {
          const file = new File([blob!], `out.${ftype.ext}`, { type: ftype.mime })
          resolve(file)
        },
        ftype.mime,
        quality
      )
    })

    // weird hack, but this speeds up the image compression if the user leave the quality to 100%
    if (quality === 100) {
      quality = 0
    }

    const originalSizeMB = file.size / (1024 * 1024)
    const targetSizeMB = (originalSizeMB * quality) / 100

    const opts: Options = {
      maxSizeMB: targetSizeMB / 1024,
      maxWidthOrHeight: undefined,
      useWebWorker: true,
      alwaysKeepResolution: true,
      initialQuality: quality / 100
    }

    const compressedFile = await imageCompression(file, opts)
    const filename = await generateFilename(await compressedFile.arrayBuffer())
    const url = URL.createObjectURL(compressedFile)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.gif`
    a.click()
    URL.revokeObjectURL(url)
    stop()
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
      dispatch({ type: StoreActionType.ResetImageCanvas })
      dispatch({ type: StoreActionType.GenerateResult, payload: { refresh: true } })
      frames.push(await captureFrame())
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

    const filename = await generateFilename(await blob.arrayBuffer())
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.gif`
    a.click()
    URL.revokeObjectURL(url)
    stop()

    // cleanups
    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`)
    }
    await ffmpeg.deleteFile("output.gif")
  }

  const onExport = () => {
    if (exportType === "Image") {
      const ref = imageQualitySliderRef.current
      onExportImage(Number(ref?.value ?? 1.0))
    } else {
      onExportGIF()
    }
  }

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
      {exportType === "Image" ? (
        <div>
          <label>Image Quality</label>
          <input
            ref={imageQualitySliderRef}
            type="range"
            step={1}
            min={10}
            max={100}
            defaultValue={100}
          />
        </div>
      ) : (
        <div></div>
      )}
      <br />
      <button onClick={onExport}>Export</button>
    </div>
  )
}

export default Exports
