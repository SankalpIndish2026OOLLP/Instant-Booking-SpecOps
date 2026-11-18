import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Runs before every other preload so React Testing Library finds `document` when it loads.
GlobalRegistrator.register();
