export type SceneId = "bedroom-rain" | "convenience-store" | "rainy-street" | "night-train" | "office-night";

export type Scene = {
  id: SceneId;
  name: string;
  label: string;
  asset: string;
  position: string;
};

export const scenes: Scene[] = [
  {
    id: "bedroom-rain",
    name: "Rainy bedroom",
    label: "Room",
    asset: "/assets/scene/bedroom-rain.png",
    position: "center"
  },
  {
    id: "convenience-store",
    name: "Late convenience store",
    label: "Store",
    asset: "/assets/scene/convenience-store.png",
    position: "center"
  },
  {
    id: "rainy-street",
    name: "Hill road",
    label: "Street",
    asset: "/assets/scene/rainy-street.png",
    position: "center"
  },
  {
    id: "night-train",
    name: "Night train",
    label: "Train",
    asset: "/assets/scene/night-train.png",
    position: "center"
  },
  {
    id: "office-night",
    name: "After-hours office",
    label: "Office",
    asset: "/assets/scene/office-night.png",
    position: "center"
  }
];

const beatSceneIds: SceneId[] = [
  "bedroom-rain",
  "office-night",
  "convenience-store",
  "night-train",
  "office-night",
  "rainy-street",
  "bedroom-rain"
];

export const setupScene = scenes[0];

export function getScene(id: SceneId) {
  return scenes.find((scene) => scene.id === id) ?? setupScene;
}

export function getSceneForBeatIndex(beatIndex: number) {
  return getScene(beatSceneIds[beatIndex] ?? beatSceneIds[beatSceneIds.length - 1]);
}
