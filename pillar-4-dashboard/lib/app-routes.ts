export const APP_ROUTES = [
  { id: "my-work", href: "/my-work", name: "My Work", short: "WORK" },
  { id: "my-shop", href: "/my-shop", name: "My Shop", short: "SHOP" },
  { id: "tesla-optimus-engine", href: "/optimus", name: "Optimus", short: "OPT" },
  { id: "robotaxi-fleet-manager", href: "/robotaxi", name: "Robotaxi", short: "TAXI" },
  { id: "claw-cafe", href: "/claw-cafe", name: "Claw Cafe", short: "CAFE" },
  { id: "my-content-creator", href: "/my-content", name: "Content", short: "MEDIA" },
  { id: "my-capital", href: "/my-capital", name: "Capital", short: "CAP" },
  { id: "claw-forge", href: "/claw-forge", name: "Forge", short: "FORGE" },
] as const;

export type AppRouteId = (typeof APP_ROUTES)[number]["id"];
