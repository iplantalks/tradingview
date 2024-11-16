const express = require('express')
const cors = require('cors')
const WebSocket = require('ws')

const cache = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [key, { expires }] of cache) {
    if (expires < now) {
      cache.delete(key)
    }
  }
}, 60000)

const app = express()
app.use(cors())

app.get('/', (req, res) => {
  return res.send('Nothing here')
})

app.get('/data', (req, res) => {
  const ticker = req.query.ticker
  const interval = req.query.interval || '1D'
  const limit = req.query.limit || '300'
  const ttl = parseInt(req.query.ttl || '0')
  if (!ticker) {
    return res.status(400).json({ error: 'ticker is required' })
  }
  const promise = ttl ? tradingviewWithCache(ticker, interval, limit, ttl) : tradingview(ticker, interval, limit)

  promise
    .then(data => {
      if (ttl) {
        res.setHeader('Cache-Control', 'public, max-age=' + Math.round(ttl / 1000))
      }
      return res.status(200).json(data)
    })
    .catch(error => {
      return res.status(500).json({ error })
    })
})

app.listen(3000, () => console.log('open http://localhost:3000'))

function tradingview(ticker, interval = '1D', limit = '300') {
  const options = { ticker, interval, limit }
  console.log('tradingview', options)
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {
      origin: 'https://www.tradingview-widget.com',
    })
    const send = str => {
      console.log('send', str)
      socket.send('~m~' + str.length + '~m~' + str)
    }
    let connected = false
    socket.onmessage = event => {
      event.data.split(/~m~\d+~m~/gi).forEach(data => {
        if (!data) {
          return
        }
        if (data.includes('timescale_update')) {
          data = JSON.parse(data)
          data = data.p[1].sds_1.s.map(({ v }) => v)
          // O: 207.37 H: 220.20 L: 206.90 C: 213.07 V: 198.134M
          data = data.map(([date, open, high, low, close, volume]) => ({ date: new Date(date * 1000).toISOString() /*.split('T').shift()*/, open, high, low, close, volume }))
          // console.table(data)
          socket.close()
          console.log('done', options)
          resolve(data)
        } else if (data.includes('protocol_error')) {
          socket.close()
          console.log('failed', options)
          reject(JSON.parse(data).p[0])
        } else if (data.includes('critical_error')) {
          socket.close()
          console.log('failed', options)
          reject(JSON.parse(data).p[2])
        } else if (data.includes('symbol_error')) {
          socket.close()
          console.log('failed', options)
          reject(JSON.parse(data).p[2])
        } else if (data.startsWith('~h~')) {
          // something went wrong, we are in hanging connection that starts to send heartbeats
          socket.close()
        } else {
          console.log('recv', data)
        }
      })

      if (!connected && event && event.data && event.data.includes('session_id')) {
        const cs = 'cs_' + crypto.randomUUID().replaceAll('-', '').substring(0, 12)
        // console.log(event.data)
        // send('{"m":"set_auth_token","p":["widget_user_token"]}')
        send('{"m":"set_auth_token","p":["unauthorized_user_token"]}')
        send('{"m":"chart_create_session","p":["' + cs + '","disable_statistics"]}')
        // send('{"m":"resolve_symbol","p":["' + cs + '","sds_sym_1","' + ticker + '"]}')
        send('{"m":"resolve_symbol","p":["' + cs + '","sds_sym_1","={\\"symbol\\":\\"' + ticker + '\\"}"]}')
        send('{"m":"create_series","p":["' + cs + '","sds_1","s1","sds_sym_1","' + interval + '",' + limit + ']}') // ,"LASTSESSION"
        connected = true
      }
    }
  })
}

function tradingviewWithCache(ticker, interval = '1D', limit = '300', ttl = 0) {
  const key = JSON.stringify({ ticker, interval, limit })
  if (ttl) {
    const data = cache.get(key)
    if (data) {
      if (data.expires > Date.now()) {
        console.log('cache hit', { ticker, interval, limit })
        return Promise.resolve(data.value)
      } else {
        cache.delete(key)
      }
    }
  }
  return tradingview(ticker, interval, limit).then(data => {
    if (ttl) {
      cache.set(key, { value: data, expires: Date.now() + ttl })
    }
    return data
  })
}
