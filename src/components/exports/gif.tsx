import { FFmpeg, type FileData } from "@ffmpeg/ffmpeg"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { generateFilename } from "~/utils/etc"
import Button from "../reusables/buttons"
import { FlexGap } from "~/styles/global"
import { Slider } from "../reusables/slider"
import { toBlobURL } from "@ffmpeg/util"

interface GIFOpts {
  framerate: number
  compressionQuality: number
  colorRange: number
}

const initialGIFOpts = {
  framerate: 15,
  compressionQuality: 100,
  colorRange: 80
} as GIFOpts

const ExportGIF = () => {
  const ffmpegRef = useRef(new FFmpeg())
  const gifsicleRef = useRef<any>(null)
  const isLoadedRef = useRef(false)

  const { state, dispatch } = useStore()
  const { start, stop } = useLoading()

  const [isExporting, setIsExporting] = useState(false)
  const [exportOpts, setExportOpts] = useState<GIFOpts>(initialGIFOpts)

  useEffect(() => {
    if (isLoadedRef.current) return

    start()
    ;(async () => {
      try {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"
        await ffmpegRef.current.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
        })
        console.info("ffmpeg loaded")

        const gifsicleModule = await import("gifsicle-wasm-browser")
        gifsicleRef.current = gifsicleModule.default
        console.info("gifsicle loaded")

        isLoadedRef.current = true
      } catch (error) {
        console.error("Failed to load libraries:", error)
      } finally {
        stop()
      }
    })()
  }, [start, stop])

  const compressGIF = async (gifBlob: Blob): Promise<Blob> => {
    if (!gifsicleRef.current) {
      console.warn("gifsicle not loaded, skipping compression")
      return gifBlob
    }

    try {
      const gifFile = new File([gifBlob], "temp.gif", { type: "image/gif" })
      const commands = [
        `-O1`,
        `--lossy=${exportOpts.compressionQuality * 2}`,
        `--colors=${exportOpts.colorRange}`,
        "temp.gif",
        "-o",
        "/out/compressed.gif",
        "--no-warnings"
      ]

      const result = await gifsicleRef.current.run({
        input: [
          {
            file: gifFile,
            name: "temp.gif"
          }
        ],
        command: [commands.join(" ")]
      })

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
    if (!isLoadedRef.current) {
      console.warn("Libraries not loaded yet")
      return
    }

    start()
    setIsExporting(true)
    if (!state.imgCtx) return

    const ffmpeg = ffmpegRef.current
    if (!ffmpeg.loaded) {
      console.warn("cant export, ffmpeg is not loaded")
      return
    }

    try {
      const frames: Blob[] = []
      const captureFrame = (): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          requestAnimationFrame(() => {
            state.imgCtx?.canvas.toBlob((blob) => {
              if (blob) resolve(blob)
              else reject(new Error("Failed to capture frame"))
            })
          })
        })
      }

      frames.push(await captureFrame())
      dispatch({ type: StoreActionType.ResetImageCanvas })
      for (let i = 0; i < exportOpts.framerate - 1; i++) {
        dispatch({ type: StoreActionType.ResetImageCanvas })
        dispatch({ type: StoreActionType.GenerateResult, payload: { refreshIdx: -1 } })

        try {
          const frame = await captureFrame()
          frames.push(frame)
        } catch (error) {
          console.error(`Error capturing frame ${i + 2}:`, error)
          throw new Error(`Frame capture failed at frame ${i + 2}`)
        }
      }

      console.info(`captured ${frames.length} frames total`)

      if (frames.length !== exportOpts.framerate) {
        throw new Error(`Expected ${exportOpts.framerate} frames but got ${frames.length}`)
      }

      try {
        for (let i = 0; i < frames.length; i++) {
          const arrayBuffer = await frames[i].arrayBuffer()
          const filename = `frame${i.toString().padStart(3, "0")}.png`
          await ffmpeg.writeFile(filename, new Uint8Array(arrayBuffer))
        }
      } catch (error) {
        console.error("FFmpeg writeFile error:", error)
        throw new Error(`FFmpeg write failed: ${error}`)
      }

      try {
        await ffmpeg.exec([
          "-framerate",
          `${exportOpts.framerate}`,
          "-i",
          "frame%03d.png",
          "-vf",
          `split[s0][s1];[s0]palettegen=max_colors=${exportOpts.colorRange}[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
          "output.gif"
        ])
      } catch (error) {
        console.error("FFmpeg exec error:", error)
        throw new Error(`FFmpeg encoding failed: ${error}`)
      }

      let data: FileData
      try {
        data = await ffmpeg.readFile("output.gif")
      } catch (error) {
        console.error("FFmpeg readFile error:", error)
        throw new Error(`FFmpeg read failed: ${error}`)
      }

      let blob = new Blob([data.slice(0)], { type: "image/gif" })
      try {
        blob = await compressGIF(blob)
      } catch (error) {
        console.error("Gifsicle compression error:", error)
        console.warn("continuing with uncompressed GIF...")
      }

      const blobToBuffer = await blob.arrayBuffer()
      const filename = await generateFilename(blobToBuffer)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.gif`
      a.click()
      URL.revokeObjectURL(url)

      try {
        for (let i = 0; i < frames.length; i++) {
          await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`)
        }
        await ffmpeg.deleteFile("output.gif")
      } catch (error) {
        console.warn("cleanup error (non-critical):", error)
      }
    } catch (error) {
      console.error("GIF Export failed:", error)
    } finally {
      setIsExporting(false)
      stop()
    }
  }

  const isButtonDisabled = !isLoadedRef.current || isExporting

  return (
    <FlexGap direction="col">
      <Slider
        label="GIF Frame Rate"
        id="framerate"
        min={5}
        max={30}
        value={exportOpts.framerate}
        onChange={(evt) => setExportOpts((prev) => ({ ...prev, framerate: parseFloat(evt.target.value) }))}
      />

      <Slider
        label="Color Range"
        id="colorRange"
        min={80}
        max={256}
        value={exportOpts.colorRange}
        onChange={(evt) => setExportOpts((prev) => ({ ...prev, colorRange: parseFloat(evt.target.value) }))}
      />

      <Slider
        label="Quality"
        id="compressionQuality"
        min={0}
        max={100}
        value={exportOpts.compressionQuality}
        onChange={(evt) => setExportOpts((prev) => ({ ...prev, compressionQuality: parseFloat(evt.target.value) }))}
      />
      <Button $full onClick={onExportGIF} disabled={isButtonDisabled} variant={isButtonDisabled ? "disabled" : "primary"}>
        {!isLoadedRef.current ? "Loading..." : isExporting ? "Exporting..." : "Export"}
      </Button>
    </FlexGap>
  )
}

export default ExportGIF
