export let gs_userlevel: string | null = null;

export const setUserLevel = (userLevel: string): void => {
  gs_userlevel = userLevel;
};

export const getUserLevel = (): string | null => {
  return gs_userlevel;
};
