const express = require('express')
const app = express()
const server = require('http').createServer(app)
var io = require('socket.io')(server, { cors: {origin: '*'}})
server.listen(3001, () => {
  console.log('server running'  )
})
io = io.listen(server)

// io.on('connection', (socket) => {
//   console.log('connected')
// })

io.on('connection', function(socket) {

  console.log('Client connected.');

  // Disconnect listener
  socket.on('disconnect', function() {
      console.log('Client disconnected.');
  });
});