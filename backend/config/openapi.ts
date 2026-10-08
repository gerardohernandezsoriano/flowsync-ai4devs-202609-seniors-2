import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      version: 'v1',
    },
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description: 'Access token opaco devuelto por /api/v1/auth/login y /api/v1/auth/signup',
        },
      },
    },
  },
})
