import Koa from 'koa'
import { middlewares } from 'tarat-server/dist/index.js'
import koaBody from 'koa-body'
import cors from '@koa/cors'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Koa()

app.use(koaBody())
app.use(cors())
app.use(middlewares({
  hooksDirectory: path.join(__dirname, '../hooks/')
}))

app.use(async (ctx) => {
  ctx.body = 'hello'
})
app.listen(9001)
console.log('listen on http://localhost:9001')

export default app