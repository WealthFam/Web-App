/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DEMO_MODE?: string
    readonly VITE_API_URL?: string
    readonly VITE_DISABLE_TELEMETRY?: string
    readonly VITE_TELEMETRY_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
