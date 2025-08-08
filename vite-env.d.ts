/// <reference types="vite/client" />

declare module "*.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}