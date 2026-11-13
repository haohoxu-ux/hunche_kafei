import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import sirv from 'sirv'
import { createApi } from './api.mjs'
if(!existsSync('dist/index.html')) throw new Error('请先运行 npm run build')
const api=createApi({env:{...process.env,PRICING_MODE:process.env.PRICING_MODE || 'live'}})
const staticFiles=sirv('dist',{single:true})
const server=createServer((req,res)=>api.middleware(req,res,()=>staticFiles(req,res)))
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',()=>console.log('婚车服务已启动',server.address()))
