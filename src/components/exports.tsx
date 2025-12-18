import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { useEffect, useRef, useState } from "react"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { ExportImage } from "./exports/image"
import { ExportGIF } from "./exports/gif"
import { H5, Text } from "./reusables/typography"
import styled from "styled-components"
import { FlexEnd } from "~/styles/global"

const EXPORT_TYPES = ["Image", "GIF"] as const

const Exports = () => {
  const ffmpegRef = useRef(new FFmpeg())
  const { start, stop } = useLoading()
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

  const onChangeExportType = (type: (typeof EXPORT_TYPES)[number]) => {
    setExportType(type)
  }

  return (
    <Container>
      <H5 style={{ marginBottom: "12px" }}>Export</H5>
      <FlexEnd style={{ marginBottom: "12px" }}>
        <Text variant="secondary" size="small">
          Output Format
        </Text>
        <ExportOptionsContainer>
          <Text
            style={{ cursor: "pointer" }}
            size="small"
            variant={exportType === "Image" ? "primary" : "secondary"}
            onClick={() => onChangeExportType("Image")}
          >
            Image
          </Text>
          <span>/</span>
          <Text
            style={{ cursor: "pointer" }}
            size="small"
            variant={exportType === "GIF" ? "primary" : "secondary"}
            onClick={() => onChangeExportType("GIF")}
          >
            GIF
          </Text>
        </ExportOptionsContainer>
      </FlexEnd>
      {exportType === "Image" ? <ExportImage /> : <ExportGIF ffmpegRef={ffmpegRef} />}
    </Container>
  )
}

const Container = styled.div`
  padding: 24px;
  border-bottom: solid black 1px;
  border-bottom-style: dashed;
`

const ExportOptionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0 12px;
`

export default Exports
