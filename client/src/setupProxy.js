//CORS 이슈, Proxy설정
const proxy = require('http-proxy-middleware');
module.exports = function(app){
  app.use(
    '/api',
    proxy({
      target: 'http://localhost:5000',
      changeOrigin: true
    })
  )
}