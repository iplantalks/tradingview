const WebSocket = require('ws')

const ticker = 'ECONOMICS:USGDPQQ' // 'AAPL', 'NASDAQ:AAPL', 'ECONOMICS:USGDPQQ'
const interval = '1D' // '1' - 1m, '15' - 15m, '1D' - 1d, '1W' - 1w, '3M' - 3m
const limit = 10 // number of candles (max 1500?)

const socket = new WebSocket('wss://widgetdata.tradingview.com/socket.io/websocket', {
  origin: 'https://www.tradingview-widget.com',
})
const send = str => socket.send('~m~' + str.length + '~m~' + str)
let connected = false
socket.onmessage = event => {
  if (!connected) {
    const cs = 'cs_' + crypto.randomUUID().replaceAll('-', '').substring(0, 12)
    const qs = 'qs_' + crypto.randomUUID().replaceAll('-', '').substring(0, 12)
    // console.log(event.data)
    send('{"m":"set_auth_token","p":["unauthorized_user_token"]}')
    // send('{"m":"set_locale","p":["en","US"]}')
    send('{"m":"chart_create_session","p":["' + cs + '","disable_statistics"]}')
    // send('{"m":"quote_create_session","p":["' + qs + '"]}')
    // send('{"m":"quote_add_symbols","p":["' + qs + '","={\\"symbol\\":\\"' + ticker + '\\"}"]}')
    send('{"m":"resolve_symbol","p":["' + cs + '","sds_sym_1","={\\"symbol\\":\\"' + ticker + '\\"}"]}')
    send('{"m":"create_series","p":["' + cs + '","sds_1","s1","sds_sym_1","' + interval + '",' + limit + ']}')
    connected = true
  }

  event.data.split(/~m~\d+~m~/gi).forEach(data => {
    if (data && data.includes('timescale_update')) {
      data = JSON.parse(data)
      data = data.p[1].sds_1.s.map(({ v }) => v)
      // O: 207.37 H: 220.20 L: 206.90 C: 213.07 V: 198.134M
      data = data.map(([date, open, high, low, close, volume]) => ({ date: new Date(date * 1000).toISOString().split('T').shift(), open, high, low, close, volume }))
      console.table(data)
      socket.close()
      // resolve(data)
    } else {
      // console.log(data)
    }
  })
}
