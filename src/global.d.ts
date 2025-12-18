import "styled-components"

declare module "gifsicle-wasm-browser" {
  interface GifsicleInputFile {
    file: File | Blob
    name: string
  }

  interface GifsicleOptions {
    input: GifsicleInputFile[]
    command: string[]
  }

  interface Gifsicle {
    run(options: GifsicleOptions): Promise<Blob[]>
  }

  const gifsicle: Gifsicle
  export default gifsicle
}

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      primaryText: "#0001f6"
      secondaryText: "#2d2d2d"
      primary: "#0001f6"
      warning: "#d71f1fff"
      disabled: "#cccccc"
      white: "#ffffff"
    }
    paddings: {
      container: "15px"
      pageTop: "30px"
    }
  }
}
