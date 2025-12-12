declare module 'gifsicle-wasm-browser' {
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
