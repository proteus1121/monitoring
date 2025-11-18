export type SimpleModalState<T extends string> = {
  [K in T]: boolean;
};

export type ModalState<T extends string, U> = {
  [K in T]: U | null;
};

export type ModalsList = {};

export type ModalId = keyof ModalsList;
