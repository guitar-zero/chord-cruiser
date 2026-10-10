export function miniProgressState(state, action) {
  if (action.type === "visibility") {
    return {
      visible: action.visible,
      dismissed: action.visible ? false : state.dismissed,
    };
  }
  if (action.type === "dismiss") return { ...state, dismissed: true };
  return state;
}
