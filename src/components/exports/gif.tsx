import type { FFmpeg } from "@ffmpeg/ffmpeg"
import { useState, type RefObject } from "react"
import gifsicle from "gifsicle-wasm-browser"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { generateFilename } from "~/utils/etc"

interface IExportGIF {
  ffmpegRef: RefObject<FFmpeg>
}

interface RangeInputProps {
  label: string
  id: string
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  step?: number
}
const RangeInput = ({ label, id, min, max, value, onChange, step = 1 }: RangeInputProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(min, Math.min(Number(event.target.value), max))
    onChange(newValue)
  }

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        type="number"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
      <input type="range"
        id={`${id}Slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}

interface GIFOpts {
  framerate: number
  compressionQuality: number
  colorRange: number
}

const initialGIFOpts = {
  framerate: 15,
  compressionQuality: 0,
  colorRange: 80,
} as GIFOpts

export const ExportGIF = ({ ffmpegRef }: IExportGIF) => {
  const { state, dispatch } = useStore()
  const { start, stop } = useLoading()

  const [exportOpts, setExportOpts] = useState<GIFOpts>(initialGIFOpts)

  const compressGIF = async (gifBlob: Blob): Promise<Blob> => {
    try {
      const gifFile = new File([gifBlob], "temp.gif", { type: "image/gif" })
      const commands = [
        `-O1`,
        `--lossy=${exportOpts.compressionQuality * 2}`,
        `--colors=${exportOpts.colorRange}`,
        "temp.gif",
        "-o",
        "/out/compressed.gif",
        '--no-warnings'
      ]

      // had to do this or else it'll spit junk in the console since the author of
      // the library didnt remove the console.log entires in the run() function
      const originalLog = console.log
      const originalWarn = console.warn
      if (import.meta.env.MODE === "production") {
        console.log = () => { }
        console.warn = () => { }
      }

      const result = await gifsicle.run({
        input: [{
          file: gifFile,
          name: "temp.gif"
        }],
        command: [commands.join(" ")]
      })

      console.log = originalLog
      console.warn = originalWarn

      if (result && result.length > 0) {
        return result[0]
      }

      return gifBlob
    } catch (error) {
      console.error("GIF compression failed:", error)
      return gifBlob
    }
  }

  const onExportGIF = async () => {
    start()
    if (!state.imgCtx) return

    const ffmpeg = ffmpegRef.current
    if (!ffmpeg.loaded) {
      console.warn("cant export, ffmpeg is not loaded")
      return
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
      `${exportOpts.framerate}`,
      "-i",
      "frame%03d.png",
      "-vf",
      `split[s0][s1];[s0]palettegen=max_colors=${exportOpts.colorRange}[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
      "output.gif"
    ])

    const data = await ffmpeg.readFile("output.gif")
    let blob = new Blob([data.slice(0)], { type: "image/gif" })
    blob = await compressGIF(blob)

    const blobToBuffer = await blob.arrayBuffer()
    const filename = await generateFilename(blobToBuffer)

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

  return (
    <div>
      <RangeInput
        label="GIF Frame Rate"
        id="framerate"
        min={5}
        max={30}
        value={exportOpts.framerate}
        onChange={(value) => setExportOpts((prev) => ({ ...prev, framerate: value }))}
      />

      <RangeInput
        label="Color Range"
        id="colorRange"
        min={80}
        max={256}
        value={exportOpts.colorRange}
        onChange={(value) => setExportOpts((prev) => ({ ...prev, colorRange: value }))}
      />

      <RangeInput
        label="Compression Quality"
        id="compressionQuality"
        min={0}
        max={100}
        value={exportOpts.compressionQuality}
        onChange={(value) => setExportOpts((prev) => ({ ...prev, compressionQuality: value }))}
      />
      <button onClick={onExportGIF}>Export</button>
    </div>
  )
}
