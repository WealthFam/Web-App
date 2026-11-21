import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'
import './assets/main.css'
import router from './router'
import { initWebTelemetry } from './services/telemetry'

const app = createApp(App)

app.use(createPinia())
app.use(router)

initWebTelemetry(app, router)

app.mount('#app')
