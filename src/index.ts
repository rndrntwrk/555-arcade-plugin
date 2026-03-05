import { createArcade555Plugin } from "./milaidy/factory.js";

export const arcade555Plugin = createArcade555Plugin();

export default arcade555Plugin;

export { ArcadeControlService } from "./services/ArcadeControlService.js";
export * from "./actions/index.js";
export * from "./milaidy/factory.js";
export * from "./milaidy/runtime.js";
export * from "./milaidy/types.js";
export * from "./types/index.js";
