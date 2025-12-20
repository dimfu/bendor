import { fileTypeFromBuffer } from "file-type"
import { Fragment, useRef } from "react"
import styled from "styled-components"
import Canvas from "./components/canvas"
import Exports from "./components/exports"
import GlobalConfiguration from "./components/globalConfigurations"
import LayerList from "./components/layerList"
import LayerSettings from "./components/layerSettings"
import Button from "./components/reusables/buttons"
import { H1, Link, Paragraph } from "./components/reusables/typography"
import { useStore } from "./hooks/useStore"
import { LoadingProvider } from "./providers/loading/loadingProvider"
import { StoreActionType } from "./providers/store/reducer"
import { PushTop } from "./styles/global"

function App() {
  const { state, dispatch } = useStore()
  const imageRef = useRef<HTMLInputElement>(null)

  const onImageChange = async () => {
    dispatch({ type: StoreActionType.ClearLayers })
    const files = imageRef.current?.files
    if (!files || files?.length === 0) {
      return
    }
    const file = files[0]
    const arrayBuf = await file.arrayBuffer()
    const blob = new Uint8Array(arrayBuf)
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target && event.target.result instanceof ArrayBuffer) {
        dispatch({
          type: StoreActionType.UpdateState,
          payload: { key: "imgBuf", value: event.target.result }
        })
      }
    }
    const ftresult = await fileTypeFromBuffer(blob)
    if (!ftresult) return
    dispatch({
      type: StoreActionType.UpdateState,
      payload: { key: "ftype", value: ftresult }
    })
    reader.readAsArrayBuffer(file)
  }

  const onClickInputButton = () => {
    imageRef.current?.click()
  }

  const hasImage = () => {
    return state.imgBuf.byteLength > 0
  }

  const hasActiveLayer = () => {
    return hasImage() && state.selectedLayerIdx !== -1
  }

  return (
    <LoadingProvider>
      <Layout columns={hasActiveLayer() ? 2 : 1}>
        <LeftColumn>
          <LogoContainer>
            <H1>bendor</H1>
            <Paragraph variant="secondary">
              Built as an open source project. Any contributions are welcome on{" "}
              <Link href="https://github.com/acrobatstick/bendor" target="_blank">
                GitHub.
              </Link>
            </Paragraph>
          </LogoContainer>
          <ImageInput onChange={onImageChange} ref={imageRef} name="image" type="file" accept="image/*" />
          {hasImage() && (
            <Fragment>
              <LayerList />
              <GlobalConfiguration />
              <Exports />
            </Fragment>
          )}
          <PushTop>
            <div style={{ padding: "24px" }}>
              <Button $full variant={hasImage() ? "outline" : "primary"} onClick={onClickInputButton} type="button">
                {hasImage() ? "Change Image" : "Upload Image"}
              </Button>
            </div>
          </PushTop>
        </LeftColumn>
        {hasActiveLayer() && (
          <LeftColumn>
            <LayerSettings />
          </LeftColumn>
        )}
        <RightColumn>
          <Canvas />
        </RightColumn>
      </Layout>
    </LoadingProvider>
  )
}

const Layout = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: ${({ columns = 1 }) => (columns === 2 ? "330px 250px 1fr" : "330px 1fr")};
  min-height: 100vh;
  width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
  
  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`

const LeftColumn = styled.div`
  top: 0;
  left: 0;
  position: sticky;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-right: solid black 1px;
  border-right-style: dashed;
  box-sizing: border-box;

  height: 100vh;
  max-height: 100vh;

  @media (max-width: 1280px) {
    height: auto;
    max-width: auto;
    position: relative;
    height: auto;
    max-height: fit-content;
  }
`

const LogoContainer = styled.div`
  border-bottom: solid black 1px;
  border-bottom-style: dashed;
  padding: 24px;
`

const ImageInput = styled.input`
  display: none;
`

const RightColumn = styled.div`
  padding: 16px;
`

export default App
