declare module "*.wasm?url" {
    const url: string;
    export default url;
  }
  
  declare module "*.wasm" {
    const url: string;
    export default url;
  }
  
  declare module '*.txt' {
    const content: string;
    export default content;
  }