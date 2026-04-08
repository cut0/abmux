import type { Infra } from "../infra/index.ts";
import type { Services } from "../services/index.ts";
import { createManagerUsecase, type ManagerUsecase } from "./manager-usecase.ts";

export type UsecaseContext = {
  services: Services;
  infra: Infra;
};

export type Usecases = {
  manager: ManagerUsecase;
};

export const createUsecases = (context: UsecaseContext): Usecases => ({
  manager: createManagerUsecase(context),
});
