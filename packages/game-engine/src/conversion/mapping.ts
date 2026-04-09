import type { AdvantageMappingConfig } from "@unfair-board/shared-types";

export const DEFAULT_ADVANTAGE_MAPPING: AdvantageMappingConfig = {
  version: "v1-default",
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
  chessToLudo: {
    slight: { primarySteps: 0, secondarySteps: 0 },
    clear: { primarySteps: 1, secondarySteps: 0 },
    dominating: { primarySteps: 3, secondarySteps: 1 },
    almost_winning: { primarySteps: 6, secondarySteps: 6 }
  },
  chessToSnakeLadder: {
    slight: { startPosition: 1 },
    clear: { startPosition: 10 },
    dominating: { startPosition: 20 },
    almost_winning: { startPosition: 45 }
  }
};
