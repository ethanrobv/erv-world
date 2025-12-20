import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    build: {
        rolldownOptions: {
            output: {
                advancedChunks: {
                    groups: [
                        {
                            name: 'vendor-three',
                            test: /node_modules\/(@?react-three|three|@react-three\/postprocessing)/,
                            priority: 10,
                        },
                        {
                            name: 'vendor-react',
                            test: /node_modules\/(react|react-dom|scheduler)/,
                            priority: 5,
                        },
                    ]
                }
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false
            }
        }
    }
})
