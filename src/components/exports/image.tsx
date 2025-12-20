import imageCompression, { type Options } from "browser-image-compression"
import { useRef } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { FlexGap } from "~/styles/global"
import { generateFilename } from "~/utils/etc"
import Button from "../reusables/buttons"
import { Slider } from "../reusables/slider"

export const ExportImage = () => {
  const { state } = useStore()
  const { start, stop } = useLoading()

  const imageQualitySliderRef = useRef<HTMLInputElement>(null)

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

  return (
    <FlexGap direction="col">
      <Slider id="imageQuality" label="Quality" ref={imageQualitySliderRef} type="range" step={1} min={10} max={100} defaultValue={100} />
      <Button $full type="button" onClick={() => onExportImage(Number(imageQualitySliderRef.current))}>
        Export
      </Button>
    </FlexGap>
  )
}
