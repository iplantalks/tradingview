# TradingView

[TradingView](https://tradingview.com) is most awesome platform with any data you may wish to retrieve

But unfortunately the protocol and API is not described

In this repository we are storing our attempt to retrieve some basic historical data for tickers

## How it works

TradingView mini chart widget taken as example

https://www.tradingview.com/widget-docs/widgets/charts/mini-chart/

Whenever you are configuring such widget take a closer look at websocket connection and messages being sent

Example of such widget can be found here [aapl_widget.html](aapl_widget.html)

## Protocol

Technically, it seems like minimal reproducible messages required for widget data to work are:

```json
{"m":"set_auth_token","p":["widget_user_token"]}
{"m":"chart_create_session","p":["cs_XXXXXXXXXXXX","disable_statistics"]}
{"m":"resolve_symbol","p":["cs_XXXXXXXXXXXX","sds_sym_1","AAPL"]}
{"m":"create_series","p":["cs_XXXXXXXXXXXX","sds_1","s1","sds_sym_1","1D",300]}')
```

In response we are waiting an `timescale_update` message, which will contain data for chart candles

Standalone example can be found in [standalone.js](standalone.js), just run `node standlone.js` to see how it works

## Webserver

Our webserver is simple wrapper on top of socket connection, with oversimplified caching layer, so we wont hurt TradingView with many requests

Params are passed as query string, as well as cache TTL in milliseconds

Request examples:

```bash
curl -s 'http://localhost:3000/data?ticker=AAPL&interval=1D&limit=10&ttl=5000' | jq
curl -s 'http://localhost:3000/data?ticker=ECONOMICS:USGDPQQ&interval=3M&limit=10'
```

## Docker

To build image use

```bash
docker buildx build --platform linux/amd64 -t ghcr.io/iplantalks/tradingview:latest .
docker push ghcr.io/iplantalks/tradingview
```

to run it use:

```bash
docker run -it --rm -p 3000:3000 ghcr.io/iplantalks/tradingview
```

## Deployment

Docker image is running on the same server as [sync](https://github.com/iplantalks/sync) checkout its [readme](https://github.com/iplantalks/sync?tab=readme-ov-file#production) for details
