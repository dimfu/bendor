import { lazy, Suspense, useState } from "react"
import styled from "styled-components"
import { useStore } from "~/hooks/useStore"
import { FlexEnd } from "~/styles/global"
import { ExportImage } from "./exports/image"
import { H5, Text } from "./reusables/typography"

const EXPORT_TYPES = ["Image", "GIF"] as const

const ExportGIF = lazy(() => import("~/components/exports/gif"))

const Exports = () => {
  const { state } = useStore()
  const [exportType, setExportType] = useState<(typeof EXPORT_TYPES)[number]>("Image")

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
      <Suspense fallback={"Loading..."}>{exportType === "Image" ? <ExportImage /> : <ExportGIF />}</Suspense>
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
